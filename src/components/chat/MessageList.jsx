import { useEffect, useRef } from 'react'
import { Flex, Text } from '@radix-ui/themes'
import { ScrollArea, Avatar } from '../ui'
import MessageItem from './MessageItem'
import MessageDisplay from './MessageDisplay'

const MessageList = ({ messages, currentUserId, streamingContent, isStreaming }) => {
    const messagesEndRef = useRef(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, streamingContent]) // 👈 streamingContent도 감지

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
        <ScrollArea className="flex-1 p-4">
            <Flex direction="column" gap="3">
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
        </ScrollArea>
    )
}

export default MessageList