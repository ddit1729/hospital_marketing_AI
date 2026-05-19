import { readFile, readdir } from 'fs/promises'
import path from 'path'
import { BrandingResult, LoadBrandingResponse } from '@/types/branding'

export async function GET(req: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url)
    const clinic_id = searchParams.get('clinic_id')
    const dir = path.join(process.cwd(), 'data', 'clinics')

    let filePath: string

    if (clinic_id) {
      filePath = path.join(dir, `${clinic_id}.json`)
    } else {
      const files = await readdir(dir)
      const jsonFiles = files.filter(f => f.endsWith('.json')).sort()
      if (jsonFiles.length === 0) {
        return Response.json({ ok: true, data: null })
      }
      filePath = path.join(dir, jsonFiles[jsonFiles.length - 1])
    }

    const raw = await readFile(filePath, 'utf-8')
    const data: BrandingResult = JSON.parse(raw)
    return Response.json({ ok: true, data } satisfies LoadBrandingResponse)
  } catch (e) {
    console.error('[branding/load]', e)
    return Response.json({ ok: false, data: null }, { status: 500 })
  }
}
