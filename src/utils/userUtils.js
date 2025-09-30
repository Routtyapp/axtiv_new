import { isValidUser, normalizeUser, USER_ROLES, USER_PERMISSIONS } from '../types/user.types'

/**
 * 사용자 ID 반환 (표준화된 접근 방법)
 * @param {Object} user - 사용자 객체
 * @returns {string|null} 사용자 UUID
 */
export const getUserId = (user) => {
  if (!isValidUser(user)) return null
  return user.id
}

/**
 * 사용자 이메일 반환
 * @param {Object} user - 사용자 객체
 * @returns {string|null} 사용자 이메일
 */
export const getUserEmail = (user) => {
  if (!isValidUser(user)) return null
  return user.email
}

/**
 * 사용자 표시 이름 반환
 * @param {Object} user - 사용자 객체
 * @returns {string} 사용자 표시 이름
 */
export const getUserDisplayName = (user) => {
  if (!isValidUser(user)) return 'Anonymous'

  if (user.user_metadata?.full_name) {
    return user.user_metadata.full_name
  }

  if (user.email) {
    return user.email.split('@')[0]
  }

  return 'User'
}

/**
 * 사용자 아바타 URL 반환
 * @param {Object} user - 사용자 객체
 * @returns {string|null} 아바타 URL
 */
export const getUserAvatarUrl = (user) => {
  if (!isValidUser(user)) return null
  return user.user_metadata?.avatar_url || null
}

/**
 * 사용자 역할 반환
 * @param {Object} user - 사용자 객체
 * @returns {string} 사용자 역할
 */
export const getUserRole = (user) => {
  if (!isValidUser(user)) return USER_ROLES.USER
  return user.app_metadata?.role || user.user_metadata?.role || USER_ROLES.USER
}

/**
 * 사용자 권한 목록 반환
 * @param {Object} user - 사용자 객체
 * @returns {string[]} 사용자 권한 목록
 */
export const getUserPermissions = (user) => {
  if (!isValidUser(user)) return []
  return user.app_metadata?.permissions || user.user_metadata?.permissions || []
}

/**
 * 사용자 권한 확인
 * @param {Object} user - 사용자 객체
 * @param {string} permission - 확인할 권한
 * @returns {boolean} 권한 보유 여부
 */
export const hasPermission = (user, permission) => {
  const permissions = getUserPermissions(user)
  return permissions.includes(permission)
}

/**
 * 사용자 역할 확인
 * @param {Object} user - 사용자 객체
 * @param {string} role - 확인할 역할
 * @returns {boolean} 역할 일치 여부
 */
export const hasRole = (user, role) => {
  const userRole = getUserRole(user)
  return userRole === role
}

/**
 * 관리자 여부 확인
 * @param {Object} user - 사용자 객체
 * @returns {boolean} 관리자 여부
 */
export const isAdmin = (user) => {
  return hasRole(user, USER_ROLES.ADMIN)
}

/**
 * 현재 사용자 여부 확인
 * @param {Object} user - 사용자 객체
 * @param {string} currentUserId - 현재 사용자 ID
 * @returns {boolean} 현재 사용자 여부
 */
export const isCurrentUser = (user, currentUserId) => {
  const userId = getUserId(user)
  return userId === currentUserId
}

/**
 * 사용자 객체 비교
 * @param {Object} user1 - 첫 번째 사용자
 * @param {Object} user2 - 두 번째 사용자
 * @returns {boolean} 동일 사용자 여부
 */
export const isSameUser = (user1, user2) => {
  const id1 = getUserId(user1)
  const id2 = getUserId(user2)
  return id1 && id2 && id1 === id2
}

/**
 * 사용자 이니셜 반환 (아바타 fallback용)
 * @param {Object} user - 사용자 객체
 * @returns {string} 사용자 이니셜
 */
export const getUserInitials = (user) => {
  const displayName = getUserDisplayName(user)
  return displayName.charAt(0).toUpperCase()
}

/**
 * 워크스페이스 소유자 여부 확인
 * @param {Object} user - 사용자 객체
 * @param {Object} workspace - 워크스페이스 객체
 * @returns {boolean} 소유자 여부
 */
export const isWorkspaceOwner = (user, workspace) => {
  const userId = getUserId(user)
  return userId && workspace?.created_by === userId
}

/**
 * 미팅 호스트 여부 확인
 * @param {Object} user - 사용자 객체
 * @param {Object} meeting - 미팅 객체
 * @returns {boolean} 호스트 여부
 */
export const isMeetingHost = (user, meeting) => {
  const userId = getUserId(user)
  if (!userId || !meeting?.meeting_participants) return false

  const participant = meeting.meeting_participants.find(
    p => p.user_id === userId && p.role === 'host'
  )
  return !!participant
}

/**
 * 레거시 호환성을 위한 함수들
 * (기존 코드에서 점진적 마이그레이션을 위해 제공)
 */

/**
 * @deprecated getUserId 사용 권장
 */
export const getAuthId = getUserId

/**
 * @deprecated getUserEmail 사용 권장
 */
export const getUserEmailAddress = getUserEmail

/**
 * @deprecated getUserDisplayName 사용 권장
 */
export const getUserName = getUserDisplayName