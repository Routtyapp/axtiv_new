import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// AXTI (AI Assistant) 사용자 ID (환경 변수에서 로드)
const AI_ASSISTANT_AUTH_ID = import.meta.env.VITE_AI_ASSISTANT_AUTH_ID

const useRealtimeChat = (workspaceId, user, chatRoomId = null) => {
    const [messages, setMessages] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [realtimeStatus, setRealtimeStatus] = useState('disconnected')

    // 채널 및 상태 관리
    const channelRef = useRef(null)
    const isSubscribedRef = useRef(false)
    const mountedRef = useRef(true)
    const isVisibleRef = useRef(true) // Visibility API 상태 추적
    const retryCountRef = useRef(0) // 재시도 횟수
    const isInitializingRef = useRef(false) // 🆕 초기화 중 플래그
    const MAX_RETRIES = 2 // 🆕 최대 재시도 횟수 (3→2로 감소)

    // 컴포넌트 마운트 상태 추적
    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
        }
    }, [])

    // 기존 메시지 로드
    const fetchMessages = useCallback(async () => {
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

            // 메시지에 프로필 이미지를 변환
            const messagesWithFiles = (data || []).map(message => ({
                ...message,
                files: [], // chat_files 테이블 생성 후 연결 예정
                sender_profile_image: message.users?.profile_image_url || null
            }))

            if (mountedRef.current) {
                setMessages(messagesWithFiles)
            }
        } catch (err) {
            console.error('Error:', err)
            if (mountedRef.current) {
                setError(err.message)
            }
        } finally {
            if (mountedRef.current) {
                setLoading(false)
            }
        }
    }, [workspaceId, chatRoomId])

    // 워크스페이스 멤버 확인 및 자동 추가
    const ensureWorkspaceMember = useCallback(async () => {
        if (!workspaceId || !user?.user_id) return

        try {
            console.log('🔍 사용자 워크스페이스 멤버 확인:', { workspaceId, userId: user.user_id })

            // 이미 멤버인지 확인
            const { data: existingMember } = await supabase
                .from('workspace_members')
                .select('*')
                .eq('workspace_id', workspaceId)
                .eq('user_id', user.user_id)
                .single()

            if (!existingMember) {
                console.log('➕ 새 워크스페이스 멤버 추가')
                const { error } = await supabase
                    .from('workspace_members')
                    .insert({
                        workspace_id: workspaceId,
                        user_id: user.user_id,
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
    }, [workspaceId, user?.user_id])

    // 메시지 전송
    const sendMessage = useCallback(async (content, messageType = 'user', files = []) => {
        const hasContent = content && content.trim()
        const hasFiles = files && files.length > 0

        if ((!hasContent && !hasFiles) || !workspaceId || !chatRoomId) return

        // AI 메시지인 경우 user 체크 생략
        if (messageType !== 'ai' && !user?.user_id) return

        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        // AI 메시지의 경우 sender 정보를 다르게 설정
        const senderInfo = messageType === 'ai'
            ? { sender_id: AI_ASSISTANT_AUTH_ID, sender_name: 'AXTI' }
            : { sender_id: user.user_id, sender_name: user.email?.split('@')[0] || user.user_metadata?.full_name || 'Anonymous' }

        const optimisticMessage = {
            id: tempId,
            workspace_id: workspaceId,
            chat_room_id: chatRoomId,
            ...senderInfo,
            content: hasContent ? content.trim() : '',
            message_type: messageType,
            has_files: hasFiles,
            files: files,
            created_at: new Date().toISOString(),
            _isOptimistic: true
        }

        try {
            console.log('📤 메시지 전송 시도:', { content, workspaceId, senderId: user.user_id })

            // Optimistic Update
            if (mountedRef.current) {
                setMessages(prev => [...prev, optimisticMessage])
            }

            const messageData = {
                workspace_id: workspaceId,
                chat_room_id: chatRoomId,
                sender_id: senderInfo.sender_id,
                sender_name: senderInfo.sender_name,
                content: hasContent ? content.trim() : '',
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
                if (mountedRef.current) {
                    setMessages(prev => prev.filter(msg => msg.id !== tempId))
                    setError(error.message)
                }
            } else {
                console.log('✅ 메시지 전송 성공:', data)

                // 성공 시 optimistic 메시지를 실제 메시지로 교체
                if (mountedRef.current) {
                    setMessages(prev => prev.map(msg =>
                        msg.id === tempId ? { ...data[0], files: files, _isOptimistic: false } : msg
                    ))
                }
            }
        } catch (err) {
            console.error('❌ 메시지 전송 에러:', err)
            if (mountedRef.current) {
                setMessages(prev => prev.filter(msg => msg.id !== tempId))
                setError(err.message)
            }
        }
    }, [workspaceId, chatRoomId, user])

    // 채팅방 읽음 처리
    const markRoomAsRead = useCallback(async () => {
        if (!chatRoomId || !user?.user_id) return

        try {
            console.log('✅ 채팅방 읽음 처리:', { chatRoomId, userId: user.user_id })

            const { error } = await supabase
                .from('chat_read_status')
                .upsert({
                    chat_room_id: chatRoomId,
                    user_id: user.user_id,
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
    }, [chatRoomId, user?.user_id])

    // 오프라인 상태로 업데이트
    const updateOfflineStatus = useCallback(async () => {
        if (!workspaceId || !user?.user_id) return

        try {
            console.log('📴 오프라인 상태 업데이트')
            await supabase
                .from('workspace_members')
                .update({
                    is_online: false,
                    last_seen: new Date().toISOString()
                })
                .eq('workspace_id', workspaceId)
                .eq('user_id', user?.user_id)
        } catch (err) {
            console.error('❌ 오프라인 상태 업데이트 오류:', err)
        }
    }, [workspaceId, user?.user_id])

    // 새 메시지 처리
    const handleNewMessage = useCallback((payload) => {
        console.log('📨 새 메시지 수신:', payload)

        if (!mountedRef.current) return

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

                // 중복 방지
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
    }, [])

    // Realtime 구독 (의존성 최소화)
    useEffect(() => {
        if (!workspaceId || !user?.user_id || !chatRoomId) {
            console.log('⚠️ 필수 정보 없음:', { workspaceId, userId: user?.user_id, chatRoomId })
            setLoading(false)
            return
        }

        // 🆕 기존 채널 강제 정리
        if (channelRef.current) {
            console.log('🧹 기존 채널 정리 (새 구독 시작 전)')
            supabase.removeChannel(channelRef.current)
            channelRef.current = null
            isSubscribedRef.current = false
        }

        console.log('🚀 채팅 초기화 시작:', { workspaceId, userId: user?.user_id, chatRoomId })

        // 초기 데이터 로드 및 채널 구독
        const initializeChat = async () => {
            if (!workspaceId || !user?.user_id || !chatRoomId) return

            // 🆕 이미 초기화 중이면 중복 호출 방지
            if (isInitializingRef.current) {
                console.log('⚠️ 이미 초기화 중 - 중복 호출 무시')
                return
            }

            isInitializingRef.current = true
            setLoading(true)
            setRealtimeStatus('connecting')

            // 🆕 함수들을 직접 호출 (의존성 문제 해결)
            try {
                // 워크스페이스 멤버 확인
                const { data: existingMember } = await supabase
                    .from('workspace_members')
                    .select('*')
                    .eq('workspace_id', workspaceId)
                    .eq('user_id', user.user_id)
                    .single()

                if (!existingMember) {
                    await supabase.from('workspace_members').insert({
                        workspace_id: workspaceId,
                        user_id: user.user_id,
                        role: 'member',
                        is_online: true
                    })
                } else {
                    await supabase.from('workspace_members').update({
                        is_online: true,
                        last_seen: new Date().toISOString()
                    }).eq('id', existingMember.id)
                }

                // 메시지 로드
                const { data, error } = await supabase
                    .from('chat_messages')
                    .select(`*, users!chat_messages_sender_id_fkey (profile_image_url)`)
                    .eq('chat_room_id', chatRoomId)
                    .order('created_at', { ascending: true })

                if (!error && mountedRef.current) {
                    const messagesWithFiles = (data || []).map(message => ({
                        ...message,
                        files: [],
                        sender_profile_image: message.users?.profile_image_url || null
                    }))
                    setMessages(messagesWithFiles)
                }

                // 읽음 처리
                await supabase.from('chat_read_status').upsert({
                    chat_room_id: chatRoomId,
                    user_id: user.user_id,
                    last_read_at: new Date().toISOString()
                }, { onConflict: 'chat_room_id,user_id' })
            } catch (err) {
                console.error('❌ 초기화 오류:', err)
            }

            // 인증 토큰 설정 (이중 보장)
            try {
                const { data: { session } } = await supabase.auth.getSession()
                if (session?.access_token) {
                    console.log('🔐 Realtime 인증 토큰 설정 (구독 직전)')
                    supabase.realtime.setAuth(session.access_token)
                }
            } catch (err) {
                console.error('❌ 인증 토큰 설정 실패:', err)
            }

            // 채널 생성 및 구독
            const channelName = `private:room:${chatRoomId}`
            console.log('📡 Realtime 채널 구독 시작:', channelName)

            const channel = supabase
                .channel(channelName, {
                    config: {
                        presence: { key: user.user_id },
                        private: true
                    }
                })
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `chat_room_id=eq.${chatRoomId}`
                }, (payload) => {
                    // 🆕 handleNewMessage를 인라인으로 처리 (의존성 제거)
                    console.log('📨 새 메시지 수신:', payload)

                    if (!mountedRef.current) return

                    if (payload.eventType === 'INSERT') {
                        setMessages(prev => {
                            const optimisticIndex = prev.findIndex(msg =>
                                msg._isOptimistic &&
                                msg.sender_id === payload.new.sender_id &&
                                msg.content === payload.new.content
                            )

                            if (optimisticIndex !== -1) {
                                const newMessages = [...prev]
                                newMessages[optimisticIndex] = { ...payload.new, _isOptimistic: false }
                                return newMessages
                            }

                            const isDuplicate = prev.some(msg => msg.id === payload.new.id)
                            if (isDuplicate) return prev

                            return [...prev, payload.new]
                        })
                    }
                })
                .subscribe((status, err) => {
                    console.log('📡 Realtime 구독 상태:', status, err)

                    if (mountedRef.current) {
                        setRealtimeStatus(status)
                    }

                    if (status === 'SUBSCRIBED') {
                        isSubscribedRef.current = true
                        retryCountRef.current = 0 // 성공 시 재시도 카운터 리셋
                        isInitializingRef.current = false // 🆕 초기화 완료
                        console.log('✅ Realtime 구독 성공')
                    }

                    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        console.error('❌ Realtime 구독 실패:', status, err)
                        isInitializingRef.current = false // 🆕 초기화 실패 처리

                        // 🆕 DatabaseLackOfConnections 에러 감지 - 재시도 중단
                        const isConnectionPoolError = err?.message?.includes('DatabaseLackOfConnections') ||
                                                     err?.message?.includes("can't accept more connections")

                        if (isConnectionPoolError) {
                            console.error('🚫 데이터베이스 연결 풀 포화 - 재시도 중단')
                            if (mountedRef.current) {
                                setError('서버 연결이 포화 상태입니다. 잠시 후 페이지를 새로고침해주세요.')
                            }
                            return // 재시도 하지 않음
                        }

                        // 🆕 토큰 만료 감지 (401 Unauthorized)
                        const isAuthError = err?.message?.includes('401') ||
                                          err?.message?.includes('Unauthorized') ||
                                          err?.message?.includes('invalid_token')

                        if (isAuthError) {
                            console.error('🔐 토큰 만료 감지, 세션 갱신 시도')

                            // 세션 갱신 시도
                            supabase.auth.refreshSession().then(({ error: refreshError }) => {
                                if (refreshError) {
                                    console.error('❌ 세션 갱신 실패, 재로그인 필요:', refreshError)
                                    if (mountedRef.current) {
                                        setError('인증이 만료되었습니다. 다시 로그인해주세요.')
                                    }
                                } else {
                                    console.log('✅ 세션 갱신 성공, 재연결 시도')
                                    // 채널 재구독
                                    if (channelRef.current) {
                                        supabase.removeChannel(channelRef.current)
                                        channelRef.current = null
                                        isSubscribedRef.current = false
                                    }
                                    // 재시도 카운터 리셋 후 재연결
                                    retryCountRef.current = 0
                                    setTimeout(() => {
                                        if (mountedRef.current && isVisibleRef.current) {
                                            initializeChat()
                                        }
                                    }, 1000)
                                }
                            })
                            return
                        }

                        // 🆕 일반 에러의 경우 재시도 (조건 강화)
                        // CHANNEL_ERROR이고, 재시도 가능한 경우만
                        if (status === 'CHANNEL_ERROR' &&
                            retryCountRef.current < MAX_RETRIES &&
                            mountedRef.current &&
                            isVisibleRef.current &&
                            !isSubscribedRef.current) { // 한 번도 구독 성공한 적 없는 경우만

                            retryCountRef.current += 1
                            const retryDelay = Math.min(2000 * Math.pow(2, retryCountRef.current), 15000) // 🆕 딜레이 증가
                            console.log(`🔄 재시도 ${retryCountRef.current}/${MAX_RETRIES} (${retryDelay}ms 후)`)

                            setTimeout(() => {
                                if (mountedRef.current && isVisibleRef.current && !isInitializingRef.current) {
                                    // 기존 채널 정리
                                    if (channelRef.current) {
                                        supabase.removeChannel(channelRef.current)
                                        channelRef.current = null
                                    }
                                    // 재시도
                                    initializeChat()
                                }
                            }, retryDelay)
                        } else if (retryCountRef.current >= MAX_RETRIES) {
                            console.error('❌ 최대 재시도 횟수 초과, 구독 중단')
                            if (mountedRef.current) {
                                setError('Realtime 연결 실패 (최대 재시도 횟수 초과)')
                            }
                        }
                    }

                    if (err) {
                        console.error('❌ Realtime 구독 오류:', err)
                        if (mountedRef.current) {
                            setError(`Realtime 연결 오류: ${err.message}`)
                        }
                    }
                })

            channelRef.current = channel
            setLoading(false)
        }

        initializeChat()

        // Page Visibility API - 백그라운드 탭 구독 관리
        const handleVisibilityChange = () => {
            if (document.hidden) {
                console.log('👁️ 탭 백그라운드 전환 - 구독 일시 중단')
                isVisibleRef.current = false

                // 백그라운드에서 구독 해제
                if (channelRef.current) {
                    isSubscribedRef.current = false
                    supabase.removeChannel(channelRef.current)
                    channelRef.current = null
                    setRealtimeStatus('disconnected')
                }
            } else {
                console.log('👁️ 탭 포그라운드 복귀 - 구독 재개')
                isVisibleRef.current = true

                // 🆕 포그라운드 복귀 시 재구독 (딜레이 증가: 2-3초)
                setTimeout(() => {
                    if (isVisibleRef.current && mountedRef.current && !channelRef.current && !isInitializingRef.current) {
                        retryCountRef.current = 0 // 재시도 카운터 리셋
                        initializeChat()
                    }
                }, 2000 + Math.random() * 1000)
            }
        }

        // beforeunload - 오프라인 상태만 업데이트
        const handleBeforeUnload = () => {
            if (workspaceId && user?.user_id) {
                supabase.from('workspace_members').update({
                    is_online: false,
                    last_seen: new Date().toISOString()
                }).eq('workspace_id', workspaceId).eq('user_id', user.user_id)
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('beforeunload', handleBeforeUnload)

        // Cleanup
        return () => {
            console.log('🔌 채팅 정리 및 연결 해제')
            mountedRef.current = false
            isVisibleRef.current = false

            // 오프라인 상태 업데이트
            if (workspaceId && user?.user_id) {
                supabase.from('workspace_members').update({
                    is_online: false,
                    last_seen: new Date().toISOString()
                }).eq('workspace_id', workspaceId).eq('user_id', user.user_id)
            }

            if (channelRef.current) {
                console.log('🧹 Cleanup - 채널 제거')
                isSubscribedRef.current = false
                supabase.removeChannel(channelRef.current)
                channelRef.current = null
            }

            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('beforeunload', handleBeforeUnload)
            setRealtimeStatus('disconnected')
        }
    }, [workspaceId, user?.user_id, chatRoomId]) // 🆕 의존성 배열 최소화

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
