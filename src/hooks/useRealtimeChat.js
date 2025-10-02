import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Axi (AI Assistant) 사용자 ID (환경 변수에서 로드)
const AI_ASSISTANT_AUTH_ID = import.meta.env.VITE_AI_ASSISTANT_AUTH_ID

const useRealtimeChat = (workspaceId, user, chatRoomId = null) => {
    const [messages, setMessages] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [realtimeStatus, setRealtimeStatus] = useState('disconnected')


    // 기존 메시지 로드
    const fetchMessages = async () => {
        if (!workspaceId || !chatRoomId) {
            console.log('⚠️ 워크스페이스 ID 또는 채팅방 ID 없음:', { workspaceId, chatRoomId })
            setLoading(false)
            return
        }

        try {
            const { data, error } = await supabase
                .from('chat_messages')
                .select(`
                    *,
                    chat_files (
                        id,
                        file_name,
                        file_type,
                        file_size,
                        storage_url
                    ),
                    users!chat_messages_sender_id_fkey (
                        profile_image_url
                    )
                `)
                .eq('chat_room_id', chatRoomId)
                .order('created_at', { ascending: true })

            if (error) {
                console.error('Error fetching messages:', error)
                setError(error.message)
                return
            }

            // 메시지에 파일 정보와 프로필 이미지를 변환
            const messagesWithFiles = (data || []).map(message => ({
                ...message,
                files: message.chat_files || [],
                sender_profile_image: message.users?.profile_image_url || null
            }))

            setMessages(messagesWithFiles)
        } catch (err) {
            console.error('Error:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // 워크스페이스 멤버 확인 및 자동 추가
    const ensureWorkspaceMember = async () => {
        if (!workspaceId || !user?.auth_id) return

        try {
            console.log('🔍 사용자 워크스페이스 멤버 확인:', { workspaceId, userId: user.auth_id })

            // 이미 멤버인지 확인
            const { data: existingMember } = await supabase
                .from('workspace_members')
                .select('*')
                .eq('workspace_id', workspaceId)
                .eq('user_id', user.auth_id)
                .single()

            if (!existingMember) {
                console.log('➕ 새 워크스페이스 멤버 추가')
                // 멤버로 추가
                const { error } = await supabase
                    .from('workspace_members')
                    .insert({
                        workspace_id: workspaceId,
                        user_id: user.auth_id,
                        role: 'member',
                        is_online: true
                    })

                if (error) {
                    console.error('❌ 워크스페이스 멤버 추가 오류:', error)
                } else {
                    console.log('✅ 워크스페이스 멤버 추가 성공')
                }
            } else {
                console.log('🔄 기존 멤버 온라인 상태 업데이트')
                // 온라인 상태로 업데이트
                const { error } = await supabase
                    .from('workspace_members')
                    .update({
                        is_online: true,
                        last_seen: new Date().toISOString()
                    })
                    .eq('id', existingMember.id)

                if (error) {
                    console.error('❌ 온라인 상태 업데이트 오류:', error)
                } else {
                    console.log('✅ 온라인 상태 업데이트 성공')
                }
            }
        } catch (err) {
            console.error('❌ 워크스페이스 멤버 처리 오류:', err)
        }
    }


    // 메시지 전송
    const sendMessage = async (content, messageType = 'user', files = []) => {
        const hasContent = content && content.trim()
        const hasFiles = files && files.length > 0

        if ((!hasContent && !hasFiles) || !workspaceId || !chatRoomId) return

        // AI 메시지인 경우 user 체크 생략
        if (messageType !== 'ai' && !user?.auth_id) return

        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        // AI 메시지의 경우 sender 정보를 다르게 설정
        const senderInfo = messageType === 'ai'
            ? { sender_id: AI_ASSISTANT_AUTH_ID, sender_name: 'Axi' }
            : { sender_id: user.auth_id, sender_name: user.email?.split('@')[0] || user.user_metadata?.full_name || 'Anonymous' }

        const optimisticMessage = {
            id: tempId,
            workspace_id: workspaceId,
            chat_room_id: chatRoomId,
            ...senderInfo,
            content: hasContent ? content.trim() : null,
            message_type: messageType,
            has_files: hasFiles,
            files: files,
            created_at: new Date().toISOString(),
            _isOptimistic: true
        }

        try {
            console.log('📤 메시지 전송 시도:', { content, workspaceId, senderId: user.auth_id })

            // Optimistic Update - 즉시 UI에 메시지 표시
            setMessages(prev => [...prev, optimisticMessage])

            const messageData = {
                workspace_id: workspaceId,
                chat_room_id: chatRoomId,
                sender_id: senderInfo.sender_id,
                sender_name: senderInfo.sender_name,
                content: hasContent ? content.trim() : null,
                message_type: messageType,
                has_files: hasFiles
            }

            const { data, error } = await supabase
                .from('chat_messages')
                .insert(messageData)
                .select()

            if (error) {
                console.error('❌ 메시지 전송 오류:', error)
                // 전송 실패 시 optimistic 메시지 제거
                setMessages(prev => prev.filter(msg => msg.id !== tempId))
                setError(error.message)
            } else {
                console.log('✅ 메시지 전송 성공:', data)

                // 성공 시 optimistic 메시지를 실제 메시지로 교체
                setMessages(prev => prev.map(msg =>
                    msg.id === tempId ? { ...data[0], files: files, _isOptimistic: false } : msg
                ))

            }
        } catch (err) {
            console.error('❌ 메시지 전송 에러:', err)
            // 전송 실패 시 optimistic 메시지 제거
            setMessages(prev => prev.filter(msg => msg.id !== tempId))
            setError(err.message)
        }
    }

    // 채팅방 읽음 처리
    const markRoomAsRead = async () => {
        if (!chatRoomId || !user?.auth_id) return

        try {
            console.log('✅ 채팅방 읽음 처리:', { chatRoomId, userId: user.auth_id })

            const { error } = await supabase
                .from('chat_read_status')
                .upsert({
                    chat_room_id: chatRoomId,
                    user_id: user.auth_id,
                    last_read_at: new Date().toISOString()
                }, {
                    onConflict: 'chat_room_id,user_id'
                })

            if (error) {
                console.error('❌ 읽음 처리 오류:', error)
            } else {
                console.log('✅ 읽음 처리 완료')
            }
        } catch (err) {
            console.error('❌ 읽음 처리 에러:', err)
        }
    }

    // 오프라인 상태로 업데이트
    const updateOfflineStatus = async () => {
        if (!workspaceId || !user?.auth_id) return

        try {
            console.log('📴 오프라인 상태 업데이트')
            await supabase
                .from('workspace_members')
                .update({
                    is_online: false,
                    last_seen: new Date().toISOString()
                })
                .eq('workspace_id', workspaceId)
                .eq('user_id', user.auth_id)
        } catch (err) {
            console.error('❌ 오프라인 상태 업데이트 오류:', err)
        }
    }

    // 새 메시지 처리
    const handleNewMessage = (payload) => {
        console.log('📨 새 메시지 수신:', payload)
        if (payload.eventType === 'INSERT') {
            setMessages(prev => {
                // 이미 optimistic update로 추가된 메시지인지 확인
                const optimisticIndex = prev.findIndex(msg =>
                    msg._isOptimistic &&
                    msg.sender_id === payload.new.sender_id &&
                    msg.content === payload.new.content
                )

                if (optimisticIndex !== -1) {
                    // optimistic 메시지를 실제 메시지로 교체
                    console.log('🔄 Optimistic 메시지를 실제 메시지로 교체:', payload.new.id)
                    const newMessages = [...prev]
                    newMessages[optimisticIndex] = { ...payload.new, _isOptimistic: false }
                    return newMessages
                }

                // 중복 방지 (같은 ID의 메시지가 이미 있는 경우)
                const isDuplicate = prev.some(msg => msg.id === payload.new.id)
                if (isDuplicate) {
                    console.log('🔄 중복 메시지 무시:', payload.new.id)
                    return prev
                }

                // 새 메시지 추가
                console.log('✅ 새 메시지 추가:', payload.new)
                return [...prev, payload.new]
            })
        }
    }


    useEffect(() => {
        if (!workspaceId || !user?.auth_id || !chatRoomId) {
            console.log('⚠️ 필수 정보 없음:', { workspaceId, userId: user?.auth_id, chatRoomId })
            setLoading(false)
            return
        }

        console.log('🚀 채팅 초기화 시작:', { workspaceId, userId: user.auth_id, chatRoomId })

        // 초기 데이터 로드
        const initializeChat = async () => {
            setLoading(true)
            setRealtimeStatus('connecting')

            await ensureWorkspaceMember()
            await fetchMessages()
            await markRoomAsRead()

            setLoading(false)
        }

        initializeChat()

        // Realtime 구독 설정
        const channelName = `chat_room_${chatRoomId}`
        console.log('📡 Realtime 채널 구독 시작:', channelName)

        const channel = supabase
            .channel(channelName)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `chat_room_id=eq.${chatRoomId}`
            }, handleNewMessage)
            .subscribe((status, err) => {
                console.log('📡 Realtime 구독 상태:', status, err)
                setRealtimeStatus(status)
                if (err) {
                    console.error('❌ Realtime 구독 오류:', err)
                    setError(`Realtime 연결 오류: ${err.message}`)
                }
            })

        // 페이지 떠날 때 오프라인 처리
        const handleBeforeUnload = () => {
            updateOfflineStatus()
        }

        window.addEventListener('beforeunload', handleBeforeUnload)

        return () => {
            console.log('🔌 채팅 정리 및 연결 해제')
            updateOfflineStatus()
            supabase.removeChannel(channel)
            window.removeEventListener('beforeunload', handleBeforeUnload)
            setRealtimeStatus('disconnected')
        }
    }, [workspaceId, user?.auth_id, chatRoomId])

    return {
        messages,
        loading,
        error,
        sendMessage,
        markRoomAsRead,
        realtimeStatus
    }
}

export default useRealtimeChat