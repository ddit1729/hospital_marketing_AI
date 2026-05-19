import Anthropic from '@anthropic-ai/sdk'
import { readdir, readFile } from 'fs/promises'
import path from 'path'
import { BrandingResult } from '@/types/branding'

const client = new Anthropic()

const SYSTEM_PROMPT = `당신은 네이버 블로그 전문 마케터입니다.
병원 브랜딩 데이터를 받아 블로그 글 1개를 작성합니다.

규칙:
- 환자 관점의 구어체 (임상 용어 최소화)
- 제목: 50자 이내, 핵심 키워드 앞 배치
- 본문: 1300~1700자, H2 소제목 3~4개 포함
- 마지막: 상담 유도 CTA 1문장 + 해시태그 10~15개
- 의료광고법상 효과 보장/과장 표현 금지
- 반드시 아래 JSON 형식으로만 응답 (마크다운 코드블록 없이)

{
  "title": "제목",
  "body": "본문 전체 (소제목 포함, 줄바꿈은 \\n 사용)",
  "hashtags": ["해시태그1", "해시태그2"]
}`

function buildPrompt(b: BrandingResult, type: 'symptom' | 'treatment' | 'story'): string {
  const base = `
병원명: (미공개, 지역명으로 대체)
지역: ${b.location}
진료과목: ${b.clinic_type}
한 줄 정의: ${b.one_line}
타겟 환자: ${b.target_patient}
문체 가이드: ${b.voice_sample}
키워드: ${b.keywords.join(', ')}
절대 하지 않을 것: ${b.never_do.join(', ')}
차별점: ${b.differentiation}
`

  if (type === 'symptom') {
    return `${base}
글 유형: 증상/고민형
안타까운 환자: ${b.pain_patient}
좋아하는 환자 유형: ${b.favorite_patient_type}

환자가 증상이나 고민을 검색할 때 나오는 글을 써줘.
환자의 불안과 고민에서 시작해서, 우리 병원이 해결책이 되는 흐름으로.`
  }

  if (type === 'treatment') {
    return `${base}
글 유형: 시술/진료 설명형
하기 싫은 진료 방식: ${b.anti_pattern}
콘텐츠 방향: ${b.content_directions.join(', ')}

우리 병원의 진료 방식과 차별점을 설명하는 글을 써줘.
과장 없이, 왜 다른지를 구체적으로.`
  }

  // story
  return `${base}
글 유형: 원장 스토리형
개원 계기: ${b.doctor_motivation}
5년 뒤 입소문: ${b.future_reputation}

원장님의 철학과 개원 스토리를 담은 글을 써줘.
환자가 읽고 "이 원장님 믿을 수 있겠다"는 느낌이 들게.`
}

async function loadLatestBranding(): Promise<BrandingResult> {
  const dir = path.join(process.cwd(), 'data', 'clinics')
  const files = (await readdir(dir)).filter(f => f.endsWith('.json')).sort()
  if (files.length === 0) throw new Error('브랜딩 데이터 없음')
  const raw = await readFile(path.join(dir, files[files.length - 1]), 'utf-8')
  return JSON.parse(raw)
}

async function generatePost(prompt: string): Promise<{ title: string; body: string; hashtags: string[] }> {
  const msg = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = msg.content.find(c => c.type === 'text')?.text ?? '{}'
  return JSON.parse(text)
}

export async function POST(): Promise<Response> {
  try {
    const branding = await loadLatestBranding()

    const [symptom, treatment, story] = await Promise.all([
      generatePost(buildPrompt(branding, 'symptom')),
      generatePost(buildPrompt(branding, 'treatment')),
      generatePost(buildPrompt(branding, 'story')),
    ])

    return Response.json({
      ok: true,
      posts: [
        { type: 'symptom', label: '증상·고민형', ...symptom },
        { type: 'treatment', label: '시술·진료형', ...treatment },
        { type: 'story', label: '원장 스토리형', ...story },
      ],
    })
  } catch (e) {
    console.error('[agent3/generate]', e)
    return Response.json({ ok: false, posts: [] }, { status: 500 })
  }
}
