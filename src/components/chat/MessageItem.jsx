import { Avatar, Badge } from '../ui'
import FileMessage from './FileMessage'
import MeetingMessageCard from '../meeting/MeetingMessageCard'
import MessageDisplay from './MessageDisplay' // 👈 추가!

const MessageItem = ({ message, isOwnMessage, showSender, showTime }) => {
    const formatTime = (timestamp) => {
        const date = new Date(timestamp)
        const now = new Date()

        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit'
            })
        }

        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        if (date.toDateString() === yesterday.toDateString()) {
            return `어제 ${date.toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit'
            })}`
        }

        return date.toLocaleString('ko-KR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (message.message_type === 'system') {
        return (
            <div className="flex justify-center">
                <Badge variant="secondary" className="text-xs">
                    {message.content}
                </Badge>
            </div>
        )
    }

    // 회의 공유 메시지 처리
    if (message.message_type === 'meeting_share') {
        try {
            const meetingData = JSON.parse(message.content)
            return (
                <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} gap-2 max-w-[95%]`}>
                        {!isOwnMessage && showSender && (
                            <Avatar
                                fallback={message.sender_name?.charAt(0) || '?'}
                                size="2"
                                color="gray"
                            />
                        )}

                        <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} gap-1`}>
                            {!isOwnMessage && showSender && (
                                <p className="text-xs text-gray-500">
                                    {message.sender_name || 'Anonymous'}
                                </p>
                            )}

                            <MeetingMessageCard meetingData={meetingData} />

                            {showTime && (
                                <p className="text-xs text-gray-500">
                                    {formatTime(message.created_at)}
                                </p>
                            )}
                        </div>

                        {!isOwnMessage && !showSender && (
                            <div className="w-8"></div>
                        )}
                    </div>
                </div>
            )
        } catch (error) {
            console.error('Error parsing meeting data:', error)
            return (
                <div className="flex justify-center">
                    <Badge variant="secondary" className="text-xs text-red-600">
                        회의 정보를 불러올 수 없습니다
                    </Badge>
                </div>
            )
        }
    }

    // AI 메시지 처리
    const isAiMessage = message.message_type === 'ai'

    // 파일 첨부 여부 확인
    const hasFiles = message.has_files && message.files && message.files.length > 0
    const hasTextContent = message.content && message.content.trim()

    return (
        <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} gap-2 max-w-[75%]`}
            >
                {(!isOwnMessage || isAiMessage) && showSender && (
                    <Avatar
                        fallback={isAiMessage ? '🤖' : (message.sender_name?.charAt(0) || '?')}
                        size="2"
                        color={isAiMessage ? "purple" : "gray"}
                    />
                )}

                <div
                    className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} gap-1`}
                >
                    {(!isOwnMessage || isAiMessage) && showSender && (
                        <p className={`text-xs ${isAiMessage ? 'text-purple-600' : 'text-gray-500'}`}>
                            {isAiMessage ? 'AI Assistant' : (message.sender_name || 'Anonymous')}
                        </p>
                    )}

                    {/* 메시지 내용 영역 */}
                    <div className="message-content">
                        {/* 텍스트 메시지 */}
                        {hasTextContent && (
                            <div
                                className={`px-3 py-2 rounded-lg break-words ${
                                    isAiMessage
                                        ? 'bg-purple-50 text-purple-900 border border-purple-200'
                                        : isOwnMessage
                                            ? message._isOptimistic
                                                ? 'bg-blue-400 text-white opacity-75'
                                                : 'bg-blue-500 text-white'
                                            : 'bg-gray-100 text-gray-900'
                                } ${hasFiles ? 'mb-2' : ''}`}
                            >
                                {/* 🎯 AI 메시지는 마크다운 렌더링 */}
                                {isAiMessage ? (
                                    <MessageDisplay 
                                        message={{ 
                                            role: 'assistant', 
                                            content: message.content 
                                        }} 
                                    />
                                ) : (
                                    <p className="text-sm">{message.content}</p>
                                )}
                                
                                {message._isOptimistic && (
                                    <span className="text-xs text-gray-500 ml-2">📤</span>
                                )}
                                {isAiMessage && (
                                    <span className="text-xs text-purple-600 ml-2">🤖</span>
                                )}
                            </div>
                        )}

                        {/* 파일 메시지 */}
                        {hasFiles && (
                            <div className={hasTextContent ? '' : `px-3 py-2 rounded-lg ${
                                isAiMessage
                                    ? 'bg-purple-100 border border-purple-200'
                                    : isOwnMessage
                                        ? 'bg-blue-50 border border-blue-200'
                                        : 'bg-gray-50 border border-gray-200'
                            }`}>
                                <FileMessage files={message.files} />
                                {!hasTextContent && isAiMessage && (
                                    <span className="text-xs text-purple-600 ml-2">🤖</span>
                                )}
                            </div>
                        )}

                        {/* 파일도 텍스트도 없는 경우 (예외 처리) */}
                        {!hasTextContent && !hasFiles && (
                            <div
                                className={`px-3 py-2 rounded-lg break-words ${
                                    isAiMessage
                                        ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                        : isOwnMessage
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 text-gray-900'
                                }`}
                            >
                                <p className="text-sm text-gray-500 italic">
                                    메시지 내용이 없습니다
                                </p>
                            </div>
                        )}
                    </div>

                    {showTime && (
                        <p className="text-xs text-gray-500">
                            {formatTime(message.created_at)}
                        </p>
                    )}
                </div>

                {(!isOwnMessage || isAiMessage) && !showSender && (
                    <div className="w-8"></div>
                )}
            </div>
        </div>
    )
}

export default MessageItem