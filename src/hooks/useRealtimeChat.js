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
    const mountedRef = useRef(true)
    const retryTimeoutRef = useRef(null) // 타이머 관리
    const cleanupPromiseRef = useRef(null) // 정리 작업 Promise 추적
    const MAX_RETRIES = 2

    // 컴포넌트 마운트 상태 추적
    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
        }
    }, [])

    // 메시지 전송 (의존성 최소화를 위해 useCallback 유지)
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
            console.log('📤 메시지 전송 시도:', { content, workspaceId, senderId: senderInfo.sender_id })

            // Optimistic Update
            setMessages(prev => [...prev, optimisticMessage])

            const messageData = {
                workspace_id: workspaceId,
                chat_room_id: chatRoomId,
                sender_id: senderInfo.sender_id,
                sender_name: senderInfo.sender_name,
                content: hasContent ? content.trim() : '',
                message_type: messageType,
                has_files: hasFiles,
                metadata: { tempId }
            }

            const { data, error } = await supabase
                .from('chat_messages')
                .insert(messageData)
                .select()

            if (error) {
                console.error('❌ 메시지 전송 오류:', error)
                // 전송 실패 시 optimistic 메시지 제거
                setMessages(prev => prev.filter(msg => msg.id !== tempId))
                setError(`메시지 전송 실패: ${error.message}`)
            } else {
                console.log('✅ 메시지 전송 성공:', data)
                // 성공 시 optimistic 메시지를 실제 메시지로 교체
                setMessages(prev => prev.map(msg =>
                    msg.id === tempId ? { ...data[0], files: files, _isOptimistic: false } : msg
                ))
            }
        } catch (err) {
            console.error('❌ 메시지 전송 에러:', err)
            setMessages(prev => prev.filter(msg => msg.id !== tempId))
            setError(`메시지 전송 에러: ${err.message}`)
        }
    }, [workspaceId, chatRoomId, user])

    // 채팅방 읽음 처리 (외부에서 호출 가능하도록 useCallback 유지)
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
            }
        } catch (err) {
            console.error('❌ 읽음 처리 에러:', err)
        }
    }, [chatRoomId, user?.user_id])

    // Realtime 구독 및 메시지 관리
    useEffect(() => {
        // 필수 정보 체크
        if (!workspaceId || !user?.user_id || !chatRoomId) {
            console.log('⚠️ 필수 정보 없음:', { workspaceId, userId: user?.user_id, chatRoomId })
            setLoading(false)
            return
        }

        // 상태 관리 변수들
        let retryCount = 0
        let channel = null

        // 기존 메시지 로드 (useEffect 내부로 이동)
        const fetchMessages = async () => {
            try {
                console.log('📥 메시지 로드 시작:', { chatRoomId })

                const { data, error } = await supabase
                    .from('chat_messages')
                    .select('*')
                    .eq('chat_room_id', chatRoomId)
                    .order('created_at', { ascending: true })

                if (error) {
                    console.error('❌ Supabase 쿼리 오류:', error)
                    throw error
                }

                console.log('📬 로드된 메시지 수:', data?.length || 0)
                console.log('📬 메시지 데이터:', data)

                const messagesWithFiles = (data || []).map(message => ({
                    ...message,
                    files: [],
                    sender_profile_image: null // 프로필 이미지는 나중에 별도로 로드
                }))

                if (mountedRef.current) {
                    setMessages(messagesWithFiles)
                    console.log('✅ 메시지 상태 업데이트 완료')
                }
            } catch (err) {
                console.error('❌ 메시지 로드 오류:', err)
                console.error('오류 상세:', {
                    message: err.message,
                    details: err.details,
                    hint: err.hint,
                    code: err.code
                })
                if (mountedRef.current) {
                    setError(`메시지 로드 실패: ${err.message}`)
                    setMessages([])  // 빈 배열로 설정하여 UI가 계속 동작하도록
                }
                // throw err 제거 - 초기화 프로세스가 계속 진행되도록
            }
        }

        // 워크스페이스 멤버 확인 (useEffect 내부로 이동)
        const ensureWorkspaceMember = async () => {
            try {
                console.log('🔍 워크스페이스 멤버 확인:', { workspaceId, userId: user.user_id })

                const { data: existingMember } = await supabase
                    .from('workspace_members')
                    .select('*')
                    .eq('workspace_id', workspaceId)
                    .eq('user_id', user.user_id)
                    .single()

                if (!existingMember) {
                    console.log('➕ 워크스페이스 멤버 추가')
                    const { error } = await supabase
                        .from('workspace_members')
                        .insert({
                            workspace_id: workspaceId,
                            user_id: user.user_id,
                            role: 'member'
                        })

                    if (error) throw error
                    console.log('✅ 워크스페이스 멤버 추가 성공')
                } else {
                    console.log('✅ 기존 멤버 확인 완료')
                }
            } catch (err) {
                console.error('❌ 워크스페이스 멤버 처리 오류:', err)
                throw err
            }
        }

        // Broadcast 메시지 핸들러 (권장 방식)
        const handleChange = (msg) => {
            console.debug('📨 Realtime payload:', msg.payload) // 스키마 감시

            if (!mountedRef.current) return

            // 방어적 파싱
            const p = msg.payload
            const event = p?.event ?? msg.event
            const newRecord = p?.new ?? null
            const oldRecord = p?.old ?? null

            if (!event) {
                console.warn('⚠️ 이벤트 타입 없음:', msg)
                return
            }

            // INSERT 처리
            if (event === 'INSERT' && newRecord) {
                setMessages(prev => {
                    // tempId로 정확한 optimistic update 매칭
                    const optimisticIndex = prev.findIndex(msg =>
                        msg._isOptimistic &&
                        msg.id === newRecord.metadata?.tempId
                    )

                    if (optimisticIndex !== -1) {
                        console.log('🔄 Optimistic 메시지를 실제 메시지로 교체:', newRecord.id)
                        const newMessages = [...prev]
                        newMessages[optimisticIndex] = { ...newRecord, _isOptimistic: false }
                        return newMessages
                    }

                    // 중복 방지
                    const isDuplicate = prev.some(msg => msg.id === newRecord.id)
                    if (isDuplicate) {
                        console.log('🔄 중복 메시지 무시:', newRecord.id)
                        return prev
                    }

                    console.log('✅ 새 메시지 추가:', newRecord)
                    return [...prev, newRecord]
                })
            }
            // UPDATE 처리
            else if (event === 'UPDATE' && newRecord) {
                setMessages(prev => prev.map(msg =>
                    msg.id === newRecord.id ? { ...newRecord } : msg
                ))
            }
            // DELETE 처리
            else if (event === 'DELETE' && oldRecord) {
                setMessages(prev => prev.filter(msg => msg.id !== oldRecord.id))
            }
        }

        // 이전 채널 정리 함수
        const cleanupPreviousChannel = async () => {
            if (channelRef.current) {
                console.log('🧹 기존 채널 정리 시작')
                const oldChannel = channelRef.current
                channelRef.current = null

                try {
                    await oldChannel.unsubscribe()
                    await supabase.removeChannel(oldChannel)
                    console.log('✅ 기존 채널 정리 완료')
                } catch (err) {
                    console.error('❌ 채널 정리 실패:', err)
                }
            }

            // 이전 정리 작업이 있다면 기다림
            if (cleanupPromiseRef.current) {
                try {
                    await cleanupPromiseRef.current
                } catch (err) {
                    console.error('❌ 이전 정리 작업 대기 실패:', err)
                }
            }
        }

        // 채널 초기화 함수
        const initializeChannel = async () => {
            const channelName = `room:${chatRoomId}:messages`
            console.log('🚀 채널 초기화 시작:', channelName)

            try {
                // 초기 데이터 로드
                setLoading(true)
                setRealtimeStatus('connecting')

                // 각 단계별로 에러가 발생해도 계속 진행
                try {
                    await ensureWorkspaceMember()
                } catch (err) {
                    console.error('⚠️ 워크스페이스 멤버 확인 실패 (계속 진행):', err)
                }

                try {
                    await fetchMessages()
                } catch (err) {
                    console.error('⚠️ 메시지 로드 실패 (계속 진행):', err)
                }

                try {
                    await markRoomAsRead()
                } catch (err) {
                    console.error('⚠️ 읽음 상태 업데이트 실패 (계속 진행):', err)
                }

                // 인증 토큰 설정
                const { data: { session } } = await supabase.auth.getSession()
                if (session?.access_token) {
                    console.log('🔐 Realtime 인증 토큰 설정')
                    supabase.realtime.setAuth(session.access_token)
                }

                // 채널 생성 및 구독
                console.log('📡 Realtime 채널 구독 시작:', channelName)

                channel = supabase
                    .channel(channelName, {
                        config: {
                            private: true
                        }
                    })
                    .on('broadcast', { event: 'INSERT' }, handleChange)
                    .on('broadcast', { event: 'UPDATE' }, handleChange)
                    .on('broadcast', { event: 'DELETE' }, handleChange)
                    .subscribe((status, err) => {
                        console.log('📡 Realtime 구독 상태:', status, err)

                        if (!mountedRef.current) return

                        setRealtimeStatus(status)

                        if (status === 'SUBSCRIBED') {
                            retryCount = 0
                            console.log('✅ Realtime 구독 성공')
                        }

                        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                            console.error('❌ Realtime 구독 실패:', status, err)

                            // 에러 타입 확인
                            const isConnectionPoolError = err?.message?.includes('DatabaseLackOfConnections')
                            const isAuthError = err?.message?.includes('401') ||
                                              err?.message?.includes('Unauthorized')

                            if (isConnectionPoolError) {
                                setError('서버 연결 포화 상태. 잠시 후 재시도해주세요.')
                                return
                            }

                            if (isAuthError) {
                                handleAuthError()
                                return
                            }

                            // 일반 에러 재시도
                            if (retryCount < MAX_RETRIES && mountedRef.current) {
                                scheduleRetry()
                            } else {
                                setError(`연결 실패: ${err?.message || '알 수 없는 오류'}`)
                            }
                        }

                        if (err) {
                            console.error('❌ Realtime 구독 오류:', err)
                            if (!mountedRef.current) return
                            setError(`연결 오류: ${err.message}`)
                        }
                    })

                channelRef.current = channel

            } catch (err) {
                console.error('❌ 채널 초기화 오류:', err)
                if (mountedRef.current) {
                    setError(`초기화 실패: ${err.message}`)
                }
            } finally {
                // 어떤 경우에도 로딩 상태를 해제
                if (mountedRef.current) {
                    setLoading(false)
                    console.log('🔄 로딩 상태 해제됨')
                }
            }
        }

        // 인증 에러 처리
        const handleAuthError = async () => {
            console.log('🔐 인증 갱신 시도')
            try {
                const { error } = await supabase.auth.refreshSession()
                if (!mountedRef.current) return

                if (error) {
                    setError('인증 만료. 다시 로그인해주세요.')
                } else {
                    console.log('✅ 인증 갱신 성공')
                    // 채널 재초기화
                    await cleanupPreviousChannel()
                    await initializeChannel()
                }
            } catch (err) {
                if (!mountedRef.current) return
                console.error('❌ 인증 갱신 실패:', err)
                setError('인증 갱신 실패. 다시 로그인해주세요.')
            }
        }

        // 재시도 스케줄링
        const scheduleRetry = () => {
            retryCount++
            const retryDelay = Math.min(2000 * Math.pow(2, retryCount), 15000)
            console.log(`🔄 재시도 ${retryCount}/${MAX_RETRIES} (${retryDelay}ms 후)`)

            // 기존 타이머 정리
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current)
            }

            retryTimeoutRef.current = setTimeout(async () => {
                if (!mountedRef.current) return

                await cleanupPreviousChannel()
                await initializeChannel()
            }, retryDelay)
        }

        // 초기화 시작
        const startInitialization = async () => {
            cleanupPromiseRef.current = cleanupPreviousChannel()
            await cleanupPromiseRef.current
            await initializeChannel()
        }

        startInitialization()

        // Cleanup
        return () => {
            console.log('🔌 채팅 정리 시작')
            mountedRef.current = false

            // 타이머 정리
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current)
                retryTimeoutRef.current = null
            }

            // 채널 정리
            if (channelRef.current) {
                const channel = channelRef.current
                channelRef.current = null

                channel.unsubscribe()
                    .then(() => supabase.removeChannel(channel))
                    .then(() => console.log('✅ 채널 정리 완료'))
                    .catch(err => console.error('❌ 채널 정리 실패:', err))
            }

            setRealtimeStatus('disconnected')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId, user?.user_id, chatRoomId]) // 의존성 최소화

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