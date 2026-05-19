'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BrandingResult } from '@/types/branding'

interface PlanItem {
  index: number
  week: number
  day: string
  type: string
  keyword: string
  title_candidates: string[]
  hook: string
  seo_keywords: string[]
}

const TYPE_COLOR: Record<string, string> = {
  '정보형': 'bg-blue-100 text-blue-700',
  '케이스형': 'bg-green-100 text-green-700',
  '스토리형': 'bg-purple-100 text-purple-700',
}

export default function Agent3Page() {
  const router = useRouter()
  const [branding, setBranding] = useState<BrandingResult | null>(null)
  const [plan, setPlan] = useState<PlanItem[]>([])
  const [activeTab, setActiveTab] = useState<'calendar' | 'pool'>('calendar')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/branding/load')
      .then(r => r.json())
      .then(d => { if (d.ok && d.data) setBranding(d.data) })
  }, [])

  async function handleGenerate() {
    setLoading(true)
    setError('')
    setPlan([])
    try {
      const res = await fetch('/api/agent3/plan', { method: 'POST' })
      const data = await res.json()
      if (data.ok) setPlan(data.plan)
      else setError('기획 생성 중 오류가 발생했어요. 다시 시도해주세요.')
    } catch {
      setError('네트워크 오류가 발생했어요.')
    } finally {
      setLoading(false)
    }
  }

  const mainPlan = plan.filter(p => p.week <= 4)
  const sparePlan = plan.filter(p => p.week === 5)

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#1B3A6B]">블로그 콘텐츠 기획</h1>
            <p className="text-gray-500 mt-1 text-sm">브랜딩 데이터 기반 4주 발행 캘린더를 자동 생성합니다. 주 3건 기준.</p>
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

        {branding ? (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
            <p className="text-xs text-gray-400 mb-1">브랜딩 기반</p>
            <p className="font-semibold text-[#1B3A6B]">{branding.one_line}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">
                {branding.location} · {branding.clinic_type}
              </span>
              {branding.keywords.slice(0, 3).map(k => (
                <span key={k} className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full">#{k}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-sm text-yellow-700">
            브랜딩 데이터가 없어요. Agent 1을 먼저 완료해주세요.
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading || !branding}
          className="w-full bg-[#1B3A6B] text-white py-3 rounded-xl font-semibold
            hover:bg-[#16305a] disabled:opacity-40 disabled:cursor-not-allowed transition mb-6"
        >
          {loading ? '4주 기획 생성 중... (약 20~30초)' : '4주 블로그 기획 생성하기'}
        </button>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {plan.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex border-b border-gray-200">
              {(['calendar', 'pool'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-sm font-medium transition
                    ${activeTab === tab
                      ? 'text-[#1B3A6B] border-b-2 border-[#1B3A6B]'
                      : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {tab === 'calendar' ? '📅 4주 캘린더' : `📝 글감 풀 전체 (${plan.length}건)`}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === 'calendar' && (
                <div className="space-y-8">
                  {[1, 2, 3, 4].map(week => (
                    <div key={week}>
                      <h3 className="text-sm font-bold text-[#1B3A6B] mb-3">{week}주차</h3>
                      <div className="space-y-3">
                        {mainPlan.filter(p => p.week === week).map(item => (
                          <div key={item.index}
                            className="border border-gray-100 rounded-lg p-4 hover:border-[#1B3A6B] transition">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs text-gray-400">{item.day}요일</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[item.type] ?? 'bg-gray-100 text-gray-600'}`}>
                                {item.type}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-gray-800 mb-1">{item.title_candidates[0]}</p>
                            <p className="text-xs text-gray-400 mb-2">대안 제목: {item.title_candidates[1]}</p>
                            <p className="text-xs text-gray-500 italic mb-3">"{item.hook}"</p>
                            <div className="flex items-center justify-between">
                              <div className="flex flex-wrap gap-1">
                                {item.seo_keywords.map(k => (
                                  <span key={k} className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">#{k}</span>
                                ))}
                              </div>
                              <button
                                onClick={() => router.push(`/agent4?index=${item.index}`)}
                                className="text-xs text-[#1B3A6B] border border-[#1B3A6B] px-3 py-1.5 rounded-lg hover:bg-blue-50 transition whitespace-nowrap ml-3"
                              >
                                글 생성 →
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'pool' && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-400 mb-4">
                    메인 {mainPlan.length}건 + 여유 {sparePlan.length}건 = 총 {plan.length}건
                  </p>
                  {plan.map(item => (
                    <div key={item.index}
                      className={`border rounded-lg p-4 hover:border-[#1B3A6B] transition
                        ${item.week === 5 ? 'border-dashed border-gray-200 bg-gray-50' : 'border-gray-100'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">
                            {item.week <= 4 ? `${item.week}주차 ${item.day}` : '여유분'}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[item.type] ?? 'bg-gray-100 text-gray-600'}`}>
                            {item.type}
                          </span>
                        </div>
                        <button
                          onClick={() => router.push(`/agent4?index=${item.index}`)}
                          className="text-xs text-[#1B3A6B] border border-[#1B3A6B] px-3 py-1 rounded-lg hover:bg-blue-50 transition whitespace-nowrap"
                        >
                          글 생성 →
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-gray-800">{item.title_candidates[0]}</p>
                      <p className="text-xs text-gray-500 italic mt-1">"{item.hook}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
