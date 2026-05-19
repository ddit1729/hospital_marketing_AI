import Anthropic from '@anthropic-ai/sdk'
import { readdir, readFile } from 'fs/promises'
import path from 'path'
import { BrandingResult } from '@/types/branding'

const client = new Anthropic()

async function loadLatestBranding(): Promise<BrandingResult> {
  const dir = path.join(process.cwd(), 'data', 'clinics')
  const files = (await readdir(dir)).filter(f => f.endsWith('.json')).sort()
  if (files.length === 0) throw new Error('브랜딩 데이터 없음')
  const raw = await readFile(path.join(dir, files[files.length - 1]), 'utf-8')
  return JSON.parse(raw)
}

async function loadPlanItem(index: number) {
  const dir = path.join(process.cwd(), 'data', 'plans')
  const files = (await readdir(dir)).filter(f => f.endsWith('.json')).sort()
  if (files.length === 0) throw new Error('기획 데이터 없음')
  const raw = await readFile(path.join(dir, files[files.length - 1]), 'utf-8')
  const json = JSON.parse(raw)
  const item = json.plan.find((p: any) => p.index === index)
  if (!item) throw new Error(`index ${index} 없음`)
  return item
}

const MEDICAL_FILTER: Record<string, string> = {
  '완치': '개선',
  '100%': '개인 상태에 따라 다를 수 있습니다',
  '최고': '도움이 될 수 있는',
  '절대': '가능하면',
  '무조건': '대부분의 경우',
  '보장': '기대할 수 있는',
}

function applyFilter(text: string): string {
  let result = text
  for (const [banned, safe] of Object.entries(MEDICAL_FILTER)) {
    result = result.replaceAll(banned, safe)
  }
  return result
}

export async function POST(req: Request): Promise<Response> {
  try {
    const { index } = await req.json()
    const [branding, planItem] = await Promise.all([
      loadLatestBranding(),
      loadPlanItem(Number(index)),
    ])

    const prompt = `
당신은 네이버 블로그 전문 작가입니다.
아래 기획 데이터와 브랜딩 정보를 바탕으로 블로그 글 1개를 작성해주세요.

기획 데이터:
- 글 유형: ${planItem.type}
- 메인 키워드: ${planItem.keyword}
- 제목 후보: ${planItem.title_candidates.join(' / ')}
- 도입부 훅: ${planItem.hook}
- SEO 키워드: ${planItem.seo_keywords.join(', ')}

브랜딩 정보:
- 진료과목: ${branding.clinic_type}
- 지역: ${branding.location}
- 한 줄 정의: ${branding.one_line}
- 타겟 환자: ${branding.target_patient}
- 차별점: ${branding.differentiation}
- 문체 가이드: ${branding.voice_sample}
- 절대 안 하는 것: ${branding.never_do.join(', ')}

작성 조건:
- 제목: 후보 중 하나 선택 또는 더 나은 것으로 수정 (50자 이내)
- 도입부: 훅 문장으로 시작, 환자 공감형
- 분량: 1500자 이상
- 소제목(##) 3~4개 포함
- SEO: 메인 키워드를 제목·첫 문단·소제목에 자연스럽게 배치
- GEO: 핵심 답변을 도입부 직후 2~3문장으로 요약 (AI 인용용)
- FAQ: Q/A 형식 3개 포함
- 마무리: 상담 유도 CTA 1문장
- 해시태그: 10~15개
- 의료광고법 위반 표현 금지 (효과 보장·비교·과장 금지)
- 환자 눈높이 구어체, 전문용어 최소화

반드시 아래 JSON 형식으로만 응답 (마크다운 없이):
{
  "title": "최종 제목",
  "body": "본문 전체 (줄바꿈은 \\n 사용)",
  "meta_description": "검색 결과 노출용 요약 (140자 이내, 키워드 포함)",
  "hashtags": ["해시태그1", "해시태그2"]
}
`

    const msg = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      system: '의료광고법을 준수하는 병원 블로그 전문 작가. 반드시 JSON만 출력.',
      messages: [{ role: 'user', content: prompt }],
    })

    const text = msg.content.find(c => c.type === 'text')?.text ?? '{}'
    const clean = text.replace(/```json|```/g, '').trim()
    const post = JSON.parse(clean)
    post.body = applyFilter(post.body)

    return Response.json({ ok: true, post, planItem })
  } catch (e) {
    console.error('[agent4/generate]', e)
    return Response.json({ ok: false, post: null }, { status: 500 })
  }
}
