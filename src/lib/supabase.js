import { createClient } from '@supabase/supabase-js'

/**
 * Supabase 클라이언트 싱글톤 인스턴스
 * ⚠️ 전역으로 단 하나의 인스턴스만 생성됩니다
 * @type {import('@supabase/supabase-js').SupabaseClient | null}
 */
let supabaseInstance = null

/**
 * Supabase 클라이언트 인스턴스를 반환합니다
 * 이미 생성된 경우 기존 인스턴스를 반환하고, 없으면 새로 생성합니다
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export const getSupabase = () => {
  if (supabaseInstance) {
    return supabaseInstance
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('❌ VITE_SUPABASE_URL 및 VITE_SUPABASE_ANON_KEY 환경 변수가 필요합니다')
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
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
    // ✅ 연결 풀 최적화
    timeout: 20000,
    // ✅ 재연결 설정 - 백오프 증가로 연결 폭증 방지
    reconnectAfterMs: function(tries) {
      // 지수 백오프: 2초, 4초, 8초, 16초, 최대 60초
      return Math.min(2000 * Math.pow(2, tries), 60000)
    }
  },
  global: {
    headers: {
      'x-client-info': 'axtiv-web-app',
      // ✅ Keep-Alive 헤더 추가로 연결 재사용
      'Connection': 'keep-alive'
    }
  }
  })

  console.log('✅ Supabase 클라이언트 생성됨 (전역 싱글톤)')
  return supabaseInstance
}

/**
 * 기본 export - 즉시 초기화된 Supabase 클라이언트
 * 모든 컴포넌트에서 이 인스턴스를 사용하세요
 */
export const supabase = getSupabase()