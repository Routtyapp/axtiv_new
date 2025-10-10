import { useState, useMemo, useEffect } from "react";
import { Skeleton, Alert, AlertDescription, Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui";
import { useUser } from "../../hooks/useUser";
import useRealtimeChat from "../../hooks/useRealtimeChat";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import LeaveChatRoomDialog from "./LeaveChatRoomDialog";
import MemberList from "./MemberList";
import { supabase } from "../../lib/supabase";

// 🚨 임시 기능: 자동 메시지 전송 (나중에 삭제 예정)
import { startAutoMessage, stopAutoMessage, isAutoMessageRunning, getAutoMessageCount } from "../../utils/tempAutoMessage";

const ChatSidebar = ({
  workspaceId,
  workspaceName,
  chatRoomId,
  chatRoomName,
  chatRoomIsDefault,
  onLeaveChatRoom,
}) => {
  const { user, isAuthenticated, getId } = useUser();

  // user 객체 안정화 - 필요한 속성만 메모이제이션
  const stableUser = useMemo(() => {
    if (!user) return null;
    return {
      user_id: user.user_id || user.id,
      email: user.email,
      user_metadata: user.user_metadata
    };
  }, [user?.user_id, user?.id, user?.email, user?.user_metadata]);

  const { messages, loading, error, sendMessage, realtimeStatus, hasMoreMessages, loadingMore, loadMoreMessages } =
    useRealtimeChat(workspaceId, stableUser, chatRoomId);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  // 🎯 스트리밍 상태 추가
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  // 🚨 임시 기능: 자동 메시지 상태 (나중에 삭제 예정)
  const [autoMessageRunning, setAutoMessageRunning] = useState(false);

  // 👥 멤버 목록 관련 상태
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [chatMembers, setChatMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // 🚨 임시 기능: 자동 메시지 전송 핸들러 (나중에 삭제 예정)
  const handleToggleAutoMessage = () => {
    if (autoMessageRunning) {
      stopAutoMessage();
      setAutoMessageRunning(false);
    } else {
      startAutoMessage(sendMessage, workspaceId, chatRoomId);
      setAutoMessageRunning(true);
    }
  };

  // 🚨 임시 기능: 자동 메시지 상태 동기화 (나중에 삭제 예정)
  useEffect(() => {
    const syncAutoMessageStatus = () => {
      setAutoMessageRunning(isAutoMessageRunning());
    };

    // 1초마다 상태 동기화
    const interval = setInterval(syncAutoMessageStatus, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // 🚨 임시 기능: 컴포넌트 언마운트 시 자동 메시지 정리 (나중에 삭제 예정)
  useEffect(() => {
    return () => {
      if (isAutoMessageRunning()) {
        console.log('🧹 컴포넌트 언마운트 시 자동 메시지 정리');
        stopAutoMessage();
      }
    };
  }, []);

  // 👥 채팅방이 변경될 때마다 멤버 목록 가져오기
  useEffect(() => {
    const fetchChatMembers = async () => {
      if (!chatRoomId) {
        setChatMembers([]);
        return;
      }

      try {
        setLoadingMembers(true);

        // RPC 함수 호출 (RLS 우회)
        const { data, error } = await supabase
          .rpc('get_chat_room_members', { p_chat_room_id: chatRoomId });

        if (error) {
          console.error('Error fetching chat members:', error);
          return;
        }

        // 데이터 구조 변환
        const formattedMembers = (data || []).map(member => ({
          id: member.id,
          user_id: member.user_name || member.email || member.user_id,
          role: member.role,
          joined_at: member.joined_at,
          email: member.email
        }));

        setChatMembers(formattedMembers);
      } catch (error) {
        console.error('Error in fetchChatMembers:', error);
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchChatMembers();
  }, [chatRoomId]);

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p className="text-gray-500 dark:text-gray-400">로그인이 필요합니다.</p>
      </div>
    );
  }

  // 채팅방이 선택되지 않은 경우
  if (!chatRoomId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-20 h-20 bg-gray-100 dark:bg-[#232323] rounded-full flex items-center justify-center mb-4">
          <span className="text-4xl">💬</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-700 dark:text-white mb-2">
          채팅방을 선택하세요
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          왼쪽 사이드바에서 채팅방을 선택하거나
          <br />
          새로운 채팅방을 생성해보세요.
        </p>
      </div>
    );
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
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          채팅을 로딩중입니다...
        </p>
      </div>
    );
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
    );
  }

  // 🎯 메시지 전송 핸들러 (스트리밍 상태 관리)
  const handleSendMessage = async (content, messageType, files, isAiMode = false) => {
    // AI 모드일 때만 스트리밍 상태 관리
    if (isAiMode) {
      // 사용자 메시지일 때 스트리밍 초기화
      if (messageType === "user") {
        setStreamingContent("");
        setIsStreaming(true);
      }
      // AI 메시지 완료 시 스트리밍 종료
      else if (messageType === "ai") {
        setIsStreaming(false);
        setStreamingContent("");
      }
    }

    // 실제 메시지 전송
    await sendMessage(content, messageType, files);
  };

  // 🎯 스트리밍 업데이트 콜백
  const handleStreamUpdate = (partialText) => {
    setStreamingContent(partialText);
  };

  const handleLeaveSuccess = (roomId) => {
    setShowLeaveDialog(false);
    if (onLeaveChatRoom) {
      onLeaveChatRoom(roomId);
    }
  };

  // 👥 멤버 다이얼로그 열기 핸들러
  const handleShowMembers = () => {
    setShowMembersDialog(true);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#121212]">
      <ChatHeader
        workspaceName={workspaceName}
        currentRoomName={chatRoomName}
        realtimeStatus={realtimeStatus}
        onLeaveRoom={chatRoomId ? () => setShowLeaveDialog(true) : null}
        memberCount={chatMembers.length}
        onShowMembers={handleShowMembers}
      />

      {/* 🚨 임시 기능: 자동 메시지 전송 버튼 (나중에 삭제 예정) */}
      {chatRoomId && (
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/20">
          <div className="flex items-center justify-between">
            <div className="text-xs text-yellow-700 dark:text-yellow-300">
              🚨 테스트 모드: 자동 메시지 전송
            </div>
            <div className="flex items-center gap-2">
              {autoMessageRunning && (
                <span className="text-xs text-green-600 dark:text-green-400">
                  전송 중: {getAutoMessageCount()}개
                </span>
              )}
              <Button
                size="sm"
                variant={autoMessageRunning ? "destructive" : "default"}
                onClick={handleToggleAutoMessage}
                className="text-xs"
              >
                {autoMessageRunning ? "🛑 중지" : "▶️ 시작"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <MessageList
        messages={messages}
        currentUserId={user.id}
        streamingContent={streamingContent}
        isStreaming={isStreaming}
        hasMoreMessages={hasMoreMessages}
        loadingMore={loadingMore}
        loadMoreMessages={loadMoreMessages}
      />

      <MessageInput
        onSend={handleSendMessage} // 👈 수정
        onStreamUpdate={handleStreamUpdate} // 👈 추가
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
          chatRoom={{
            id: chatRoomId,
            name: chatRoomName,
            is_default: chatRoomIsDefault || false,
          }}
          currentUserId={getId()}
        />
      )}

      {/* 👥 멤버 목록 다이얼로그 */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>채팅방 참여 인원</DialogTitle>
          </DialogHeader>
          {loadingMembers ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <MemberList members={chatMembers} currentUserId={user?.id} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatSidebar;
