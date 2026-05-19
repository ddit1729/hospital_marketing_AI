'use client'

import { useState, useEffect } from 'react'
import { BrandingResult } from '@/types/branding'

interface Post {
  type: string
  label: string
  title: string
  body: string
  hashtags: string[]
}

export default function Agent3Page() {
  const [branding, setBranding] = useState<BrandingResult | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/branding/load')
      .then(r => r.json())
      .then(d => { if (d.ok && d.data) setBranding(d.data) })
  }, [])

  async function handleGenerate() {
    setLoading(true)
    setError('')
    setPosts([])
    try {
      const res = await fetch('/api/agent3/generate', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setPosts(data.posts)
        setActiveTab(0)
      } else {
        setError('생성 중 오류가 발생했어요. 다시 시도해주세요.')
      }
    } catch {
      setError('네트워크 오류가 발생했어요.')
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    const post = posts[activeTab]
    if (!post) return
    const text = `${post.title}\n\n${post.body}\n\n${post.hashtags.map(h => `#${h}`).join(' ')}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#1B3A6B]">블로그 글 자동 생성</h1>
            <p className="text-gray-500 mt-1 text-sm">브랜딩 결과를 기반으로 네이버 블로그 글 3개를 생성합니다.</p>
          </div>
          <div className="flex gap-2">
            <a href="/" className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-100 transition-colors">
              브랜딩
            </a>
            <a href="/agent2" className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-100 transition-colors">
              홈페이지
            </a>
          </div>
        </div>

        {/* 브랜딩 요약 카드 */}
        {branding && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
            <p className="text-xs text-gray-400 mb-2">불러온 브랜딩 데이터</p>
            <p className="font-semibold text-[#1B3A6B] text-lg mb-1">{branding.one_line}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">{branding.location} · {branding.clinic_type}</span>
              <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">타겟: {branding.target_patient}</span>
              {branding.keywords.slice(0, 3).map(k => (
                <span key={k} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">#{k}</span>
              ))}
            </div>
          </div>
        )}

        {!branding && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-sm text-yellow-700">
            브랜딩 데이터가 없어요. Agent 1을 먼저 완료해주세요.
          </div>
        )}

        {/* 생성 버튼 */}
        <button
          onClick={handleGenerate}
          disabled={loading || !branding}
          className="w-full bg-[#1B3A6B] text-white py-3 rounded-xl font-semibold text-base
            hover:bg-[#16305a] disabled:opacity-40 disabled:cursor-not-allowed transition mb-6"
        >
          {loading ? '글 생성 중... (약 20~30초 소요)' : '블로그 글 3개 생성하기'}
        </button>

        {error && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}

        {/* 탭 + 결과 */}
        {posts.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {/* 탭 */}
            <div className="flex border-b border-gray-200">
              {posts.map((post, i) => (
                <button
                  key={post.type}
                  onClick={() => setActiveTab(i)}
                  className={`flex-1 py-3 text-sm font-medium transition
                    ${activeTab === i
                      ? 'text-[#1B3A6B] border-b-2 border-[#1B3A6B] bg-white'
                      : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                  {post.label}
                </button>
              ))}
            </div>

            {/* 본문 */}
            <div className="p-6">
              <p className="text-xs text-gray-400 mb-1">제목</p>
              <p className="text-[#1B3A6B] font-bold text-lg mb-4 leading-snug">
                {posts[activeTab].title}
              </p>

              <p className="text-xs text-gray-400 mb-1">본문</p>
              <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap mb-4 max-h-96 overflow-y-auto border border-gray-100 rounded-lg p-3">
                {posts[activeTab].body}
              </div>

              <p className="text-xs text-gray-400 mb-1">해시태그</p>
              <div className="flex flex-wrap gap-1 mb-6">
                {posts[activeTab].hashtags.map(h => (
                  <span key={h} className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full">#{h}</span>
                ))}
              </div>

              <button
                onClick={handleCopy}
                className="w-full border border-[#1B3A6B] text-[#1B3A6B] py-2.5 rounded-lg text-sm font-medium
                  hover:bg-blue-50 transition"
              >
                {copied ? '✓ 복사됐어요!' : '네이버 블로그에 붙여넣기용으로 복사'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
