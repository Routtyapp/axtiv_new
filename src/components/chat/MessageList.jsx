import { useEffect, useRef } from 'react'
import { Flex, Text } from '@radix-ui/themes'
import { ScrollArea } from '../ui'
import MessageItem from './MessageItem'

const MessageList = ({ messages, currentUserId }) => {
    const messagesEndRef = useRef(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

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
                    const showTime = !previousMessage ||
                        new Date(message.created_at).getTime() - new Date(previousMessage.created_at).getTime() > 300000

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
                <div ref={messagesEndRef} />
            </Flex>
        </ScrollArea>
    )
}

export default MessageList