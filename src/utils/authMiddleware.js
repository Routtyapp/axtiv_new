import { supabase } from '../lib/supabase'

export const validateSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      console.error('Session validation error:', error)
      return null
    }

    return session
  } catch (error) {
    console.error('Error validating session:', error)
    return null
  }
}

export const refreshAccessToken = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession()

    if (error) {
      console.error('Token refresh error:', error)
      return null
    }

    return session
  } catch (error) {
    console.error('Error refreshing token:', error)
    return null
  }
}

export const isTokenExpired = (session) => {
  if (!session || !session.expires_at) return true

  const expiresAt = new Date(session.expires_at * 1000)
  const now = new Date()
  const bufferTime = 5 * 60 * 1000 // 5분 버퍼

  return expiresAt.getTime() - now.getTime() < bufferTime
}

export const ensureValidSession = async () => {
  try {
    let session = await validateSession()

    if (!session) {
      return null
    }

    if (isTokenExpired(session)) {
      session = await refreshAccessToken()
    }

    return session
  } catch (error) {
    console.error('Error ensuring valid session:', error)
    return null
  }
}

export const hasPermission = (user, requiredRole = null, requiredPermissions = []) => {
  if (!user) return false

  if (requiredRole) {
    const userRole = user.app_metadata?.role || user.user_metadata?.role
    if (userRole !== requiredRole) return false
  }

  if (requiredPermissions.length > 0) {
    const userPermissions = user.app_metadata?.permissions || user.user_metadata?.permissions || []
    const hasAllPermissions = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    )
    if (!hasAllPermissions) return false
  }

  return true
}

export const createAuthenticatedRequest = async (requestFn) => {
  const session = await ensureValidSession()

  if (!session) {
    throw new Error('No valid session available')
  }

  return requestFn(session)
}

export const withAuth = (Component) => {
  return function AuthenticatedComponent(props) {
    // 이 HOC는 컴포넌트 내에서 useAuth를 직접 사용하는 것을 권장합니다.
    // 현재는 ProtectedRoute 컴포넌트를 사용하는 것을 권장합니다.
    return <Component {...props} />
  }
}