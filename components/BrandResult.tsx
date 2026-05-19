"use client";

import { useRouter } from "next/navigation";

interface TargetPatient {
  ageGender: string;
  personality: string;
  behavior: string;
  summary: string;
}

interface ContentDirectionItem {
  direction: string;
  titleExample: string;
}

interface BrandResultData {
  clinicName: string;
  specialty: string;
  location: string;
  oneLiner: string;
  targetPatient: TargetPatient;
  brandTone: string;
  neverDo: string[];
  contentKeywords: string[];
  contentDirection: ContentDirectionItem[];
}

interface BrandResultProps {
  data: BrandResultData;
}

export default function BrandResult({ data }: BrandResultProps) {
  const router = useRouter();

  const handleGenerateHomepage = () => {
    localStorage.setItem("brandResultForHomepage", JSON.stringify(data));
    router.push("/agent2");
  };

  return (
    <div className="my-4 mx-2">
      <div className="bg-gradient-to-br from-[#1B3A6B] to-[#2a5298] rounded-2xl p-6 text-white shadow-lg">

        {/* 헤더 */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg">
              ✨
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">
                {data.clinicName || "우리 병원"} 브랜드 리포트
              </h2>
              {(data.specialty || data.location) && (
                <p className="text-xs text-blue-200 mt-0.5">
                  {[data.specialty, data.location].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 한 줄 정의 */}
        <div className="bg-white/10 rounded-xl p-4 mb-4">
          <p className="text-xs font-semibold text-blue-200 mb-1 uppercase tracking-wide">병원 한 줄 정의</p>
          <p className="text-base font-bold leading-snug">{data.oneLiner}</p>
        </div>

        <div className="grid grid-cols-1 gap-3">

          {/* 핵심 타겟 환자 */}
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-200 mb-3 uppercase tracking-wide">핵심 타겟 환자</p>
            <div className="flex flex-col gap-2">
              {[
                { label: "연령/성별", value: data.targetPatient?.ageGender },
                { label: "성향", value: data.targetPatient?.personality },
                { label: "행동 패턴", value: data.targetPatient?.behavior },
              ].map(({ label, value }) =>
                value ? (
                  <div key={label} className="flex gap-2 text-sm">
                    <span className="flex-shrink-0 text-blue-200 w-20">{label}</span>
                    <span className="leading-snug">{value}</span>
                  </div>
                ) : null
              )}
              {data.targetPatient?.summary && (
                <div className="mt-1 pt-2 border-t border-white/10 text-sm font-semibold">
                  &ldquo;{data.targetPatient.summary}&rdquo;
                </div>
              )}
            </div>
          </div>

          {/* 브랜드 톤 */}
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-200 mb-2 uppercase tracking-wide">브랜드 톤</p>
            <p className="text-sm leading-relaxed">{data.brandTone}</p>
          </div>

          {/* 절대 하지 않을 것 */}
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-200 mb-2.5 uppercase tracking-wide">절대 하지 않을 것</p>
            <div className="flex flex-col gap-1.5">
              {Array.isArray(data.neverDo)
                ? data.neverDo.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="flex-shrink-0 text-blue-200 mt-0.5">—</span>
                      <span className="leading-snug">{item}</span>
                    </div>
                  ))
                : (
                    <p className="text-sm leading-relaxed">{data.neverDo}</p>
                  )}
            </div>
          </div>

          {/* 콘텐츠 키워드 */}
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-200 mb-2.5 uppercase tracking-wide">콘텐츠 키워드</p>
            <div className="flex flex-wrap gap-2">
              {data.contentKeywords.map((keyword, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium"
                >
                  #{keyword}
                </span>
              ))}
            </div>
          </div>

          {/* 첫 달 콘텐츠 방향 */}
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-200 mb-3 uppercase tracking-wide">첫 달 콘텐츠 방향</p>
            <div className="flex flex-col gap-4">
              {data.contentDirection.map((item, i) => {
                const direction = typeof item === "string" ? item : item.direction;
                const titleExample = typeof item === "string" ? null : item.titleExample;
                return (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold mt-0.5">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold leading-snug">{direction}</p>
                      {titleExample && (
                        <p className="text-xs text-blue-200 mt-1 leading-snug">
                          예시 제목 — &ldquo;{titleExample}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        <p className="text-xs text-blue-200 text-center mt-5 leading-relaxed">
          이 결과는 원장님과의 대화를 바탕으로 생성된 브랜드 방향입니다.<br />
          의료광고법 준수 여부는 전문가와 추가 검토를 권장드립니다.
        </p>

        {/* 홈페이지 생성 버튼 */}
        <button
          onClick={handleGenerateHomepage}
          className="mt-4 w-full py-3.5 bg-white text-[#1B3A6B] rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
          홈페이지 생성하기
        </button>
      </div>
    </div>
  );
}
