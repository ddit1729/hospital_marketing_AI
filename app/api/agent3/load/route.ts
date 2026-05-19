import { readdir, readFile } from 'fs/promises'
import path from 'path'

export async function GET(): Promise<Response> {
  try {
    const dir = path.join(process.cwd(), 'data', 'plans')
    const files = (await readdir(dir)).filter(f => f.endsWith('.json')).sort()
    if (files.length === 0) return Response.json({ ok: true, plan: [] })
    const raw = await readFile(path.join(dir, files[files.length - 1]), 'utf-8')
    const json = JSON.parse(raw)
    return Response.json({ ok: true, plan: json.plan ?? [] })
  } catch {
    return Response.json({ ok: true, plan: [] })
  }
}
