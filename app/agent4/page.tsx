'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

interface Post {
  title: string
  body: string
  meta_description: string
  hashtags: string[]
}

interface PlanItem {
  index: number
  type: string
  keyword: string
  title_candidates: string[]
  hook: string
}

function Agent4Content() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const index = searchParams.get('index')

  const [post, setPost] = useState<Post | null>(null)
  const [planItem, setPlanItem] = useState<PlanItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (index) handleGenerate()
  }, [index])

  async function handleGenerate() {
    if (!index) return
    setLoading(true)
    setError('')
    setPost(null)
    try {
      const res = await fetch('/api/agent4/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index: Number(index) }),
      })
      const data = await res.json()
      if (data.ok) {
        setPost(data.post)
        setPlanItem(data.planItem)
      } else {
        setError('글 생성 중 오류가 발생했어요. 다시 시도해주세요.')
      }
    } catch {
      setError('네트워크 오류가 발생했어요.')
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    if (!post) return
    const text = `${post.title}\n\n${post.body}\n\n${post.hashtags.map(h => `#${h}`).join(' ')}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.push('/agent3')}
            className="text-sm text-gray-400 hover:text-[#1B3A6B] transition"
          >
            ← 기획으로 돌아가기
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1B3A6B]">블로그 글 생성</h1>
          {planItem && (
            <p className="text-gray-500 mt-1 text-sm">
              {planItem.type} · {planItem.keyword}
            </p>
          )}
        </div>

        {loading && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
            <p className="text-[#1B3A6B] font-medium mb-2">글을 작성하고 있어요...</p>
            <p className="text-gray-400 text-sm">약 20~30초 소요됩니다</p>
          </div>
        )}

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {post && (
          <div className="space-y-4">

            {/* 제목 + 메타 */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <p className="text-xs text-gray-400 mb-1">제목</p>
              <p className="text-[#1B3A6B] font-bold text-lg leading-snug mb-4">{post.title}</p>
              <p className="text-xs text-gray-400 mb-1">메타 디스크립션</p>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{post.meta_description}</p>
            </div>

            {/* 본문 */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <p className="text-xs text-gray-400 mb-2">본문</p>
              <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto border border-gray-100 rounded-lg p-4">
                {post.body}
              </div>
            </div>

            {/* 해시태그 */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <p className="text-xs text-gray-400 mb-2">해시태그</p>
              <div className="flex flex-wrap gap-1">
                {post.hashtags.map(h => (
                  <span key={h} className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full">#{h}</span>
                ))}
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex gap-3">
              <button
                onClick={handleCopy}
                className="flex-1 bg-[#1B3A6B] text-white py-3 rounded-xl font-semibold hover:bg-[#16305a] transition"
              >
                {copied ? '✓ 복사됐어요!' : '네이버 블로그용으로 복사'}
              </button>
              <button
                onClick={handleGenerate}
                className="px-5 border border-[#1B3A6B] text-[#1B3A6B] py-3 rounded-xl font-semibold hover:bg-blue-50 transition"
              >
                재생성
              </button>
            </div>

          </div>
        )}
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
