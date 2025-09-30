import { useState } from 'react'
import { Skeleton, Alert, AlertDescription } from '../ui'
import { useUser } from '../../hooks/useUser'
import useRealtimeChat from '../../hooks/useRealtimeChat'
import ChatHeader from './ChatHeader'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import LeaveChatRoomDialog from './LeaveChatRoomDialog'

const ChatSidebar = ({ workspaceId, workspaceName, chatRoomId, chatRoomName, onLeaveChatRoom }) => {
    const { user, isAuthenticated, getId } = useUser()
    const { messages, loading, error, sendMessage, realtimeStatus } = useRealtimeChat(workspaceId, user, chatRoomId)
    const [showLeaveDialog, setShowLeaveDialog] = useState(false)

    if (!isAuthenticated || !user) {
        return (
            <div className="flex items-center justify-center h-full p-4">
                <p className="text-gray-500">로그인이 필요합니다.</p>
            </div>
        )
    }

    // 채팅방이 선택되지 않은 경우
    if (!chatRoomId) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <span className="text-4xl">💬</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">채팅방을 선택하세요</h3>
                <p className="text-sm text-gray-500">
                    왼쪽 사이드바에서 채팅방을 선택하거나<br />
                    새로운 채팅방을 생성해보세요.
                </p>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="h-full p-4 space-y-3">
                <Skeleton className="h-12 w-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
                <p className="text-sm text-gray-500 text-center">채팅을 로딩중입니다...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full p-4">
                <Alert variant="destructive">
                    ⚠️
                    <AlertDescription>
                        채팅 로드 중 오류가 발생했습니다: {error}
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    const handleLeaveSuccess = (roomId) => {
        setShowLeaveDialog(false)
        if (onLeaveChatRoom) {
            onLeaveChatRoom(roomId)
        }
    }

    return (
        <div className="h-full flex flex-col bg-white">
            <ChatHeader
                workspaceName={workspaceName}
                currentRoomName={chatRoomName}
                realtimeStatus={realtimeStatus}
                onLeaveRoom={chatRoomId ? () => setShowLeaveDialog(true) : null}
            />

            <MessageList
                messages={messages}
                currentUserId={user.id}
            />

            <MessageInput
                onSend={(content, messageType, files) => sendMessage(content, messageType, files)}
                disabled={false}
                workspaceId={workspaceId}
                user={user}
            />

            {/* 채팅방 나가기 다이얼로그 */}
            {chatRoomId && (
                <LeaveChatRoomDialog
                    open={showLeaveDialog}
                    onOpenChange={setShowLeaveDialog}
                    onLeaveSuccess={handleLeaveSuccess}
                    chatRoom={{ id: chatRoomId, name: chatRoomName, is_default: false }}
                    currentUserId={getId()}
                />
            )}
        </div>
    )
}

export default ChatSidebar