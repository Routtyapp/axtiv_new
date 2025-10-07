/**
 * 사용자 관련 타입 정의
 * Supabase Auth 사용자 객체 표준화
 */

/**
 * 표준화된 사용자 객체 구조
 * @typedef {Object} StandardUser
 * @property {string} id - Supabase auth UUID (primary identifier)
 * @property {string} email - 사용자 이메일
 * @property {Object} user_metadata - 사용자 메타데이터
 * @property {string} [user_metadata.full_name] - 사용자 전체 이름
 * @property {string} [user_metadata.avatar_url] - 프로필 이미지 URL
 * @property {Object} [app_metadata] - 앱 메타데이터
 * @property {string} [app_metadata.role] - 사용자 역할
 * @property {string[]} [app_metadata.permissions] - 사용자 권한
 * @property {string} created_at - 생성 시간
 * @property {string} user_id - DB users 테이블 FK 컬럼명 (= id)
 */

/**
 * 사용자 역할 상수
 */
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  MANAGER: 'manager'
}

/**
 * 사용자 권한 상수
 */
export const USER_PERMISSIONS = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  MANAGE: 'manage'
}

/**
 * 사용자 객체 검증
 * @param {*} user - 검증할 사용자 객체
 * @returns {boolean} 유효한 사용자 객체 여부
 */
export const isValidUser = (user) => {
  return user && typeof user === 'object' && typeof user.id === 'string' && user.id.length > 0
}

/**
 * 사용자 객체 정규화
 * @param {Object} rawUser - 원본 사용자 객체
 * @returns {StandardUser} 정규화된 사용자 객체
 */
export const normalizeUser = (rawUser) => {
  if (!rawUser) return null

  return {
    id: rawUser.id,
    email: rawUser.email,
    user_metadata: rawUser.user_metadata || {},
    app_metadata: rawUser.app_metadata || {},
    created_at: rawUser.created_at,
    user_id: rawUser.id // DB users 테이블의 FK 컬럼명
  }
}