import Anthropic from '@anthropic-ai/sdk'
import { readdir, readFile, writeFile, mkdir } from 'fs/promises'
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

export async function POST(): Promise<Response> {
  try {
    const b = await loadLatestBranding()

    const prompt = `
당신은 병원 블로그 콘텐츠 기획 전문가입니다.
아래 병원 브랜딩 데이터를 바탕으로 네이버 블로그 4주 기획서를 만들어주세요.

브랜딩 데이터:
- 진료과목: ${b.clinic_type}
- 지역: ${b.location}
- 병원 한 줄 정의: ${b.one_line}
- 타겟 환자: ${b.target_patient}
- 차별점: ${b.differentiation}
- 절대 안 하는 것: ${b.never_do.join(', ')}
- 콘텐츠 키워드: ${b.keywords.join(', ')}
- 콘텐츠 방향: ${b.content_directions.join(', ')}
- 문체 가이드: ${b.voice_sample}

조건:
- 주 3건 × 4주 = 12건 메인 + 여유 5건 = 총 17건
- 글 유형 비율: 정보형 5건, 케이스형 4건, 스토리형 3건 (메인 기준)
- 지역명(${b.location}) 포함 로컬 키워드 3건 이상 포함
- 계절/시기 맞는 주제 반영
- 의료광고법 위반 표현 금지
- 과장·보장·비교 표현 금지

반드시 아래 JSON 배열 형식으로만 응답 (마크다운 없이):
[
  {
    "index": 1,
    "week": 1,
    "day": "월",
    "type": "정보형",
    "keyword": "메인 키워드",
    "title_candidates": ["제목 후보1 (50자 이내)", "제목 후보2"],
    "hook": "도입부 훅 문장 (환자 공감형, 2줄 이내)",
    "seo_keywords": ["연관키워드1", "연관키워드2", "연관키워드3"]
  }
]

규칙:
- week 1~4는 각 3건, week 5는 여유분 5건
- day는 월/수/금 순환
- 제목은 환자 눈높이, 광고 느낌 없이
- hook은 환자가 실제로 겪는 상황에서 시작
`

    const msg = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      system: '병원 블로그 콘텐츠 기획 전문가. 반드시 JSON 배열만 출력.',
      messages: [{ role: 'user', content: prompt }],
    })

    const text = msg.content.find(c => c.type === 'text')?.text ?? '[]'
    const clean = text.replace(/```json|```/g, '').trim()
    const plan = JSON.parse(clean)

    // 기획 결과 저장
    const clinic_id = b.clinic_id ?? `clinic_${Date.now()}`
    const plansDir = path.join(process.cwd(), 'data', 'plans')
    await mkdir(plansDir, { recursive: true })
    const filename = `${clinic_id}.json`
    await writeFile(
      path.join(plansDir, filename),
      JSON.stringify({ generated_at: new Date().toISOString(), clinic_id, plan }, null, 2),
      'utf-8'
    )

    return Response.json({ ok: true, plan, branding: b })
  } catch (e) {
    console.error('[agent3/plan]', e)
    return Response.json({ ok: false, plan: [] }, { status: 500 })
  }
}
