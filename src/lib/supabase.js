import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hmmadpkiwrjazhpilftf.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbWFkcGtpd3JqYXpocGlsZnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5Mzg3NjAsImV4cCI6MjA5NjUxNDc2MH0.gioedQnoexmchsDHlXA-2Lr6PuAUuUsgTO5HZwBKJFw'

export const supabase = createClient(supabaseUrl, supabaseKey)
