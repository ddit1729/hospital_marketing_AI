import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const UNSPLASH_KEYWORDS: Record<string, string> = {
  치과: "dental clinic modern interior",
  내과: "medical clinic interior clean",
  소아과: "pediatric clinic bright friendly",
  피부과: "aesthetic clinic luxury spa",
  약국: "pharmacy modern interior",
  한의원: "korean oriental medicine clinic",
  정형외과: "orthopedic clinic modern",
  안과: "eye clinic modern interior",
  이비인후과: "ent clinic interior",
  산부인과: "womens clinic interior",
};

async function translateClinicType(clinicType: string): Promise<string> {
  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 50,
      messages: [{
        role: "user",
        content: `"${clinicType}"를 Unsplash 이미지 검색에 적합한 영어 키워드로 변환해줘. 예: "medical clinic interior" 형태로. 키워드만 출력.`,
      }],
    });
    return (msg.content.find(c => c.type === "text")?.text ?? "").trim() || "medical clinic modern interior";
  } catch {
    return "medical clinic modern interior";
  }
}

async function getUnsplashQuery(clinicType: string): Promise<string> {
  for (const [ko, query] of Object.entries(UNSPLASH_KEYWORDS)) {
    if (clinicType.includes(ko)) return query;
  }
  return await translateClinicType(clinicType);
}

async function searchUnsplash(query: string, perPage: number, orientation = "landscape"): Promise<string[]> {
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("orientation", orientation);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` },
  });
  if (!res.ok) {
    console.error("[Unsplash] 요청 실패:", res.status, res.statusText);
    return [];
  }
  const json = await res.json();
  const urls = (json.results ?? []).map((r: { urls: { regular: string } }) => r.urls.regular) as string[];
  // 중복 URL 제거
  return [...new Set(urls)];
}

// 반환: [hero, intro, 카드1, 카드2, 카드3]  (총 5장, 중복 없음, 실패 시 빈 문자열)
async function fetchUnsplashImages(clinicType: string): Promise<string[]> {
  try {
    const clinicQuery = await getUnsplashQuery(clinicType);
    const cardQuery = "minimal nature object beige";

    const [clinicImgs, cardImgs] = await Promise.all([
      searchUnsplash(clinicQuery, 5, "landscape"),
      searchUnsplash(cardQuery, 10, "squarish"),
    ]);

    // 전체 URL 풀에서 중복 없이 5장 선택
    const used = new Set<string>();
    const pick = (pool: string[]): string => {
      for (const url of pool) {
        if (url && !used.has(url)) { used.add(url); return url; }
      }
      return "";
    };

    const result = [
      pick(clinicImgs),   // hero
      pick(clinicImgs),   // intro
      pick(cardImgs),     // card1
      pick(cardImgs),     // card2
      pick(cardImgs),     // card3
    ];

    console.log("[Unsplash] 클리닉 쿼리:", clinicQuery);
    console.log("[Unsplash] 최종 반환:", result);

    return result;
  } catch (e) {
    console.error("[Unsplash] fetchUnsplashImages 오류:", e);
    return ["", "", "", "", ""];
  }
}

function buildPrompt(brandResult: Record<string, unknown>, images: string[]): string {
  const clinicName = (brandResult.clinicName as string) || "병원";
  const specialty = (brandResult.specialty as string) || "";
  const location = (brandResult.location as string) || "";
  const oneLiner = (brandResult.oneLiner as string) || "";
  const targetPatient = brandResult.targetPatient as Record<string, string> | undefined;
  const neverDo = (brandResult.neverDo as string[]) || [];
  const brandTone = (brandResult.brandTone as string) || "";
  const contentKeywords = (brandResult.contentKeywords as string[]) || [];

  // 병원명 영문 대문자 표기용 (한글이면 그대로 사용)
  const clinicNameUpper = clinicName.toUpperCase();

  return `당신은 럭셔리 병원 브랜딩 전문 웹 디자이너입니다. 아래 브랜드 데이터를 기반으로 고급 미니멀 병원 홈페이지 HTML 파일을 생성해주세요.

## ⚠️ 이미지 플레이스홀더 규칙 (반드시 준수)
이미지가 들어갈 모든 자리에 아래 플레이스홀더 문자열을 그대로 사용할 것. URL을 지어내거나 비워두지 말 것.
- 히어로 배경: HERO_IMAGE_URL
- 소개 섹션 이미지: INTRO_IMAGE_URL
- 진료 카드 1 배경: CARD_IMAGE_URL_1
- 진료 카드 2 배경: CARD_IMAGE_URL_2
- 진료 카드 3 배경: CARD_IMAGE_URL_3

히어로 섹션 예시 (반드시 이 형태로):
<section id="hero" style="background-image: url('HERO_IMAGE_URL'); background-size: cover; background-position: center;">

## 브랜드 데이터
- 병원명: ${clinicName}
- 진료과목: ${specialty}
- 위치: ${location}
- 병원 한 줄 정의: ${oneLiner}
- 타겟 환자 요약: ${targetPatient?.summary ?? ""}
- 타겟 환자 연령/성별: ${targetPatient?.ageGender ?? ""}
- 타겟 환자 성향: ${targetPatient?.personality ?? ""}
- 타겟 환자 행동: ${targetPatient?.behavior ?? ""}
- 브랜드 톤: ${brandTone}
- 절대 하지 않는 것: ${neverDo.join(", ")}
- 콘텐츠 키워드: ${contentKeywords.join(", ")}

## 디자인 시스템
- 배경: #FAF8F5 (따뜻한 오프화이트)
- 텍스트 기본: #1A1A1A
- 포인트: #8B6F47 (웜골드)
- 서브텍스트: #9A8878
- 다크 섹션 배경: #1A1A1A
- 영문 헤딩 폰트: 'Cormorant Garamond' (Google Fonts, weight 300/400/600)
- 한글 본문 폰트: 'Noto Sans KR' (Google Fonts, weight 300/400/500)
- 절대 네이비(#1B3A6B) 배경 사용 금지
- 이모지 아이콘 절대 사용 금지 (SVG만 허용)

## Google Fonts 링크 (반드시 포함)
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Noto+Sans+KR:wght@300;400;500&display=swap" rel="stylesheet">

---

## 섹션별 상세 지시

### 1. 네비게이션 (sticky)
- 초기 배경: transparent
- 스크롤 후: rgba(250,248,245,0.97) + 하단 border-bottom: 1px solid #E8E0D5
- 왼쪽: "${clinicName}" 텍스트 로고 (Cormorant Garamond 400, #1A1A1A, 1.3rem, letter-spacing 0.05em)
- 가운데: 소개 / 진료 안내 / 원장 철학 / 오시는 길 (Noto Sans KR 300, #9A8878, 0.85rem)
- 오른쪽: "상담 문의" 텍스트 링크 (#8B6F47, 밑줄 없음)

### 2. 히어로 섹션
- 풀스크린 (100vh), position: relative
- section 태그 인라인 스타일: style="background-image: url('HERO_IMAGE_URL'); background-size: cover; background-position: center; background-repeat: no-repeat;"
- 오버레이: position:absolute inset 0, background: rgba(0,0,0,0.30)
- 콘텐츠 위치: 절대 위치, 좌하단 (bottom: 80px, left: 60px)
- 영문 병원명: "${clinicNameUpper}" (Cormorant Garamond 300, 5.5rem, 흰색, letter-spacing 0.08em, line-height 1)
- 한 줄 정의: "${oneLiner}" (Noto Sans KR 300, 1.2rem, rgba(255,255,255,0.75), margin-top 16px)
- 우하단: "Scroll" + 아래 방향 얇은 선 (position absolute, bottom: 40px, right: 60px, 흰색, 0.75rem Cormorant, letter-spacing 0.2em)
- 화살표 bounce 애니메이션 (CSS @keyframes)

### 3. 소개 섹션
- 배경: #FAF8F5
- padding: 120px 0
- 2단 그리드 (50% / 50%), gap 0
- 좌측 (텍스트 영역, padding: 0 80px 0 120px):
  - 소제목: "About" (Cormorant Garamond 300, 0.9rem, #8B6F47, letter-spacing 0.3em, 대문자)
  - 가로줄: width 40px, height 1px, background #8B6F47, margin: 20px 0
  - 메인 제목: "원장님이 직접 전합니다" (Cormorant Garamond 400, 2.2rem, #1A1A1A, line-height 1.4)
  - 본문: brandTone과 개원 동기 기반 1인칭 서술 (Noto Sans KR 300, 1rem, #1A1A1A, line-height 2)
    ("저는 ~하기 싫었어요", "그래서 ~하기로 했어요" 형식, 단락 2~3개)
- 우측 (이미지 영역):
  - style="background-image: url('INTRO_IMAGE_URL'); background-size: cover; background-position: center;" 인라인 스타일 사용
  - 비율 3:4 세로형 (height: 100%, min-height: 600px)
  - INTRO_IMAGE_URL이 빈 경우 background: #E8E0D5
  - 모서리 없음 (border-radius: 0)
- 모바일: 이미지 위, 텍스트 아래 (세로 배치, 이미지 height: 400px)

### 4. 진료 안내 섹션
- 배경: #FFFFFF
- padding: 120px 60px
- 상단 중앙 정렬:
  - 영문 소제목: "Medical Services" (Cormorant Garamond 300, 0.85rem, #8B6F47, letter-spacing 0.3em, 대문자)
  - 가로줄 (위와 동일)
  - 한글 제목: "진료 안내" (Cormorant Garamond 400, 2.5rem, #1A1A1A)
- 카드 그리드: 3열 (모바일 1열), gap: 1px, margin-top: 60px
- ${specialty} 기반 주요 진료 항목 3개 카드 (이미지 배경 카드)
- 카드 구조:
  - 높이: 420px, position: relative, overflow: hidden
  - 카드1: style="background-image: url('CARD_IMAGE_URL_1'); background-size: cover; background-position: center;"
  - 카드2: style="background-image: url('CARD_IMAGE_URL_2'); background-size: cover; background-position: center;"
  - 카드3: style="background-image: url('CARD_IMAGE_URL_3'); background-size: cover; background-position: center;"
  - 배경 위 그라데이션 오버레이: linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 50%)
  - 플레이스홀더 비어 있는 경우 background: #2C2A27
  - 카드 하단 텍스트 (position: absolute, bottom: 32px, left: 32px):
    - 번호: "01" / "02" / "03" (Cormorant Garamond 300, 0.8rem, #8B6F47, letter-spacing 0.2em)
    - 진료명 (Cormorant Garamond 400, 1.8rem, 흰색)
    - 설명 (Noto Sans KR 300, 0.85rem, rgba(255,255,255,0.7))
  - 이모지 아이콘 절대 사용 금지 (텍스트와 번호만 사용)
- 카드 호버: transform scale(1.02), transition 0.6s ease

### 5. 원장 철학 섹션 (다크)
- 배경: #1A1A1A
- padding: 120px 60px
- 상단: "OUR PROMISE" (Cormorant Garamond 300, 5rem, 흰색, letter-spacing 0.15em, opacity: 0.15)
  이 텍스트 위에 겹쳐서 실제 콘텐츠 배치 (position: absolute or negative margin)
- neverDo 기반 3가지 약속 (간결하게):
  - 각 항목: 왼쪽 얇은 세로줄(#8B6F47) + 약속 문구 (Noto Sans KR 300, 1rem, rgba(255,255,255,0.85))
  - 3열 그리드, gap: 60px
  - 각 항목 위: 번호 "01" / "02" / "03" (Cormorant Garamond 300, 0.8rem, #8B6F47)

### 6. 이런 분께 추천드립니다
- 배경: #FAF8F5
- padding: 120px 60px
- 상단: "For You" (Cormorant Garamond 300, 0.85rem, #8B6F47, 대문자)
- 3열 카드 (배경 흰색, padding: 48px 40px, border: 1px solid #E8E0D5):
  - 번호 (Cormorant 300, #8B6F47)
  - 제목 (Noto Sans KR 500, 1rem, #1A1A1A)
  - 설명 (Noto Sans KR 300, 0.9rem, #9A8878, line-height 1.8)
  - ageGender / personality / behavior 각각 대응
  - 이모지 아이콘 사용 금지

### 7. 오시는 길
- 배경: #FFFFFF
- padding: 120px 60px
- 지도 플레이스홀더: background #E8E0D5, 비율 16:5, 중앙에 "${location}" 텍스트 (#9A8878)
- 아래: 주소 / 진료시간 / 주차 정보 (3열, 각 항목 위 Cormorant 소제목)

### 8. CTA 섹션
- 배경: #FAF8F5
- padding: 120px 60px
- 중앙 정렬
- 영문: "Get in Touch" (Cormorant Garamond 300, 3.5rem, #1A1A1A)
- 한글: 브랜드 톤에 맞는 상담 유도 문구 (Noto Sans KR 300, 1rem, #9A8878, margin-top: 16px)
- 강요성 문구 절대 금지
- 아웃라인 버튼: border: 1px solid #8B6F47, color: #8B6F47, background: transparent
  padding: 16px 48px, letter-spacing: 0.15em, Cormorant 400, 1rem
  호버: background #8B6F47, color: #FAF8F5
- 전화번호: 000-0000-0000 (Cormorant Garamond 300, 1.8rem, #1A1A1A, margin-top: 32px)

### 9. 푸터
- 배경: #1A1A1A
- padding: 60px
- 좌: ${clinicName} (Cormorant 300, #9A8878) | 우: 저작권 © ${new Date().getFullYear()}
- 하단: 의료광고법 고지 (Noto Sans KR 300, 0.75rem, #666, border-top: 1px solid #333, padding-top: 24px)

### 10. 모바일 플로팅 전화 버튼
- position: fixed, bottom: 24px, right: 24px
- 원형 (52px × 52px), background: #8B6F47
- 전화기 SVG 아이콘 (흰색, 20px)
- box-shadow: 0 4px 20px rgba(139,111,71,0.4)
- 모바일(max-width: 768px)에서만 표시 (데스크톱 display: none)

---

## HTML 생성 규칙
- 반드시 완성된 단일 HTML 파일 (<!DOCTYPE html>부터 </html>까지)
- Google Fonts CDN만 허용 (Cormorant Garamond + Noto Sans KR), 그 외 외부 CDN 절대 금지
- 모든 CSS를 <style> 태그 안에 작성
- 모든 JS를 <script> 태그 안에 작성
- html { scroll-behavior: smooth; }
- IntersectionObserver로 섹션 등장 fade-in 애니메이션 (opacity 0 → 1, translateY 30px → 0, duration 0.8s)
- 네비게이션 스크롤 감지 JS (window.scrollY > 50 시 클래스 추가)
- 반응형: 모바일(max-width: 768px) 미디어쿼리 — 모든 2단 레이아웃을 세로 배치
- 섹션 간 최소 여백 100px
- 의료광고법 준수: "최고", "완치", "보장", "1위", "유일한" 등 과장·보장 표현 절대 금지
- 이모지 사용 절대 금지 (아이콘 필요 시 SVG inline으로)
- 네이비(#1B3A6B) 배경 사용 절대 금지
- HTML 코드만 출력. \`\`\`html 같은 코드블록 마커 없이 <!DOCTYPE html>로 시작해서 </html>로 끝낼 것`;
}

export async function POST(request: Request) {
  try {
    const { brandResult } = await request.json();

    const clinicType = (brandResult.specialty as string) || "";
    const images = await fetchUnsplashImages(clinicType);

    const userPrompt = buildPrompt(brandResult, images);

    // 1단계: Claude 응답 전체 수집
    const stream = await client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      messages: [{ role: "user", content: userPrompt }],
    });

    let rawHtml = "";
    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
        rawHtml += chunk.delta.text;
      }
    }

    // 2단계: 플레이스홀더를 실제 Unsplash URL로 교체
    const finalHtml = rawHtml
      .replace(/HERO_IMAGE_URL/g,   images[0] ?? "")
      .replace(/INTRO_IMAGE_URL/g,  images[1] ?? "")
      .replace(/CARD_IMAGE_URL_1/g, images[2] ?? "")
      .replace(/CARD_IMAGE_URL_2/g, images[3] ?? "")
      .replace(/CARD_IMAGE_URL_3/g, images[4] ?? "");

    // 3단계: 교체된 HTML을 청크로 나눠 SSE 스트리밍 (프론트 프로그레스바 유지)
    const CHUNK_SIZE = 300;
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for (let i = 0; i < finalHtml.length; i += CHUNK_SIZE) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ text: finalHtml.slice(i, i + CHUNK_SIZE) })}\n\n`
              )
            );
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
