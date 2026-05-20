import { readFile } from 'fs/promises'
import path from 'path'
import { BrandingResult } from '@/types/branding'

async function fetchUnsplashImages(clinicType: string): Promise<string[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY
  const queries: Record<string, string> = {
    '치과': 'dental clinic modern interior warm',
    '피부과': 'aesthetic clinic luxury interior warm',
    '한의원': 'korean traditional medicine calm interior',
    '내과': 'medical clinic clean interior light',
    '소아과': 'pediatric clinic bright friendly',
    '약국': 'pharmacy modern interior clean',
  }
  const q = queries[clinicType] ?? 'medical clinic modern interior warm'
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=6&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${key}` } }
    )
    const data = await res.json()
    return data.results?.map((r: any) => r.urls.regular) ?? []
  } catch {
    return []
  }
}

function makeServiceCards(directions: string[]): string {
  return directions.slice(0, 3).map((dir, i) => `
    <div class="service-card">
      <p class="service-num">0${i + 1}</p>
      <p class="service-name">${dir}</p>
      <p class="service-desc">환자 한 분 한 분의 상황에 맞게 안내드립니다.</p>
      <div class="service-line"></div>
    </div>`).join('')
}

function makePromiseItems(neverDo: string[]): string {
  return neverDo.slice(0, 3).map((item, i) => `
    <div class="promise-item fade">
      <p class="promise-item-num">0${i + 1}</p>
      <p class="promise-item-title">${item}</p>
      <p class="promise-item-desc">저희 병원이 환자분께 드리는 약속입니다.</p>
    </div>`).join('')
}

export async function POST(req: Request): Promise<Response> {
  try {
    const branding: BrandingResult = await req.json()
    const images = await fetchUnsplashImages(branding.clinic_type)

    const templatePath = path.join(process.cwd(), 'public', 'hospital-template.html')
    let html = await readFile(templatePath, 'utf-8')

    html = html
      .replaceAll('{{CLINIC_NAME}}', branding.clinic_name ?? branding.clinic_type)
      .replaceAll('{{CLINIC_TYPE}}', branding.clinic_type)
      .replaceAll('{{LOCATION}}', branding.location)
      .replaceAll('{{ONE_LINE}}', branding.one_line)
      .replaceAll('{{TARGET_PATIENT}}', branding.target_patient)
      .replaceAll('{{DOCTOR_MOTIVATION}}', branding.doctor_motivation)
      .replaceAll('{{ABOUT_TITLE}}', branding.one_line)
      .replaceAll('{{HERO_IMAGE}}', images[0] ?? '')
      .replaceAll('{{INTRO_IMAGE}}', images[1] ?? '')
      .replaceAll('{{SERVICE_CARDS}}', makeServiceCards(branding.content_directions))
      .replaceAll('{{PROMISE_ITEMS}}', makePromiseItems(branding.never_do))
      .replaceAll('{{CTA_TITLE}}', '지금 바로 상담하세요')
      .replaceAll('{{CTA_SUB}}', branding.future_reputation)
      .replaceAll('{{PHONE}}', '000-0000-0000')

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  } catch (e) {
    console.error('[agent2/generate]', e)
    return Response.json({ ok: false }, { status: 500 })
  }
}
