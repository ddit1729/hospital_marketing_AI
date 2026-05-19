"use client";

interface QuestionHintsProps {
  examples: string[];
  onFill: (text: string) => void;
}

export default function QuestionHints({ examples, onFill }: QuestionHintsProps) {
  return (
    <div className="mb-4 pl-10">
      <p className="text-xs text-gray-400 mb-1.5">참고 예시 (클릭하면 입력돼요)</p>
      <div className="flex flex-col gap-1.5">
        {examples.map((ex, i) => (
          <button
            key={i}
            onClick={() => onFill(ex)}
            className="text-left text-[13px] text-gray-500 bg-[#F5F5F5] hover:bg-gray-200 rounded-xl px-3 py-2 transition-colors leading-snug"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
