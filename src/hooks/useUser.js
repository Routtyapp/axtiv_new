import { useEffect } from 'react'
import { useAuth } from './useAuth'
import userStore from '../store/userStore'
import { normalizeUser, isValidUser } from '../types/user.types'
import {
  getUserId,
  getUserEmail,
  getUserDisplayName,
  getUserAvatarUrl,
  getUserRole,
  getUserPermissions,
  hasPermission,
  hasRole,
  isAdmin,
  getUserInitials
} from '../utils/userUtils'

/**
 * 통합된 사용자 정보 제공 훅
 * AuthContext와 userStore를 동기화하고 표준화된 인터페이스 제공
 */
export const useUser = () => {
  // AuthContext에서 사용자 정보 가져오기
  const {
    user: authUser,
    session,
    loading: authLoading,
    isAuthenticated: isAuthAuthenticated,
    signOut,
    refreshSession
  } = useAuth()

  // userStore에서 사용자 정보 가져오기
  const {
    user: storeUser,
    isAuthenticated: isStoreAuthenticated,
    loading: storeLoading,
    setUser,
    login,
    logout,
    updateUserProfile
  } = userStore()

  // AuthContext와 userStore 동기화
  useEffect(() => {
    if (authUser && session) {
      const normalizedUser = normalizeUser(authUser)

      // userStore에 AuthContext의 정보 동기화
      if (JSON.stringify(storeUser) !== JSON.stringify(normalizedUser)) {
        login(session)
        setUser(normalizedUser)
      }
    } else if (!authUser && !session) {
      // 로그아웃 상태 동기화
      if (isStoreAuthenticated) {
        logout()
      }
    }
  }, [authUser, session, storeUser, isStoreAuthenticated, login, logout, setUser])

  // 현재 사용자 정보 (AuthContext 우선)
  const currentUser = authUser || storeUser
  const normalizedUser = normalizeUser(currentUser)

  // 인증 상태 (AuthContext 우선)
  const isAuthenticated = isAuthAuthenticated() || isStoreAuthenticated
  const loading = authLoading || storeLoading

  // 사용자 유틸리티 함수들
  const userUtils = {
    getId: () => getUserId(normalizedUser),
    getEmail: () => getUserEmail(normalizedUser),
    getDisplayName: () => getUserDisplayName(normalizedUser),
    getAvatarUrl: () => getUserAvatarUrl(normalizedUser),
    getRole: () => getUserRole(normalizedUser),
    getPermissions: () => getUserPermissions(normalizedUser),
    getInitials: () => getUserInitials(normalizedUser),
    hasPermission: (permission) => hasPermission(normalizedUser, permission),
    hasRole: (role) => hasRole(normalizedUser, role),
    isAdmin: () => isAdmin(normalizedUser),
    isValid: () => isValidUser(normalizedUser)
  }

  // 사용자 액션
  const userActions = {
    signOut: async () => {
      try {
        await signOut()
        logout()
      } catch (error) {
        console.error('Sign out error:', error)
        throw error
      }
    },
    updateProfile: (updates) => {
      updateUserProfile(updates)
    },
    refreshSession: () => refreshSession()
  }

  // 워크스페이스/프로젝트 관련 유틸리티
  const projectUtils = {
    isWorkspaceOwner: (workspace) => {
      const userId = userUtils.getId()
      return userId && workspace?.created_by === userId
    },
    isMeetingHost: (meeting) => {
      const userId = userUtils.getId()
      if (!userId || !meeting?.meeting_participants) return false

      const participant = meeting.meeting_participants.find(
        p => p.user_id === userId && p.role === 'host'
      )
      return !!participant
    },
    isTaskAssignee: (task) => {
      const userId = userUtils.getId()
      return task?.assigned_user_id === userId
    }
  }

  return {
    // 사용자 정보
    user: normalizedUser,
    session,
    isAuthenticated,
    loading,

    // 유틸리티 함수들
    ...userUtils,

    // 액션들
    ...userActions,

    // 프로젝트 관련 유틸리티
    ...projectUtils,

    // 레거시 호환성 (점진적 마이그레이션용)
    currentUser: normalizedUser,
    currentUserId: userUtils.getId(),

    // 원본 훅들에 대한 접근 (필요시)
    _auth: { authUser, session, authLoading },
    _store: { storeUser, isStoreAuthenticated, storeLoading }
  }
}

/**
 * 간단한 사용자 ID만 필요한 경우를 위한 경량 훅
 */
export const useUserId = () => {
  const { getId } = useUser()
  return getId()
}

/**
 * 인증 상태만 확인하는 경량 훅
 */
export const useAuthStatus = () => {
  const { isAuthenticated, loading } = useUser()
  return { isAuthenticated, loading }
}

export default useUser