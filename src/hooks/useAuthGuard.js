import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../contexts/AuthContext'

export const useAuthGuard = (redirectTo = '/login') => {
  const { isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !isAuthenticated()) {
      navigate(redirectTo, { replace: true })
    }
  }, [isAuthenticated, loading, navigate, redirectTo])

  return { isAuthenticated: isAuthenticated(), loading }
}

export const useRequireAuth = () => {
  const { user, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !isAuthenticated()) {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, loading, navigate])

  return { user, isAuthenticated: isAuthenticated(), loading }
}