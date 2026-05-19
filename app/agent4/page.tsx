'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function Agent4Content() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const index = searchParams.get('index')

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-[#1B3A6B]/10 flex items-center justify-center text-3xl mx-auto mb-5">
          ✍️
        </div>
        <h1 className="text-xl font-bold text-[#1B3A6B] mb-2">블로그 글 생성</h1>
        {index && (
          <p className="text-sm text-gray-400 mb-1">기획 #{index}번 글</p>
        )}
        <p className="text-gray-500 text-sm mb-6">
          이 기능은 준비 중이에요.<br />
          곧 업데이트될 예정입니다.
        </p>
        <button
          onClick={() => router.back()}
          className="px-5 py-2.5 border border-[#1B3A6B] text-[#1B3A6B] rounded-xl text-sm font-medium hover:bg-blue-50 transition-colors"
        >
          ← 기획으로 돌아가기
        </button>
      </div>
    </main>
  )
}

export default function Agent4Page() {
  return (
    <Suspense>
      <Agent4Content />
    </Suspense>
  )
}
