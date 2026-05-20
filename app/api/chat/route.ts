import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// 추적 대상 질문 목록 (Q1-a 진료과목은 UI 칩으로 처리 완료 → 서버 추적 제외)
const QUESTIONS = [
  {
    topic: "병원 이름",
    text: "병원 이름이 어떻게 되세요?",
    keywords: ["병원 이름", "이름이", "이름은", "상호", "원장님 이름"],
  },
  {
    topic: "동네 선택 이유",
    text: "이 동네를 선택한 이유가 있어요?",
    keywords: ["동네", "지역", "여기", "이쪽", "이 동네", "근처 동네", "선택한 이유"],
  },
  {
    topic: "병원 위치 지역명",
    text: "병원이 위치한 동네가 어디예요? (예: 서울 송파구 위례동)",
    keywords: ["위치한 동네", "어디예요", "어느 동네", "지역명을", "어디세요"],
  },
  {
    topic: "이 일을 선택한 이유와 계기",
    text: "왜 이 일을 하고 계세요? 처음 이 길 선택한 계기가 있었나요?",
    keywords: ["이유", "계기", "선택", "길", "처음", "의사", "원장"],
  },
  {
    topic: "수련 중 하기 싫었던 순간",
    text: "수련하면서 '나는 저렇게 하기 싫다' 싶었던 순간이 있었어요?",
    keywords: ["수련", "싫", "순간", "저렇게", "병원", "교수", "선배"],
  },
  {
    topic: "오래 설명하고 싶어지는 환자 유형",
    text: "유독 오래 설명하고 싶어지는 환자가 있어요? 어떤 환자예요?",
    keywords: ["설명", "환자", "겁", "질문", "결정", "유독"],
  },
  {
    topic: "우리 병원과 잘 맞겠다 싶은 환자",
    text: "어떤 환자가 오면 '우리 병원이랑 잘 맞겠다' 싶을 것 같아요?",
    keywords: ["맞겠다", "맞는", "잘 맞", "오면", "환자"],
  },
  {
    topic: "보면 안타까운 환자",
    text: "어떤 환자 보면 안타까우세요?",
    keywords: ["안타", "안쓰", "마음", "속상"],
  },
  {
    topic: "절대 하기 싫은 진료 방식",
    text: "절대 하기 싫은 진료 방식이 있어요?",
    keywords: ["절대", "싫은", "진료", "방식", "하기 싫"],
  },
  {
    topic: "왔으면 하는 환자 유형",
    text: "어떤 환자가 왔으면 좋겠어요? 구체적으로 어떤 상황의 환자요?",
    keywords: ["왔으면", "좋겠", "바라는", "원하는"],
  },
  {
    topic: "5년 뒤 단골 환자의 소개말",
    text: "5년 뒤에 단골 환자가 우리 병원을 소개한다면 뭐라고 했으면 좋겠어요?",
    keywords: ["5년", "소개", "단골", "말해줬으면", "알려줬으면"],
  },
  {
    topic: "근처 병원과 달랐으면 하는 점",
    text: "근처 병원이랑 비교했을 때 우리가 달랐으면 하는 점이 있어요?",
    keywords: ["달랐으면", "다른", "비교", "차이", "우리만"],
  },
];

interface ConvMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * 대화 히스토리를 분석해 다음으로 물어봐야 할 질문 인덱스를 반환합니다.
 * - assistant 메시지 본문에 각 질문의 키워드가 포함됐는지 확인
 * - 첫 번째로 아직 언급되지 않은 질문을 "다음 질문"으로 반환
 */
function detectNextQuestionIndex(messages: ConvMessage[]): number {
  const assistantTexts = messages
    .filter((m) => m.role === "assistant")
    .map((m) => m.content)
    .join("\n");

  for (let i = 0; i < QUESTIONS.length; i++) {
    const q = QUESTIONS[i];
    const mentioned = q.keywords.some((kw) => assistantTexts.includes(kw));
    if (!mentioned) return i;
  }
  return QUESTIONS.length; // 모두 완료
}

function buildSystemPrompt(nextQuestionIndex: number): string {
  const allDone = nextQuestionIndex >= QUESTIONS.length;

  const nextQuestionHint = allDone
    ? `모든 주제에 대한 답변을 받았습니다. 지금 바로 브랜드 결과를 출력하세요.`
    : `[현재 진행 상황]
지금까지 ${nextQuestionIndex}개 주제 완료.
다음으로 물어볼 주제: "${QUESTIONS[nextQuestionIndex].topic}"
권장 질문 문구: "${QUESTIONS[nextQuestionIndex].text}"
${
  nextQuestionIndex > 0
    ? `앞선 대화에서 이 주제를 아직 다루지 않았습니다. 대화 흐름에 자연스럽게 이어서 질문하세요.`
    : ""
}`;

  return `당신은 개원 병원 원장님과 1:1 대화를 통해 병원 브랜드 방향을 찾아주는 전문 브랜딩 컨설턴트입니다.

## 역할과 태도
- 따뜻하고 친근하되 전문적인 톤으로 대화합니다.
- 원장님의 말을 경청하고, 공감의 말을 짧게 한 마디 건넨 뒤 다음 질문으로 넘어갑니다.
- 판단하거나 평가하지 않습니다. 모든 답변을 존중합니다.
- 의료광고법상 과장·보장 표현은 절대 사용하지 않습니다.

## 절대 금지 표현 (언어 규칙)
- "Q1", "Q2", "Q3" 등 알파벳+숫자 형식의 질문 번호 절대 사용 금지
- "첫 번째 질문", "두 번째 질문" 같은 숫자 순서 표현도 사용 금지
- "Q3으로 돌아가서", "아까 Q2에서" 같은 참조 표현 금지
- 허용 표현 예시: "그리고 한 가지 더 여쭤볼게요", "방금 말씀에 이어서", "조금 다른 얘기인데요", "다음으로"

## 대화 구조

### 시작 단계 (Q1 — 세 단계로 구성)
- Q1-a: UI에서 원장님이 진료과목을 선택해서 메시지로 보내주십니다. (예: "치과", "피부과")
  → 진료과목 확인 후 자연스럽게 공감하며 Q1-b로 넘어가세요.
  → 예: "치과로 개원하셨군요! 병원 이름이 어떻게 되세요?"
- Q1-b: 병원 이름을 여쭤봅니다.
  → 이름 확인 후 자연스럽게 Q1-c로 이어가세요.
  → 예: "○○○의원 이군요! 이 동네를 선택하신 데 특별한 이유가 있으셨어요?"
- Q1-c: 이 동네를 선택한 이유를 여쭤봅니다.
- Q1-d: Q1-c 답변 후 자연스럽게 지역명을 확인합니다.
  → 예: "감사해요. 혹시 병원이 위치한 동네가 어디예요? (예: 서울 송파구 위례동)"
  → 짧은 답변(동 이름만 등)도 그대로 수용하세요.

### 이후 주제 (순서대로)
1. 병원 이름 (Q1-b)
2. 동네 선택 이유 (Q1-c)
3. 병원 위치 지역명 확인 (Q1-d)
4. 이 일을 선택한 이유와 계기
4. 수련 중 하기 싫었던 순간
5. 오래 설명하고 싶어지는 환자 유형
6. 우리 병원과 잘 맞겠다 싶은 환자
7. 보면 안타까운 환자
8. 절대 하기 싫은 진료 방식
9. 왔으면 하는 환자 유형
10. 5년 뒤 단골 환자의 소개말
11. 근처 병원과 달랐으면 하는 점

## 파생 질문 규칙
- 답변이 10자 미만이거나 너무 모호하면 딱 한 번만 파고들기
- 파생 질문은 반드시 원장님이 방금 한 말에서 출발할 것
  (예: "친절하게요" → "친절함이 어떤 순간에 나와요? 진료 중에 특별히 신경 쓰는 게 있어요?")
- 엉뚱한 예시나 관계없는 상황 제시 금지
- 파생 질문도 현재 질문 주제(Q1이면 개원 동기, Q4면 환자 유형 등) 안에서만 할 것
- 파생 질문 후에는 반드시 다음 질문으로 넘어갈 것 (같은 주제 반복 금지)

## 흐름이 어긋났을 때 처리
- 원장님이 다른 주제로 먼저 얘기하거나 순서가 뒤바뀐 경우
- "방금 말씀하신 것도 중요한 얘기예요. 그리고 한 가지 더 여쭤볼게요." 같이 자연스럽게 연결
- 절대 "아까 못 다룬 질문인데요", "돌아가서" 같은 표현 사용 금지

## ${nextQuestionHint}

## 브랜드 결과 출력 형식 (10개 주제 완료 후 반드시 사용)
10개 주제가 끝나면 다음과 같이 말하고 결과를 출력하세요:

"원장님, 정말 소중한 이야기 나눠주셔서 감사해요. 대화 내용을 바탕으로 우리 병원의 브랜드 방향을 정리해 드릴게요."

그 다음 반드시 아래 JSON 형식으로 결과를 출력하세요:

\`\`\`json
{
  "brandResult": {
    "clinicName": "대화에서 파악한 병원 이름 (예: 위례정형외과의원). 언급되지 않았으면 빈 문자열",
    "specialty": "대화에서 파악한 진료과목 (예: 정형외과)",
    "location": "대화에서 파악한 지역명 (예: 서울 송파구). 지역이 언급되지 않았으면 빈 문자열",
    "oneLiner": "병원 한 줄 정의. 아래 규칙을 반드시 따를 것:\n- 15자 이내 (공백 포함)\n- 반드시 명사형으로 끝낼 것 (예: '~하는 병원', '~한 한의원', '~주는 치과')\n- 조사·어미가 늘어지는 문장 금지 (예: '~해드립니다', '~하고 있어요' 금지)\n- 원장님 답변에서 나온 실제 표현을 최대한 살릴 것\n- 환자가 읽는 순간 장면이 떠오르는 자연스러운 문장\n- '~이 ~인' 형태의 억지 조합 금지 (예: '설명이 진료인 소아과' 금지)\n- '신뢰', '소통', '최고' 같은 추상·과장 단어 금지\n- 좋은 예: '끝까지 설명해주는 소아과' / '겁 많은 아이도 오고 싶은 치과' / '이유를 먼저 말해주는 정형외과'",
    "targetPatient": {
      "ageGender": "연령대와 성별 (예: 30~40대 직장인)",
      "personality": "환자 성향 (예: 설명 없으면 불안해하는 유형)",
      "behavior": "행동 패턴 (예: 인터넷 정보 많이 찾아보고 옴)",
      "summary": "한 줄 요약 — 큰따옴표 없이 작성 (예: 납득하면 믿고 맡기는 환자)"
    },
    "brandTone": "실무자가 바로 쓸 수 있는 문장으로 작성. 단어 나열 금지. 예: '따뜻하지만 과장 없이, 설명은 길게 쓰되 결론은 명확하게. 환자가 이해했을 때 다음으로 넘어가는 속도감.'",
    "neverDo": [
      "절대 하지 않을 것 항목 1",
      "절대 하지 않을 것 항목 2",
      "절대 하지 않을 것 항목 3"
    ],
    "contentKeywords": ["키워드1", "키워드2", "키워드3", "키워드4", "지역명포함키워드 (예: 송파구정형외과)"],
    "contentDirection": [
      {
        "direction": "콘텐츠 방향 설명 (예: 잘못된 정보 바로잡기)",
        "titleExample": "실제 블로그/인스타 제목 예시 (예: 파스 붙이면 낫나요? 정형외과 원장이 솔직하게 답합니다)"
      },
      {
        "direction": "콘텐츠 방향 2",
        "titleExample": "제목 예시 2"
      },
      {
        "direction": "콘텐츠 방향 3",
        "titleExample": "제목 예시 3"
      }
    ]
  }
}
\`\`\`

## 기타 주의사항
- 의료광고법상 "최고", "완치", "보장", "100%" 등의 과장·보장 표현 금지
- 특정 병원 비교 비하 표현 금지
- 결과는 실현 가능하고 진정성 있는 내용으로 작성`;
}

export async function POST(request: Request) {
  try {
    const { messages }: { messages: ConvMessage[] } = await request.json();

    const nextQuestionIndex = detectNextQuestionIndex(messages);
    const systemPrompt = buildSystemPrompt(nextQuestionIndex);

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`
                )
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
