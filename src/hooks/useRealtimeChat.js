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
                        role: 'member'
                    })

                if (error) {
                    console.error('❌ 워크스페이스 멤버 추가 오류:', error)
                } else {
                    console.log('✅ 워크스페이스 멤버 추가 성공')
                }
            } else {
                console.log('✅ 기존 멤버 확인 완료')
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

    // 🆕 채널 재사용 체크
    const channelName = `private:room:${chatRoomId}`
    if (channelRef.current && channelRef.current.topic === channelName && isSubscribedRef.current) {
        console.log('♻️ 기존 채널 재사용:', channelName)
        return // 이미 동일한 채널 구독 중
    }

    // 🔥 CRITICAL: 기존 채널 완전 정리 (누수 방지)
    if (channelRef.current) {
        console.log('🧹 기존 채널 완전 정리 (다른 채팅방으로 전환)')
        const oldChannel = channelRef.current

        // 1. 구독 해제 플래그 즉시 설정
        isSubscribedRef.current = false

        // 2. 초기화 중 플래그 리셋 (중복 방지)
        isInitializingRef.current = false

        // 3. 채널 레퍼런스 즉시 null 설정 (중복 생성 방지)
        channelRef.current = null

        // 4. 채널 제거 (비동기)
        supabase.removeChannel(oldChannel).then(() => {
            console.log('✅ 기존 채널 제거 완료')
        }).catch(err => {
            console.error('❌ 채널 제거 실패:', err)
        })
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

        try {
            // 🔄 인라인 코드를 함수 호출로 대체
            await ensureWorkspaceMember()  // 워크스페이스 멤버 확인
            await fetchMessages()           // 메시지 로드
            await markRoomAsRead()         // 읽음 처리
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
        console.log('📡 Realtime 채널 구독 시작:', channelName)

        const channel = supabase
            .channel(channelName, {
                config: {
                    private: true
                }
            })
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `chat_room_id=eq.${chatRoomId}`
            }, handleNewMessage) // 🔄 인라인 코드를 함수 호출로 대체
            .subscribe((status, err) => {
                console.log('📡 Realtime 구독 상태:', status, err)

                if (mountedRef.current) {
                    setRealtimeStatus(status)
                }

                if (status === 'SUBSCRIBED') {
                    isSubscribedRef.current = true
                    retryCountRef.current = 0
                    isInitializingRef.current = false
                    console.log('✅ Realtime 구독 성공')
                }

                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.error('❌ Realtime 구독 실패:', status, err)
                    isInitializingRef.current = false

                    // DatabaseLackOfConnections 에러 감지 - 재시도 중단
                    const isConnectionPoolError = err?.message?.includes('DatabaseLackOfConnections') ||
                                                 err?.message?.includes("can't accept more connections")

                    if (isConnectionPoolError) {
                        console.error('🚫 데이터베이스 연결 풀 포화 - 재시도 중단')
                        if (mountedRef.current) {
                            setError('서버 연결이 포화 상태입니다. 잠시 후 페이지를 새로고침해주세요.')
                        }
                        return
                    }

                    // 토큰 만료 감지 (401 Unauthorized)
                    const isAuthError = err?.message?.includes('401') ||
                                      err?.message?.includes('Unauthorized') ||
                                      err?.message?.includes('invalid_token')

                    if (isAuthError) {
                        console.error('🔐 토큰 만료 감지, 세션 갱신 시도')

                        supabase.auth.refreshSession().then(({ error: refreshError }) => {
                            if (refreshError) {
                                console.error('❌ 세션 갱신 실패, 재로그인 필요:', refreshError)
                                if (mountedRef.current) {
                                    setError('인증이 만료되었습니다. 다시 로그인해주세요.')
                                }
                            } else {
                                console.log('✅ 세션 갱신 성공, 재연결 시도')
                                if (channelRef.current) {
                                    supabase.removeChannel(channelRef.current)
                                    channelRef.current = null
                                    isSubscribedRef.current = false
                                }
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

                    // 일반 에러의 경우 재시도
                    if (status === 'CHANNEL_ERROR' &&
                        retryCountRef.current < MAX_RETRIES &&
                        mountedRef.current &&
                        isVisibleRef.current &&
                        !isSubscribedRef.current) {

                        retryCountRef.current += 1
                        const retryDelay = Math.min(2000 * Math.pow(2, retryCountRef.current), 15000)
                        console.log(`🔄 재시도 ${retryCountRef.current}/${MAX_RETRIES} (${retryDelay}ms 후)`)

                        setTimeout(() => {
                            if (mountedRef.current && isVisibleRef.current && !isInitializingRef.current) {
                                if (channelRef.current) {
                                    supabase.removeChannel(channelRef.current)
                                    channelRef.current = null
                                }
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

            if (channelRef.current) {
                isSubscribedRef.current = false
                supabase.removeChannel(channelRef.current)
                channelRef.current = null
                setRealtimeStatus('disconnected')
            }
        } else {
            console.log('👁️ 탭 포그라운드 복귀 - 구독 재개')
            isVisibleRef.current = true

            if (window.resubscribeTimeout) {
                clearTimeout(window.resubscribeTimeout)
            }

            window.resubscribeTimeout = setTimeout(() => {
                if (isVisibleRef.current && mountedRef.current && !channelRef.current && !isInitializingRef.current) {
                    console.log('⏱️ Debounce 완료 - 재구독 시작')
                    retryCountRef.current = 0
                    initializeChat()
                }
                window.resubscribeTimeout = null
            }, 3000)
        }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
        console.log('🔌 채팅 정리 및 연결 해제')
        mountedRef.current = false
        isVisibleRef.current = false

        if (channelRef.current) {
            console.log('🧹 Cleanup - 채널 제거')
            isSubscribedRef.current = false
            supabase.removeChannel(channelRef.current)
            channelRef.current = null
        }

        if (window.resubscribeTimeout) {
            clearTimeout(window.resubscribeTimeout)
            window.resubscribeTimeout = null
        }

        document.removeEventListener('visibilitychange', handleVisibilityChange)
        setRealtimeStatus('disconnected')
    }
}, [workspaceId, user?.user_id, chatRoomId, fetchMessages, ensureWorkspaceMember, markRoomAsRead, handleNewMessage]) // 의존성 배열에 함수들 추가

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
