import { useEffect, useRef, useState } from 'react'
import { Flex, Text } from '@radix-ui/themes'
import { ScrollArea, Avatar } from '../ui'
import MessageItem from './MessageItem'
import MessageDisplay from './MessageDisplay'

const MessageList = ({ messages, currentUserId, streamingContent, isStreaming, hasMoreMessages, loadingMore, loadMoreMessages }) => {
    const messagesEndRef = useRef(null)
    const scrollViewportRef = useRef(null)
    const [isAtBottom, setIsAtBottom] = useState(true)
    const previousMessagesLengthRef = useRef(0)
    const previousScrollHeightRef = useRef(0)
    const isInitialLoadRef = useRef(true)
    const lastMessageIdRef = useRef(null) // 마지막 메시지 ID 추적 (새 메시지 감지용)

    // 스크롤 핸들러 (상단 도달 시 과거 메시지 로드)
    const handleScroll = (e) => {
        const scrollViewport = e.target
        if (!scrollViewport) return
        
        const scrollTop = scrollViewport.scrollTop
        const scrollHeight = scrollViewport.scrollHeight
        const clientHeight = scrollViewport.clientHeight

        // 하단 근처인지 확인 (100px 여유)
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
        setIsAtBottom(isNearBottom)

        // 상단에 도달했는지 확인 (50px 여유)
        if (scrollTop < 50 && hasMoreMessages && !loadingMore) {
            // 현재 스크롤 위치 저장
            scrollViewportRef.current = scrollViewport
            previousScrollHeightRef.current = {
                scrollTop: scrollTop,
                scrollHeight: scrollHeight,
                firstMessageId: messages[0]?.id
            }
            
            loadMoreMessages()
        }
    }

    // 컴포넌트 마운트 시에만 초기화
    useEffect(() => {
        isInitialLoadRef.current = true
        previousMessagesLengthRef.current = 0
    }, [])

    // 초기 로드 시 하단으로 스크롤
    useEffect(() => {
        if (messages.length > 0 && isInitialLoadRef.current) {
            isInitialLoadRef.current = false
            
            // 마지막 메시지 ID 초기화 (중복 스크롤 방지)
            const currentLastMessage = messages[messages.length - 1]
            lastMessageIdRef.current = currentLastMessage?.id
            
            // 초기 로드 시에는 즉시 하단으로 스크롤
            setTimeout(() => {
                const scrollViewport = scrollViewportRef.current
                if (scrollViewport) {
                    scrollViewport.scrollTop = scrollViewport.scrollHeight
                }
            }, 300)
        }
    }, [messages.length])

    // 새 메시지 추가 시 하단으로 스크롤 (진짜 새 메시지일 때만)
    useEffect(() => {
        if (messages.length === 0) return
        
        const currentLastMessage = messages[messages.length - 1]
        const currentLastMessageId = currentLastMessage?.id
        
        // 과거 메시지 로드 중이면 스크롤하지 않음
        if (loadingMore || previousScrollHeightRef.current > 0) {
            return
        }
        
        // 초기 로드는 건너뜀
        if (isInitialLoadRef.current) {
            lastMessageIdRef.current = currentLastMessageId
            return
        }
        
        // 마지막 메시지 ID가 변경된 경우만 "새 메시지"로 인식
        if (currentLastMessageId && currentLastMessageId !== lastMessageIdRef.current) {
            // 하단에 있거나 스트리밍 중일 때만 스크롤
            if (isAtBottom || streamingContent) {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
            }
            
            lastMessageIdRef.current = currentLastMessageId
        }
    }, [messages, streamingContent, isAtBottom, loadingMore])

    // 과거 메시지 로드 후 스크롤 위치 유지
    useEffect(() => {
        if (!loadingMore && previousScrollHeightRef.current && typeof previousScrollHeightRef.current === 'object') {
            const scrollViewport = scrollViewportRef.current
            if (!scrollViewport) {
                console.error('❌ scrollViewport 없음 - 스크롤 복원 실패')
                previousScrollHeightRef.current = 0
                return
            }

            // DOM 업데이트 대기 후 스크롤 위치 복원
            requestAnimationFrame(() => {
                setTimeout(() => {
                    const savedData = previousScrollHeightRef.current
                    if (!savedData || typeof savedData !== 'object') return
                    
                    const newScrollHeight = scrollViewport.scrollHeight
                    const heightDiff = newScrollHeight - savedData.scrollHeight
                    
                    if (heightDiff > 0) {
                        const newScrollTop = savedData.scrollTop + heightDiff
                        scrollViewport.scrollTop = newScrollTop
                    }
                    
                    previousScrollHeightRef.current = 0
                }, 150)
            })
        }
    }, [messages.length, loadingMore])

    if (messages.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center p-4">
                <Flex direction="column" align="center" gap="3">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        💬
                    </div>
                    <Text size="2" color="gray">첫 메시지를 보내보세요!</Text>
                </Flex>
            </div>
        )
    }

    return (
        <div 
            ref={scrollViewportRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4"
            style={{ overflowY: 'auto', height: '100%' }}
        >
            <Flex direction="column" gap="3">
                {/* 과거 메시지 로딩 인디케이터 */}
                {loadingMore && (
                    <div className="flex justify-center py-2">
                        <Text size="2" color="gray">📥 과거 메시지 로딩 중...</Text>
                    </div>
                )}

                {/* 과거 메시지가 더 있다는 표시 */}
                {hasMoreMessages && !loadingMore && (
                    <div className="flex justify-center py-2">
                        <Text size="1" color="gray">
                            ↑ 위로 스크롤하여 과거 메시지 보기
                        </Text>
                    </div>
                )}
                
                {messages.map((message, index) => {
                    const previousMessage = messages[index - 1]
                    const showSender = !previousMessage || previousMessage.sender_id !== message.sender_id
                    const showTime = true

                    return (
                        <MessageItem
                            key={message.id}
                            message={message}
                            isOwnMessage={message.sender_id === currentUserId}
                            showSender={showSender}
                            showTime={showTime}
                        />
                    )
                })}

                {/* 🎯 스트리밍 중인 AI 메시지 표시 */}
                {isStreaming && (
                    <div className="flex justify-start">
                        <div className="flex gap-2 max-w-[75%]">
                            <Avatar fallback="🤖" size="2" color="purple" />
                            <div className="flex flex-col gap-1">
                                <p className="text-xs text-purple-600">AXTI</p>
                                <div className="px-3 py-2 rounded-lg bg-purple-50 border border-purple-200">
                                    {streamingContent ? (
                                        <>
                                            <MessageDisplay 
                                                message={{ 
                                                    role: 'assistant', 
                                                    content: streamingContent 
                                                }} 
                                            />
                                            {/* 타이핑 커서 */}
                                            <span className="inline-block w-0.5 h-4 bg-purple-600 animate-pulse ml-1"></span>
                                        </>
                                    ) : (
                                        // 로딩 인디케이터
                                        <div className="flex gap-1 py-1">
                                            <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></span>
                                            <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                            <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </Flex>
        </div>
    )
}

export default MessageList