import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nhvhujoentbvkgpanwwg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odmh1am9lbnRidmtncGFud3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2ODQyMjYsImV4cCI6MjA3NDI2MDIyNn0.Z-2fDe_M17xMbARUq3ebgpawV52pvDA0pip-kqGzTuQ'

// Supabase 클라이언트 생성 (Realtime 최적화 설정 포함)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
      heartbeatIntervalMs: 30000 // 30초로 증가하여 연결 수 절약
    },
    // 연결 수 최적화
    timeout: 20000,
    // 재연결 설정
    reconnectAfterMs: function(tries) {
      // 지수 백오프: 1초, 2초, 4초, 8초, 최대 30초
      return Math.min(1000 * Math.pow(2, tries), 30000)
    }
  },
  global: {
    headers: {
      'x-client-info': 'axtiv-web-app'
    }
  }
})