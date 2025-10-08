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
      eventsPerSecond: 1, // 이벤트 수를 최소로 제한
      heartbeatIntervalMs: 300000 // 5분으로 증가하여 연결 부하 최소화
    },
    // ✅ 연결 풀 최적화 및 연결 수 제한 (극도로 보수적)
    timeout: 120000, // 타임아웃을 2분으로 설정
    // ✅ 재연결 설정 - 백오프 증가로 연결 폭증 방지
    reconnectAfterMs: function(tries) {
      // 지수 백오프: 30초, 60초, 120초, 240초, 최대 600초
      return Math.min(30000 * Math.pow(2, tries), 600000)
    },
    // ✅ 연결 수 제한 및 풀링 최적화 (극도로 보수적)
    maxConnections: 1, // 최대 동시 연결 수를 1개로 제한
    connectionPool: true, // 연결 풀링 활성화
    // ✅ 추가 연결 관리 설정 (극도로 보수적)
    poolTimeout: 30000, // 연결 풀 타임아웃 30초
    idleTimeout: 1800000, // 유휴 연결 타임아웃 30분
    // ✅ 연결 품질 모니터링
    enableHeartbeat: true, // 하트비트 활성화
    heartbeatInterval: 300000 // 하트비트 간격 5분
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
  console.log('🔧 Realtime 설정:', {
    eventsPerSecond: supabaseInstance.realtime.params?.eventsPerSecond,
    heartbeatIntervalMs: supabaseInstance.realtime.params?.heartbeatIntervalMs,
    maxConnections: supabaseInstance.realtime.maxConnections,
    connectionPool: supabaseInstance.realtime.connectionPool
  })
  return supabaseInstance
}

/**
 * 기본 export - 즉시 초기화된 Supabase 클라이언트
 * 모든 컴포넌트에서 이 인스턴스를 사용하세요
 */
export const supabase = getSupabase()