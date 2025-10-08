import { useState, useEffect, useRef, useCallback } from 'react'
import { getSupabase } from '../lib/supabase'

// AXTI (AI Assistant) 사용자 ID (환경 변수에서 로드)
const AI_ASSISTANT_AUTH_ID = import.meta.env.VITE_AI_ASSISTANT_AUTH_ID

// 전역 채널 관리자 - 연결 수 최소화를 위한 채널 재사용
const globalChannelManager = {
    channels: new Map(),
    activeConnections: 0,
    maxConnections: 1, // 더 보수적으로 설정 (메시지 전송과 구독을 하나의 연결로 처리)
    connectionQueue: [], // 연결 대기열
    lastConnectionAttempt: 0, // 마지막 연결 시도 시간
    connectionThrottleMs: 5000, // 연결 시도 간격 (5초)
    
    getChannel(channelName, supabase) {
        if (this.channels.has(channelName)) {
            const channel = this.channels.get(channelName)
            
            // 채널 상태 확인
            if (channel.state === 'closed' || channel.state === 'errored') {
                console.log('🔄 기존 채널 상태 불량, 재생성:', channelName, 'state:', channel.state)
                this.channels.delete(channelName)
                this.activeConnections = Math.max(0, this.activeConnections - 1)
            } else {
                console.log('♻️ 기존 채널 재사용:', channelName, 'state:', channel.state)
                return channel
            }
        }
        
        // 연결 시도 스로틀링 체크
        const now = Date.now()
        const timeSinceLastAttempt = now - this.lastConnectionAttempt
        
        if (timeSinceLastAttempt < this.connectionThrottleMs) {
            const waitTime = this.connectionThrottleMs - timeSinceLastAttempt
            console.warn(`⚠️ 연결 시도 제한: ${waitTime}ms 후 재시도 가능`)
            return null
        }
        
        if (this.activeConnections >= this.maxConnections) {
            console.warn('⚠️ 최대 연결 수 도달, 연결 대기 중...')
            return null
        }
        
        // 연결 시도 시간 기록
        this.lastConnectionAttempt = now
        
        const channel = supabase.channel(channelName, {
            config: { private: true }
        })
        
        this.channels.set(channelName, channel)
        this.activeConnections++
        console.log('🆕 새 채널 생성:', channelName, `(${this.activeConnections}/${this.maxConnections})`)
        console.log('📊 현재 연결 상태:', this.getConnectionStatus())
        return channel
    },
    
    removeChannel(channelName, channel) {
        if (this.channels.has(channelName)) {
            this.channels.delete(channelName)
            this.activeConnections = Math.max(0, this.activeConnections - 1)
            console.log('🗑️ 채널 제거:', channelName, `(${this.activeConnections}/${this.maxConnections})`)
            console.log('📊 현재 연결 상태:', this.getConnectionStatus())
        }
    },
    
    getConnectionStatus() {
        return {
            active: this.activeConnections,
            max: this.maxConnections,
            available: this.maxConnections - this.activeConnections
        }
    }
}

const useRealtimeChat = (workspaceId, user, chatRoomId = null) => {
    const [messages, setMessages] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [realtimeStatus, setRealtimeStatus] = useState('disconnected')
    const [hasMoreMessages, setHasMoreMessages] = useState(false) // 과거 메시지 존재 여부
    const [loadingMore, setLoadingMore] = useState(false) // 추가 로딩 상태
    
    // 페이지네이션 설정
    const MESSAGES_PER_PAGE = 50 // 한 번에 로드할 메시지 수
    const oldestMessageDateRef = useRef(null) // 가장 오래된 메시지 시간 추적

    // 채널 및 상태 관리
    const channelRef = useRef(null)
    const mountedRef = useRef(true)
    const retryTimeoutRef = useRef(null) // 타이머 관리
    const cleanupPromiseRef = useRef(null) // 정리 작업 Promise 추적
    const connectionRetryCount = useRef(0) // 연결 재시도 횟수
    const supabaseRef = useRef(null) // Supabase 인스턴스 캐시
    const MAX_RETRIES = 2
    const MAX_CONNECTION_RETRIES = 5 // 최대 연결 재시도 횟수 증가
    const CONNECTION_RETRY_DELAY = 15000 // 연결 재시도 간격 증가 (15초)
    const CONNECTION_BACKOFF_MULTIPLIER = 1.5 // 백오프 배수

    // 컴포넌트 마운트 상태 추적
    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
        }
    }, [])

    // Supabase 인스턴스 초기화 (한 번만)
    useEffect(() => {
        if (!supabaseRef.current) {
            supabaseRef.current = getSupabase()
            console.log('🔗 Supabase 인스턴스 캐시됨')
        }
    }, [])

    // 폴링 방식으로 메시지 동기화 (Realtime 대체) - 새 메시지만 체크
    useEffect(() => {
        if (!chatRoomId || realtimeStatus !== 'polling') return

        const supabase = supabaseRef.current || getSupabase()
        
        const pollMessages = async () => {
            try {
                // 현재 가장 최신 메시지의 created_at 가져오기
                const latestMessage = messages[messages.length - 1]
                const lastCreatedAt = latestMessage?.created_at || new Date(0).toISOString()

                // 마지막 메시지 이후의 새 메시지만 가져오기
                const { data: newMessages, error } = await supabase
                    .from('chat_messages')
                    .select('*')
                    .eq('chat_room_id', chatRoomId)
                    .gt('created_at', lastCreatedAt)
                    .order('created_at', { ascending: true })
                    .limit(50) // 최대 50개까지만

                if (error) {
                    console.error('❌ 폴링 메시지 로드 실패:', error)
                    return
                }

                if (newMessages && newMessages.length > 0) {
                    console.log('📨 폴링으로 새 메시지 발견:', newMessages.length, '개')
                    
                    const messagesWithFiles = newMessages.map(message => ({
                        ...message,
                        files: [],
                        sender_profile_image: null
                    }))
                    
                    setMessages(prev => [...prev, ...messagesWithFiles])
                }
            } catch (err) {
                console.error('❌ 폴링 오류:', err)
            }
        }

        // 즉시 한 번 실행
        pollMessages()

        // 3초마다 폴링
        const interval = setInterval(pollMessages, 3000)

        return () => clearInterval(interval)
    }, [chatRoomId, realtimeStatus, messages])

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
            // 연결 상태 모니터링
            const connectionStatus = globalChannelManager.getConnectionStatus()
            console.log('📤 메시지 전송 시도:', { 
                content, 
                workspaceId, 
                senderId: senderInfo.sender_id,
                connections: `${connectionStatus.active}/${connectionStatus.max}`,
                available: connectionStatus.available
            })

            // 캐시된 Supabase 인스턴스 사용
            const supabase = supabaseRef.current || getSupabase()

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

            // 캐시된 Supabase 인스턴스 사용
            const supabase = supabaseRef.current || getSupabase()

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

    // 과거 메시지 추가 로드 (무한 스크롤용)
    const loadMoreMessages = useCallback(async () => {
        if (!chatRoomId || !hasMoreMessages || loadingMore) {
            console.log('⚠️ 추가 로드 불가:', { chatRoomId, hasMoreMessages, loadingMore })
            return
        }

        if (!oldestMessageDateRef.current) {
            console.log('⚠️ 가장 오래된 메시지 시간이 없음')
            return
        }

        try {
            setLoadingMore(true)
            console.log('📥 과거 메시지 로드 시작:', { oldestMessageDate: oldestMessageDateRef.current })

            const supabase = supabaseRef.current || getSupabase()

            // 가장 오래된 메시지보다 이전 메시지 50개 가져오기
            const { data, error, count } = await supabase
                .from('chat_messages')
                .select('*', { count: 'exact' })
                .eq('chat_room_id', chatRoomId)
                .lt('created_at', oldestMessageDateRef.current) // 가장 오래된 메시지 시간보다 이전
                .order('created_at', { ascending: false })
                .limit(MESSAGES_PER_PAGE)

            if (error) {
                console.error('❌ 과거 메시지 로드 오류:', error)
                throw error
            }

            const sortedMessages = (data || []).reverse()
            console.log('📬 추가 로드된 메시지 수:', sortedMessages.length)
            console.log('📊 전체 메시지 수:', count)

            if (sortedMessages.length > 0) {
                const messagesWithFiles = sortedMessages.map(message => ({
                    ...message,
                    files: [],
                    sender_profile_image: null
                }))

                // 기존 메시지 앞에 추가
                setMessages(prev => [...messagesWithFiles, ...prev])

                // 가장 오래된 메시지 시간 업데이트
                oldestMessageDateRef.current = messagesWithFiles[0].created_at
                console.log('📌 업데이트된 가장 오래된 메시지 시간:', oldestMessageDateRef.current)

                // 더 있는지 확인
                const currentTotal = messages.length + sortedMessages.length
                setHasMoreMessages(currentTotal < count)
                console.log('📊 현재 로드된 메시지:', currentTotal, '/', count)
            } else {
                console.log('📭 더 이상 과거 메시지 없음')
                setHasMoreMessages(false)
            }
        } catch (err) {
            console.error('❌ 과거 메시지 로드 실패:', err)
        } finally {
            setLoadingMore(false)
        }
    }, [chatRoomId, hasMoreMessages, loadingMore, messages.length])

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
                console.log('📥 메시지 로드 시작 (최근 50개):', { chatRoomId })

                // 최근 메시지 50개만 가져오기 (역순으로 정렬 후 제한)
                const { data, error, count } = await supabase
                    .from('chat_messages')
                    .select('*', { count: 'exact' })
                    .eq('chat_room_id', chatRoomId)
                    .order('created_at', { ascending: false }) // 최신순 정렬
                    .limit(MESSAGES_PER_PAGE) // 50개만 로드

                if (error) {
                    console.error('❌ Supabase 쿼리 오류:', error)
                    throw error
                }

                // 시간순으로 다시 정렬 (오래된 것부터)
                const sortedMessages = (data || []).reverse()
                
                console.log('📬 로드된 메시지 수:', sortedMessages.length)
                console.log('📊 전체 메시지 수:', count)

                const messagesWithFiles = sortedMessages.map(message => ({
                    ...message,
                    files: [],
                    sender_profile_image: null // 프로필 이미지는 나중에 별도로 로드
                }))

                if (mountedRef.current) {
                    setMessages(messagesWithFiles)
                    console.log('✅ 메시지 상태 업데이트 완료')
                    
                    // 과거 메시지가 더 있는지 확인
                    setHasMoreMessages(count > MESSAGES_PER_PAGE)
                    
                    // 가장 오래된 메시지 시간 저장
                    if (messagesWithFiles.length > 0) {
                        oldestMessageDateRef.current = messagesWithFiles[0].created_at
                        console.log('📌 가장 오래된 메시지 시간:', oldestMessageDateRef.current)
                        console.log('📊 hasMoreMessages:', count > MESSAGES_PER_PAGE, '(전체:', count, ')')
                    }
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

        // 캐시된 Supabase 인스턴스 사용
        const supabase = supabaseRef.current || getSupabase()
        
        // 채널 초기화 함수
        const initializeChannel = async () => {
            const channelName = `room:${chatRoomId}:messages`
            const connectionStatus = globalChannelManager.getConnectionStatus()
            
            // 기존 채널이 있고 사용자가 동일한지 확인
            const existingChannel = globalChannelManager.channels.get(channelName)
            if (existingChannel && channelRef.current === existingChannel) {
                console.log('♻️ 기존 채널 유지:', channelName, '사용자 변경 없음')
                setLoading(false)
                setRealtimeStatus('SUBSCRIBED')
                return
            }
            
            console.log('🚀 채널 초기화 시작:', channelName, {
                connections: `${connectionStatus.active}/${connectionStatus.max}`,
                available: connectionStatus.available,
                hasExistingChannel: !!existingChannel
            })

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

                // 🚨 Realtime 구독 임시 비활성화 (연결 문제 해결을 위해)
                console.log('⚠️ Realtime 구독 임시 비활성화 - 폴링 모드로 전환')
                setRealtimeStatus('polling')
                setLoading(false)
                return
                
                // 아래 코드는 Realtime이 안정화되면 다시 활성화
                /*
                // 전역 채널 관리자를 통해 채널 가져오기 또는 생성
                console.log('📡 Realtime 채널 구독 시작:', channelName)
                channel = globalChannelManager.getChannel(channelName, supabase)
                
                if (!channel) {
                    console.warn('⚠️ 채널 생성 실패: 연결 수 한계 도달')
                    setError('서버 연결 한계에 도달했습니다. 잠시 후 다시 시도해주세요.')
                    setLoading(false)
                    return
                }
                */

                // 이벤트 리스너 등록 (이미 등록된 경우 중복 방지)
                if (!channel._eventListenersAdded) {
                    channel
                        .on('broadcast', { event: 'INSERT' }, handleChange)
                        .on('broadcast', { event: 'UPDATE' }, handleChange)
                        .on('broadcast', { event: 'DELETE' }, handleChange)
                    channel._eventListenersAdded = true
                    console.log('📡 새 채널에 이벤트 리스너 등록')
                } else {
                    console.log('♻️ 기존 채널 재사용 (이벤트 리스너 이미 등록됨)')
                    
                    // 기존 채널이 이미 구독 중인지 확인
                    if (channel.state === 'joined' || channel.state === 'joining') {
                        console.log('✅ 기존 채널 이미 구독 중:', channel.state)
                        setLoading(false)
                        setRealtimeStatus('SUBSCRIBED')
                        channelRef.current = channel
                        return
                    }
                }

                channel.subscribe((status, err) => {
                        console.log('📡 Realtime 구독 상태:', status, err)

                        if (!mountedRef.current) return

                        setRealtimeStatus(status)

                        if (status === 'SUBSCRIBED') {
                            retryCount = 0
                            connectionRetryCount.current = 0 // 연결 재시도 카운터도 리셋
                            console.log('✅ Realtime 구독 성공')
                            
                            // 연결 상태 모니터링
                            const connectionStatus = globalChannelManager.getConnectionStatus()
                            console.log('📊 구독 성공 후 연결 상태:', connectionStatus)
                        }

                        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                            console.error('❌ Realtime 구독 실패:', status, err)

                            // 에러 타입 확인
                            const isConnectionPoolError = err?.message?.includes('DatabaseLackOfConnections')
                            const isAuthError = err?.message?.includes('401') ||
                                              err?.message?.includes('Unauthorized')

                            if (isConnectionPoolError) {
                                console.warn('⚠️ 데이터베이스 연결 포화 상태 감지')
                                connectionRetryCount.current += 1
                                
                                if (connectionRetryCount.current <= MAX_CONNECTION_RETRIES && mountedRef.current) {
                                    // 지수 백오프 적용
                                    const retryDelay = Math.floor(CONNECTION_RETRY_DELAY * Math.pow(CONNECTION_BACKOFF_MULTIPLIER, connectionRetryCount.current - 1))
                                    
                                    console.log(`🔄 연결 재시도 ${connectionRetryCount.current}/${MAX_CONNECTION_RETRIES} - ${retryDelay/1000}초 후`)
                                    setError(`서버 연결 포화 상태. ${retryDelay/1000}초 후 재시도합니다...`)
                                    setRealtimeStatus('retrying')
                                    
                                    setTimeout(() => {
                                        if (mountedRef.current) {
                                            console.log('🔄 연결 재시도 시작')
                                            initializeChannel()
                                        }
                                    }, retryDelay)
                                } else {
                                    setError('서버 연결 한계에 도달했습니다. 페이지를 새로고침하거나 잠시 후 다시 시도해주세요.')
                                    setRealtimeStatus('failed')
                                }
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

            // 모든 타이머 정리
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current)
                retryTimeoutRef.current = null
            }

            // 재시도 카운터 리셋
            connectionRetryCount.current = 0

            // 채널 정리 - 전역 채널 관리자 사용
            if (channelRef.current) {
                const channel = channelRef.current
                const channelName = `room:${chatRoomId}:messages`
                channelRef.current = null

                // 즉시 구독 해제
                try {
                    channel.unsubscribe()
                } catch (err) {
                    console.warn('⚠️ 채널 구독 해제 중 오류:', err)
                }

                // 전역 채널 관리자에서 채널 제거
                globalChannelManager.removeChannel(channelName, channel)
                
                // 상태 정리
                setRealtimeStatus('disconnected')
                setError(null)
                console.log('✅ 채널 정리 완료')
            } else {
                setRealtimeStatus('disconnected')
                setError(null)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId, chatRoomId]) // user?.user_id 제거하여 불필요한 재연결 방지

    return {
        messages,
        loading,
        error,
        sendMessage,
        markRoomAsRead,
        realtimeStatus,
        // 페이지네이션 관련
        hasMoreMessages,
        loadingMore,
        loadMoreMessages
    }
}

export default useRealtimeChat