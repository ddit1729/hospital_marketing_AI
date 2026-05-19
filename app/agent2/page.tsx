"use client";

import { useState, useEffect, useRef } from "react";
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

type GenState = "idle" | "generating" | "done" | "error";

export default function Agent2Page() {
  const router = useRouter();
  const [brandResult, setBrandResult] = useState<BrandResultData | null>(null);
  const [genState, setGenState] = useState<GenState>("idle");
  const [generatedHtml, setGeneratedHtml] = useState("");
  const [progress, setProgress] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const blobUrlRef = useRef<string>("");

  useEffect(() => {
    const stored = localStorage.getItem("brandResultForHomepage");
    if (stored) {
      try {
        setBrandResult(JSON.parse(stored));
      } catch {
        // invalid data
      }
    }
  }, []);

  // blob URL 업데이트
  useEffect(() => {
    if (!generatedHtml || !iframeRef.current) return;
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    const blob = new Blob([generatedHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    blobUrlRef.current = url;
    iframeRef.current.src = url;
  }, [generatedHtml]);

  // 언마운트 시 blob URL 해제
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const generateHomepage = async () => {
    if (!brandResult) return;
    setGenState("generating");
    setGeneratedHtml("");
    setProgress(0);

    try {
      const res = await fetch("/api/generate-homepage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandResult }),
      });

      if (!res.ok || !res.body) throw new Error("API error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullHtml = "";
      let charCount = 0;
      const ESTIMATED_TOTAL = 12000;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              fullHtml += parsed.text;
              charCount += parsed.text.length;
              setProgress(Math.min(95, Math.round((charCount / ESTIMATED_TOTAL) * 100)));
            }
          } catch {
            // ignore
          }
        }
      }

      setGeneratedHtml(fullHtml);
      setProgress(100);
      setGenState("done");
    } catch (err) {
      console.error(err);
      setGenState("error");
    }
  };

  const downloadHtml = () => {
    if (!generatedHtml) return;
    const blob = new Blob([generatedHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "index.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!brandResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl mb-3">🏥</p>
          <p className="text-gray-700 font-medium mb-1">브랜딩 결과가 없어요</p>
          <p className="text-gray-400 text-sm mb-6">먼저 Agent 1에서 브랜딩 대화를 완료해 주세요.</p>
          <button
            onClick={() => router.push("/")}
            className="px-5 py-2.5 bg-[#1B3A6B] text-white rounded-xl text-sm font-medium hover:opacity-80 transition-opacity"
          >
            Agent 1으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-[#1B3A6B] text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              aria-label="뒤로"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div>
              <p className="text-sm font-bold leading-tight">홈페이지 생성 AI</p>
              <p className="text-xs text-blue-200">Agent 2 — 브랜드 기반 자동 생성</p>
            </div>
          </div>
          {genState === "done" && (
            <button
              onClick={downloadHtml}
              className="flex items-center gap-2 px-4 py-2 bg-white text-[#1B3A6B] rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              index.html 다운로드
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 사이드바 */}
        <aside className="w-72 flex-shrink-0 bg-white border-r border-gray-100 overflow-y-auto p-5 flex flex-col gap-4">
          {/* 브랜드 요약 */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">브랜딩 요약</p>
            {brandResult.clinicName && (
              <p className="text-sm font-bold text-gray-800 mb-2">{brandResult.clinicName}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {[brandResult.specialty, brandResult.location].filter(Boolean).map((v, i) => (
                <span key={i} className="px-2.5 py-1 bg-[#1B3A6B]/10 text-[#1B3A6B] text-xs rounded-full font-medium">{v}</span>
              ))}
            </div>
            <p className="text-sm font-semibold text-gray-800 leading-snug mb-2">{brandResult.oneLiner}</p>
            <p className="text-xs text-gray-500 leading-relaxed">{brandResult.brandTone}</p>
          </div>

          <hr className="border-gray-100" />

          {/* 타겟 환자 */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">핵심 타겟</p>
            <p className="text-xs text-gray-600 leading-relaxed">
              {brandResult.targetPatient?.summary || brandResult.targetPatient?.personality}
            </p>
          </div>

          <hr className="border-gray-100" />

          {/* 키워드 */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">콘텐츠 키워드</p>
            <div className="flex flex-wrap gap-1.5">
              {brandResult.contentKeywords.map((kw, i) => (
                <span key={i} className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">#{kw}</span>
              ))}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* 생성 버튼 */}
          {genState === "idle" && (
            <button
              onClick={generateHomepage}
              className="w-full py-3 bg-[#1B3A6B] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              홈페이지 생성 시작
            </button>
          )}
          {genState === "generating" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 font-medium">생성 중...</p>
                <p className="text-xs text-[#1B3A6B] font-bold">{progress}%</p>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1B3A6B] rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">섹션을 순서대로 구성하고 있어요</p>
            </div>
          )}
          {genState === "done" && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                생성 완료
              </div>
              <button
                onClick={downloadHtml}
                className="w-full py-3 bg-[#1B3A6B] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                index.html 다운로드
              </button>
              <button
                onClick={() => router.push("/agent3")}
                className="w-full py-2.5 border border-[#1B3A6B] text-[#1B3A6B] rounded-xl text-sm font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                블로그 글 생성하러 가기
              </button>
              <button
                onClick={() => { setGenState("idle"); setGeneratedHtml(""); setProgress(0); }}
                className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                다시 생성
              </button>
            </div>
          )}
          {genState === "error" && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-red-500">오류가 발생했어요. 다시 시도해 주세요.</p>
              <button
                onClick={() => setGenState("idle")}
                className="w-full py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
              >
                다시 시도
              </button>
            </div>
          )}
        </aside>

        {/* 미리보기 영역 */}
        <main className="flex-1 flex flex-col bg-gray-200 overflow-hidden">
          {genState === "idle" && (
            <div className="flex-1 flex items-center justify-center flex-col gap-3 text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-3xl shadow-sm">
                🖥️
              </div>
              <p className="text-gray-600 font-medium">왼쪽에서 홈페이지 생성을 시작해 주세요</p>
              <p className="text-gray-400 text-sm max-w-xs">브랜드 데이터를 기반으로 7개 섹션의 병원 홈페이지를 자동 생성해요</p>
            </div>
          )}
          {genState === "generating" && (
            <div className="flex-1 flex items-center justify-center flex-col gap-4">
              <div className="flex gap-2">
                {["히어로", "철학", "타겟", "차별점", "진료", "CTA", "오시는 길"].map((s, i) => (
                  <div
                    key={i}
                    className="px-2 py-1 text-xs rounded-lg font-medium transition-colors"
                    style={{
                      background: progress > (i / 7) * 100 ? "#1B3A6B" : "#E5E7EB",
                      color: progress > (i / 7) * 100 ? "#fff" : "#9CA3AF",
                    }}
                  >
                    {s}
                  </div>
                ))}
              </div>
              <p className="text-gray-500 text-sm">홈페이지를 구성하고 있어요...</p>
            </div>
          )}
          {(genState === "done" || (genState === "generating" && generatedHtml)) && (
            <div className="flex-1 flex flex-col">
              <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 bg-gray-100 rounded-lg px-3 py-1 text-xs text-gray-400 text-center truncate">
                  {[brandResult.clinicName, brandResult.specialty, brandResult.location].filter(Boolean).join(" · ")}
                </div>
              </div>
              <iframe
                ref={iframeRef}
                className="flex-1 w-full border-0 bg-white"
                title="홈페이지 미리보기"
                sandbox="allow-same-origin allow-scripts"
              />
            </div>
          )}
          {genState === "error" && (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              생성에 실패했어요. 다시 시도해 주세요.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
