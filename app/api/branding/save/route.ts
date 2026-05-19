import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { BrandingResult, SaveBrandingResponse } from '@/types/branding'

export async function POST(req: Request): Promise<Response> {
  try {
    const result: BrandingResult = await req.json()

    if (!result.clinic_id) {
      const now = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      result.clinic_id = `clinic_${now}_${Math.random().toString(36).slice(2, 7)}`
    }
    result.generated_at = new Date().toISOString()

    const dir = path.join(process.cwd(), 'data', 'clinics')
    await mkdir(dir, { recursive: true })

    const filePath = path.join(dir, `${result.clinic_id}.json`)
    await writeFile(filePath, JSON.stringify(result, null, 2), 'utf-8')

    const response: SaveBrandingResponse = { ok: true, clinic_id: result.clinic_id }
    return Response.json(response)
  } catch (e) {
    console.error('[branding/save]', e)
    return Response.json({ ok: false, clinic_id: '' }, { status: 500 })
  }
}
