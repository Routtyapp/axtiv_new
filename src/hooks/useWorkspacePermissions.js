import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

/**
 * 간단한 워크스페이스 권한 체크 훅
 * 워크스페이스 멤버인지만 확인하여 모든 기본 권한 부여
 */
export const useWorkspacePermissions = (workspaceId) => {
    const { user } = useAuth()
    const [isMember, setIsMember] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user?.id && workspaceId) {
            checkMembership()
        } else {
            setIsMember(false)
            setLoading(false)
        }
    }, [user?.id, workspaceId])

    const checkMembership = async () => {
        try {
            const { data, error } = await supabase
                .from('workspace_members')
                .select('id')
                .eq('workspace_id', workspaceId)
                .eq('user_id', user.id)
                .single()

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('Error checking workspace membership:', error)
                setIsMember(false)
            } else {
                setIsMember(!!data)
            }
        } catch (error) {
            console.error('Error checking workspace membership:', error)
            setIsMember(false)
        } finally {
            setLoading(false)
        }
    }

    return {
        // 모든 권한은 워크스페이스 멤버 여부에만 의존
        canCreateRoom: isMember,      // 워크스페이스 멤버면 채팅방 생성 가능
        canInviteUsers: isMember,     // 워크스페이스 멤버면 유저 초대 가능
        canSendMessages: isMember,    // 워크스페이스 멤버면 메시지 전송 가능
        canViewRooms: isMember,       // 워크스페이스 멤버면 채팅방 목록 보기 가능
        isMember,                     // 원본 멤버 여부
        loading                       // 권한 확인 로딩 상태
    }
}

export default useWorkspacePermissions