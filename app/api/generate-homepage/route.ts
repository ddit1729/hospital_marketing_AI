import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type ThemeKey = "warm" | "professional" | "premium" | "cozy" | "trendy" | "explanatory";

interface ThemeConfig {
  key: ThemeKey;
  label: string;
  bodyBg: string;
  sectionAltBg: string;
  accent: string;
  accentDark: string;
  accentText: string;
  textPrimary: string;
  textSecondary: string;
  heroGradientFrom: string;
  heroGradientTo: string;
  heroText: string;
}

const THEMES: Record<ThemeKey, ThemeConfig> = {
  warm: {
    key: "warm", label: "따뜻함",
    bodyBg: "#FDFAF5", sectionAltBg: "#F2EDE3",
    accent: "#5A9E7B", accentDark: "#3D7A5A", accentText: "#FFFFFF",
    textPrimary: "#2D2D2D", textSecondary: "#6B6B6B",
    heroGradientFrom: "#F7F3EC", heroGradientTo: "#EDE8DC", heroText: "#2D2D2D",
  },
  professional: {
    key: "professional", label: "전문성",
    bodyBg: "#FFFFFF", sectionAltBg: "#F4F6FA",
    accent: "#1B3A6B", accentDark: "#142D54", accentText: "#FFFFFF",
    textPrimary: "#1A1A2E", textSecondary: "#6B7280",
    heroGradientFrom: "#1B3A6B", heroGradientTo: "#2a5298", heroText: "#FFFFFF",
  },
  premium: {
    key: "premium", label: "프리미엄",
    bodyBg: "#F9F7F4", sectionAltBg: "#0D1B2E",
    accent: "#C9A84C", accentDark: "#A8893A", accentText: "#0D1B2E",
    textPrimary: "#1A1A1A", textSecondary: "#6B5B4A",
    heroGradientFrom: "#0D1B2E", heroGradientTo: "#1a2d4a", heroText: "#F5F0E8",
  },
  cozy: {
    key: "cozy", label: "편안함",
    bodyBg: "#F8F8F6", sectionAltBg: "#EEEEE8",
    accent: "#7A9E7E", accentDark: "#5A7E5E", accentText: "#FFFFFF",
    textPrimary: "#2C2C2C", textSecondary: "#6B7280",
    heroGradientFrom: "#E8EDE8", heroGradientTo: "#D8E4D8", heroText: "#2C2C2C",
  },
  trendy: {
    key: "trendy", label: "트렌디",
    bodyBg: "#FFFFFF", sectionAltBg: "#F9F9F9",
    accent: "#FF6B6B", accentDark: "#E05555", accentText: "#FFFFFF",
    textPrimary: "#1A1A1A", textSecondary: "#6B7280",
    heroGradientFrom: "#FF6B6B", heroGradientTo: "#FF8E53", heroText: "#FFFFFF",
  },
  explanatory: {
    key: "explanatory", label: "설명 중심",
    bodyBg: "#FFFFFF", sectionAltBg: "#F0F4FF",
    accent: "#2B5CE6", accentDark: "#1E45C0", accentText: "#FFFFFF",
    textPrimary: "#1A1A2E", textSecondary: "#6B7280",
    heroGradientFrom: "#2B5CE6", heroGradientTo: "#1E45C0", heroText: "#FFFFFF",
  },
};

function detectTheme(brandTone: string): ThemeConfig {
  const t = brandTone || "";
  if (t.includes("따뜻")) return THEMES.warm;
  if (t.includes("프리미엄") || t.includes("고급") || t.includes("세련")) return THEMES.premium;
  if (t.includes("편안") || t.includes("아늑")) return THEMES.cozy;
  if (t.includes("트렌디") || t.includes("젊은") || t.includes("활기")) return THEMES.trendy;
  if (t.includes("설명") || t.includes("꼼꼼") || t.includes("자세")) return THEMES.explanatory;
  return THEMES.professional;
}

// 진료과목 → 영문명 매핑
const SPECIALTY_EN: Record<string, string> = {
  치과: "Dental Clinic",
  피부과: "Dermatology",
  정형외과: "Orthopedics",
  내과: "Internal Medicine",
  소아과: "Pediatrics",
  한의원: "Oriental Medicine",
  약국: "Pharmacy",
};

function getSpecialtyEn(specialty: string): string {
  for (const [ko, en] of Object.entries(SPECIALTY_EN)) {
    if (specialty.includes(ko)) return en;
  }
  return "Medical Clinic";
}

function buildPrompt(brandResult: Record<string, unknown>, theme: ThemeConfig): string {
  const clinicName = (brandResult.clinicName as string) || "병원";
  const specialty = (brandResult.specialty as string) || "";
  const location = (brandResult.location as string) || "";
  const specialtyEn = getSpecialtyEn(specialty);

  return `당신은 병원 전문 웹 디자이너입니다. 아래 브랜드 데이터를 기반으로 완성된 단일 HTML 파일을 생성해주세요.

## 브랜드 데이터
${JSON.stringify(brandResult, null, 2)}

## 색상 테마: ${theme.label}
- 바디 배경: ${theme.bodyBg}
- 섹션 교체 배경: ${theme.sectionAltBg}
- 포인트 컬러: ${theme.accent}
- 포인트 다크: ${theme.accentDark}
- 포인트 위 텍스트: ${theme.accentText}
- 본문 텍스트: ${theme.textPrimary}
- 서브 텍스트: ${theme.textSecondary}
- 히어로 그라데이션: ${theme.heroGradientFrom} → ${theme.heroGradientTo}
- 히어로 텍스트: ${theme.heroText}

## 병원 정보
- 병원명: ${clinicName}
- 진료과목: ${specialty}
- 진료과목 영문명: ${specialtyEn}
- 위치: ${location}

## 섹션 구조 (이 순서 고정)

### 1. 네비게이션 (sticky)
- 왼쪽: ${clinicName} 텍스트 로고
- 가운데: 철학 / 추천 / 진료과목 / 오시는 길 메뉴
- 오른쪽: "전화 상담" 버튼 (포인트 컬러, 전화번호 000-0000-0000)
- 스크롤 시 배경 흰색 + 그림자 전환 (JS)

### 2. 히어로 섹션
- 배경에 "${specialtyEn}" 영문 텍스트 워터마크 (대각선 또는 배경 고정, opacity 0.05~0.08)
- oneLiner을 메인 카피로 — 인용구 스타일(" " 또는 큰따옴표 장식)
- 핵심 키워드 1~2개 포인트 컬러로 강조 (<span style="color:...">)
- 서브카피 2~3줄: "어떤 환자에게 어떤 경험을 주는지" — targetPatient.summary와 brandTone을 조합해 자연스러운 문장으로
  예: "치료 전에 이유를 듣고, 치료 후에 다음을 이해하는 진료.\\n납득하고 맡길 수 있도록 설명을 멈추지 않습니다."
- ${specialty} · ${location} 서브타이틀 (히어로 상단)
- 히어로 하단에 빠른 상담 신청 폼:
  이름 / 연락처 / 문의내용 입력란 + "상담 신청하기" 버튼
  개인정보 수집·이용 동의 체크박스 포함
  폼 제출 시 alert("상담 신청이 완료되었습니다.") 처리

### 3. 원장님 철학
- 제목: "원장님이 직접 말씀드립니다" 또는 "이런 병원을 만들고 싶었어요"
- 딱딱한 소개 글 금지 — 원장님이 직접 말하는 1인칭 서술
- brandTone과 neverDo 내용을 기반으로 "저는 ~하기 싫었어요", "그래서 ~하기로 했어요" 형태로 작성
- 단락 2~3개, 각 단락 2~3문장
- 원장 사진 플레이스홀더(회색 박스 + "원장 사진" 텍스트) 왼쪽/오른쪽 배치

### 4. 이런 분께 추천해요
- targetPatient 데이터를 카드 3개로 시각화
- 각 카드: 아이콘(이모지) + 짧은 제목 + 1~2줄 설명
- 카드 내용: ageGender / personality / behavior 각각 하나씩 대응

### 5. 우리가 다른 점
- neverDo 항목을 "~하지 않습니다" → "대신 ~합니다" 형태로 긍정 재표현
- 좌우 비교 레이아웃 또는 체크리스트 스타일

### 6. 진료 과목
- ${specialty} 기반으로 주요 진료 항목 4~6개 카드
- 각 카드: 아이콘 + 진료명 + 한 줄 설명

### 7. 오시는 길
- location: "${location}"
- 지도 플레이스홀더 (회색 박스, 비율 16:9)
- 주소 / 진료시간(플레이스홀더) / 주차 안내(플레이스홀더) 텍스트

### 8. 하단 CTA
- 강요 없는 부드러운 문구: "편하게 문의해 주세요", "궁금한 점은 언제든지 연락 주세요"
- "지금 바로 예약하세요!" 같은 강요성 문구 절대 금지
- ${clinicName} 명시 + 전화 버튼

### 9. 푸터
- ${clinicName} | ${specialty} | ${location}
- 대표번호 000-0000-0000 | 진료시간 (플레이스홀더)
- 의료광고법 고지 문구: "본 사이트의 내용은 의료광고 심의를 준수합니다."
- 저작권 © ${new Date().getFullYear()} ${clinicName}

### 10. 오른쪽 플로팅 퀵메뉴 (고정)
position: fixed, right: 20px, bottom: 120px
세로로 쌓인 원형 버튼들:
- 카카오 상담 (노란색 #FEE500, 말풍선 아이콘)
- 전화 (포인트 컬러, 전화기 아이콘)
- 블로그 (초록색 #03C75A, N 아이콘 또는 B)
- 인스타그램 (핑크 그라데이션, 카메라 아이콘)
- TOP 버튼 (회색, ↑ 아이콘, 클릭 시 scrollTo top)
각 버튼 hover 시 툴팁 텍스트 왼쪽에 표시

## HTML 생성 규칙
- 반드시 완성된 단일 HTML 파일 (<!DOCTYPE html>부터 </html>까지)
- 모든 CSS를 <style> 태그 안에 작성
- 모든 JS를 <script> 태그 안에 작성
- 외부 리소스(CDN, Google Fonts 등) 절대 사용 금지 — 시스템 폰트만 사용
  font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif
- 반응형: 모바일(max-width: 768px) 미디어쿼리 포함
- IntersectionObserver로 섹션 등장 애니메이션 적용 (fadeInUp)
- 네비게이션 sticky, 스크롤 시 배경+그림자 JS 처리
- 의료광고법 준수: "최고", "완치", "보장", "1위", "유일한" 등 과장·보장 표현 절대 금지
- 섹션 간 여백 충분히 (padding: 80px 이상)
- HTML 코드만 출력. \`\`\`html 같은 코드블록 마커 없이 <!DOCTYPE html>로 시작해서 </html>로 끝낼 것`;
}

export async function POST(request: Request) {
  try {
    const { brandResult } = await request.json();
    const theme = detectTheme(brandResult.brandTone || "");
    const userPrompt = buildPrompt(brandResult, theme);

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      messages: [{ role: "user", content: userPrompt }],
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
                encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
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
    console.error("Generate homepage error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
