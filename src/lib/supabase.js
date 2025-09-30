import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nhvhujoentbvkgpanwwg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odmh1am9lbnRidmtncGFud3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2ODQyMjYsImV4cCI6MjA3NDI2MDIyNn0.Z-2fDe_M17xMbARUq3ebgpawV52pvDA0pip-kqGzTuQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)