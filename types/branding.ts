export interface BrandingResult {
  clinic_id: string
  generated_at: string
  clinic_type: string
  location: string
  one_line: string
  target_patient: string
  voice_sample: string
  never_do: string[]
  keywords: string[]
  content_directions: string[]
  doctor_motivation: string
  anti_pattern: string
  favorite_patient_type: string
  ideal_patient: string
  pain_patient: string
  future_reputation: string
  differentiation: string
}

export interface SaveBrandingResponse {
  ok: boolean
  clinic_id: string
}

export interface LoadBrandingResponse {
  ok: boolean
  data: BrandingResult | null
}
