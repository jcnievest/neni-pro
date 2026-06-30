import { createClient } from '@supabase/supabase-js'

const fallbackSupabaseUrl = 'https://hmmadpkiwrjazhpilftf.supabase.co'
const fallbackSupabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbWFkcGtpd3JqYXpocGlsZnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5Mzg3NjAsImV4cCI6MjA5NjUxNDc2MH0.gioedQnoexmchsDHlXA-2Lr6PuAUuUsgTO5HZwBKJFw'

function getValidSupabaseUrl(value) {
  if (!value) return fallbackSupabaseUrl

  try {
    const url = new URL(value)
    if (url.protocol === 'http:' || url.protocol === 'https:') return value
  } catch {
    // Ignore invalid environment values and keep the app renderable.
  }

  return fallbackSupabaseUrl
}

function getSupabaseKey(value) {
  if (!value || value.startsWith('your_')) return fallbackSupabaseKey
  return value
}

const supabaseUrl = getValidSupabaseUrl(import.meta.env.VITE_SUPABASE_URL)
const supabaseKey = getSupabaseKey(import.meta.env.VITE_SUPABASE_ANON_KEY)

export const supabase = createClient(supabaseUrl, supabaseKey)
