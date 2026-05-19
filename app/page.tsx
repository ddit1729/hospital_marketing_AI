"use client";

import { useState, useRef, useEffect } from "react";
import ChatBubble from "@/components/ChatBubble";
import ChatInput from "@/components/ChatInput";
import BrandResult from "@/components/BrandResult";
import QuestionHints from "@/components/QuestionHints";

interface Message {
  role: "user" | "assistant";
  content: string;
}

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

const QUESTION_EXAMPLES: string[][] = [
  // aiMsgIndex 0 — 진료과목 질문: 칩 선택 UI 사용, 텍스트 힌트 없음
  [],
  // aiMsgIndex 1 — Q1-b: 병원 이름 (힌트 없음)
  [],
  // aiMsgIndex 2 — Q1-c: 동네 선택 이유
  [
    "집에서 가까워서요. 내가 살고 싶은 동네에 내 병원을 열고 싶었어요",
    "재개발 예정 지역이라 젊은 가족이 많이 들어올 것 같았어요",
    "이 동네에 이런 과목 병원이 없더라고요. 공백이 보였어요",
  ],
  // aiMsgIndex 3 — Q1-d: 지역명 직접 입력 (힌트 없음)
  [],
  // aiMsgIndex 4 — Q2: 이 일을 하는 이유
  [
    "어릴 때 치과가 너무 무서웠는데, 친절한 선생님 한 분이 달라지게 해줬어요",
    "환자가 나아지는 걸 눈으로 볼 수 있는 직업이잖아요. 그게 좋아요",
    "부모님이 제때 치료 못 받으시는 걸 보면서요. 그런 분들한테 도움이 되고 싶었어요",
  ],
  // aiMsgIndex 3 — Q3: 하기 싫었던 순간
  [
    "설명도 없이 치료 끝내고 다음 환자 부르는 게 너무 싫었어요",
    "환자가 왜 이 치료가 필요한지도 모르고 그냥 앉아 있는 상황이요",
    "비용 얘기를 먼저 하고 치료 계획을 짜는 게 불편했어요",
  ],
  // Q4 - 오래 설명하고 싶은 환자
  [
    "겁이 많아서 치료 전에 긴장하는 환자요. 천천히 설명해주면 달라지거든요",
    "왜 이 치료가 필요한지 납득이 안 되면 못 하겠다는 환자요",
    "인터넷에서 잘못된 정보 보고 오신 분들이요. 제대로 알려드리고 싶어요",
  ],
  // Q5 - 잘 맞겠다 싶은 환자
  [
    "치료받기 전에 충분히 이해하고 싶어하는 분이요",
    "빠르게 끝내는 것보다 제대로 하는 걸 원하는 분이요",
    "한 번 믿으면 오래 다니는 스타일의 환자요",
  ],
  // Q6 - 안타까운 환자
  [
    "오래 참다가 너무 나빠진 다음에 오시는 분들이요",
    "비용 때문에 필요한 치료를 미루시는 분들이요",
    "다른 병원에서 잘못된 치료 받고 오시는 분들이요",
  ],
  // Q7 - 절대 하기 싫은 진료 방식
  [
    "환자가 원한다고 해서 필요 없는 치료까지 하는 거요",
    "빨리 끝내려고 설명 생략하는 거요",
    "비용 때문에 치료 계획을 바꾸는 거요. 필요한 건 필요하다고 말해야죠",
  ],
  // Q8 - 왔으면 하는 환자
  [
    "치료 과정을 같이 이해하면서 가고 싶은 분이요",
    "응급으로 오는 것보다 정기적으로 관리받으러 오는 분들이요",
    "가족 모두 데리고 오는 단골 환자요",
  ],
  // Q9 - 5년 뒤 소개말
  [
    "설명을 진짜 잘 해줘요. 뭘 왜 하는지 다 알려줘요",
    "무섭지 않아요. 거기 가면 무섭지 않더라고요",
    "과잉진료 안 해요. 필요한 것만 해줘요",
  ],
  // Q10 - 다른 병원과 달랐으면 하는 점
  [
    "들어왔을 때 분위기가 달랐으면 해요. 긴장되지 않는 곳이요",
    "치료 끝나고 나서 뭘 했는지 기억에 남는 병원이요",
    "원장님이 직접 다 봐준다는 느낌이요",
  ],
];

const SPECIALTY_CHIPS = [
  "치과", "피부과", "정형외과", "내과",
  "소아과", "한의원", "약국", "기타",
];

const INITIAL_MESSAGE =
  "원장님, 안녕하세요. 병원 오픈 준비하시느라 정말 수고 많으셨어요.\n\n지금부터 원장님이랑 짧게 대화하면서 우리 병원만의 색깔을 같이 찾아볼게요. 정답은 없어요. 생각나는 대로 편하게 말씀해 주시면 돼요.\n\n약 10~15분 정도 걸릴 예정이에요. 준비되셨으면 시작해볼게요!\n\n어떤 과목으로 개원하셨어요?";

function parseBrandResult(text: string): BrandResultData | null {
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[1]);
    if (parsed.brandResult) return parsed.brandResult;
    return null;
  } catch {
    return null;
  }
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: INITIAL_MESSAGE },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [brandResult, setBrandResult] = useState<BrandResultData | null>(null);
  const [inputValue, setInputValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const sendMessage = async (userText: string) => {
    if (isLoading) return;

    setInputValue("");
    setIsGeneratingReport(false);
    const userMessage: Message = { role: "user", content: userText };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);
    setStreamingContent("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok || !res.body) throw new Error("API error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                fullText += parsed.text;
                // JSON 블록이 시작되면 그 앞 텍스트만 말풍선에 표시
                const jsonStart = fullText.indexOf("```json");
                if (jsonStart !== -1) {
                  setIsGeneratingReport(true);
                  setStreamingContent(fullText.slice(0, jsonStart).trim());
                } else {
                  setStreamingContent(fullText);
                }
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }

      const assistantMessage: Message = { role: "assistant", content: fullText };
      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingContent("");
      setIsGeneratingReport(false);

      const result = parseBrandResult(fullText);
      if (result) {
        setBrandResult(result);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "죄송해요, 잠시 오류가 발생했어요. 다시 시도해 주세요.",
        },
      ]);
      setStreamingContent("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#1B3A6B] text-white shadow-md">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg">
              🏥
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">병원 브랜딩 AI</p>
              <p className="text-xs text-blue-200">우리 병원만의 색깔 찾기</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/agent2"
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-colors"
            >
              홈페이지
            </a>
            <a
              href="/agent3"
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-colors"
            >
              블로그
            </a>
          </div>
        </div>
      </header>

      {/* Chat area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Progress hint */}
          <div className="text-center mb-6">
            <span className="inline-block px-3 py-1 bg-blue-50 text-[#1B3A6B] text-xs rounded-full border border-blue-100">
              총 10개 질문 · 편하게 답해주세요
            </span>
          </div>

          {/* Messages */}
          {messages.map((msg, i) => {
            const isBrandResultMessage =
              msg.role === "assistant" && parseBrandResult(msg.content) !== null;

            const displayContent = isBrandResultMessage
              ? msg.content.replace(/```json[\s\S]*?```/g, "").trim()
              : msg.content;

            // 진료과목 칩: 첫 번째 AI 메시지 아래, 아직 유저가 한 번도 답하지 않은 경우만 표시
            const showSpecialtyChips = i === 0 && messages.length === 1 && !isLoading;

            // 현재 메시지가 AI 메시지 중 몇 번째인지 (0-indexed)
            const aiMsgIndex = msg.role === "assistant"
              ? messages.slice(0, i + 1).filter((m) => m.role === "assistant").length - 1
              : -1;

            // 마지막 AI 메시지이며, 브랜드 결과가 아닌 경우에만 힌트 표시
            const isLastAssistant =
              msg.role === "assistant" &&
              !isBrandResultMessage &&
              messages.slice(i + 1).every((m) => m.role !== "assistant");
            const showHints =
              isLastAssistant &&
              !isLoading &&
              aiMsgIndex >= 0 &&
              aiMsgIndex < QUESTION_EXAMPLES.length;

            return (
              <div key={i}>
                {displayContent && (
                  <ChatBubble role={msg.role} content={displayContent} />
                )}
                {showSpecialtyChips && (
                  <div className="flex flex-wrap gap-2 mb-4 pl-10">
                    {SPECIALTY_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        onClick={() => sendMessage(chip)}
                        className="px-3.5 py-1.5 rounded-full border border-[#1B3A6B] text-[#1B3A6B] text-sm font-medium bg-white hover:bg-[#1B3A6B] hover:text-white transition-colors active:scale-95"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
                {showHints && (
                  <QuestionHints
                    examples={QUESTION_EXAMPLES[aiMsgIndex]}
                    onFill={setInputValue}
                  />
                )}
                {isBrandResultMessage && brandResult && (
                  <BrandResult data={brandResult} />
                )}
              </div>
            );
          })}

          {/* Streaming bubble */}
          {isLoading && !isGeneratingReport && (
            <ChatBubble
              role="assistant"
              content={streamingContent}
              isStreaming={true}
            />
          )}
          {isLoading && isGeneratingReport && (
            <>
              {streamingContent && (
                <ChatBubble role="assistant" content={streamingContent} />
              )}
              <div className="flex items-end gap-2 mb-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1B3A6B] flex items-center justify-center text-white text-xs font-bold shadow">
                  AI
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-[#1B3A6B] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-[#1B3A6B] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-[#1B3A6B] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <p className="text-sm text-gray-600">잠깐만요, 브랜드 방향을 정리하고 있어요...</p>
                </div>
              </div>
            </>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input area */}
      <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSend={sendMessage}
            disabled={isLoading}
          />
          <p className="text-center text-xs text-gray-400 mt-2">
            이 서비스는 참고용이며, 의료광고법 준수는 전문가와 확인하세요.
          </p>
        </div>
      </div>
    </div>
  );
}
