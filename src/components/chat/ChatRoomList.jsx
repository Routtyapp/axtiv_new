import { useState, useEffect, useCallback } from "react";
import { Hash, Users, Clock, Plus } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Button, Badge } from "../ui";
import useWorkspacePermissions from "../../hooks/useWorkspacePermissions";

const ChatRoomList = ({
  workspaceId,
  currentUserId,
  onRoomSelect,
  selectedRoomId,
  onCreateRoom,
}) => {
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const { canCreateRoom } = useWorkspacePermissions(workspaceId);

  const fetchChatRooms = useCallback(async () => {
    if (!workspaceId || !currentUserId) return;

    try {
      // 🚀 최적화: 5개 쿼리 → 1개 RPC 함수 호출로 변경
      const { data, error } = await supabase.rpc('get_chat_rooms_optimized', {
        p_workspace_id: workspaceId,
        p_user_id: currentUserId
      });

      if (error) {
        console.error("Error fetching chat rooms:", error);
        setChatRooms([]);
        return;
      }

      // 데이터 변환 (camelCase로)
      const roomsWithInfo = (data || []).map(room => ({
        id: room.id,
        name: room.name,
        description: room.description,
        is_default: room.is_default,
        created_at: room.created_at,
        updated_at: room.updated_at,
        memberCount: Number(room.member_count),
        unreadCount: Number(room.unread_count),
        lastActivity: room.last_activity ? new Date(room.last_activity) : null,
      }));

      setChatRooms(roomsWithInfo);
    } catch (error) {
      console.error("Error fetching chat rooms:", error);
      setChatRooms([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, currentUserId]);

  // 🆕 채팅방 읽음 상태 업데이트 함수
  const updateReadStatus = useCallback(
    async (roomId) => {
      if (!roomId || !currentUserId) return;

      try {
        const { error } = await supabase.from("chat_read_status").upsert(
          {
            chat_room_id: roomId,
            user_id: currentUserId,
            last_read_at: new Date().toISOString(),
          },
          {
            onConflict: "chat_room_id,user_id", // 중복 시 업데이트
          }
        );

        if (error) {
          console.error("Error updating read status:", error);
        }
      } catch (error) {
        console.error("Error updating read status:", error);
      }
    },
    [currentUserId]
  );

  // 🆕 채팅방 선택 핸들러 (read_status 업데이트 포함)
  const handleRoomSelect = useCallback(
    async (roomId, roomName, isDefault) => {
      // read_status 업데이트
      await updateReadStatus(roomId);

      // 부모 컴포넌트의 onRoomSelect 호출
      if (onRoomSelect) {
        onRoomSelect(roomId, roomName, isDefault);
      }
    },
    [onRoomSelect, updateReadStatus]
  );

  useEffect(() => {
    fetchChatRooms();
  }, [fetchChatRooms]);

  // 헬퍼 함수들
  const formatLastActivity = (date) => {
    if (!date) return "활동 없음";

    const now = new Date();
    const diff = now - date;

    if (diff < 60000) {
      return "방금 전";
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}분 전`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}시간 전`;
    } else {
      return date.toLocaleDateString("ko-KR");
    }
  };

  const handleCreateRoom = () => {
    if (onCreateRoom) {
      onCreateRoom();
    }
  };

  // 로딩 상태 렌더링
  if (loading) {
    return (
      <div className="space-y-2 px-2">
        <div className="text-xs text-gray-500">채팅방을 불러오는 중...</div>
      </div>
    );
  }

  // 메인 렌더링
  return (
    <div className="space-y-2">
      {/* 채팅방 목록 */}
      {chatRooms.map((room) => {
        const isSelected = selectedRoomId === room.id;

        return (
          <Button
            key={room.id}
            variant={isSelected ? "default" : "ghost"}
            onClick={() => handleRoomSelect(room.id, room.name, room.is_default)}
            className="w-full p-3 h-auto flex flex-col items-start transition-colors"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                <span className="font-medium text-sm truncate max-w-32">
                  {room.name}
                </span>
                {room.is_default && (
                  <Badge variant="secondary" className="h-4 text-xs px-1">
                    기본
                  </Badge>
                )}
              </div>
              {room.unreadCount > 0 && (
                <div className="h-2 w-2 bg-red-500 rounded-full" title="새 메시지" />
              )}
            </div>

            <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{room.memberCount}명</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatLastActivity(room.lastActivity)}</span>
              </div>
            </div>

            {room.description && (
              <div className="w-full text-xs text-muted-foreground mt-1 text-left truncate">
                {room.description}
              </div>
            )}
          </Button>
        );
      })}

      {/* 채팅방 추가 버튼 */}
      {canCreateRoom && (
        <Button
          variant="outline"
          onClick={handleCreateRoom}
          className="w-full p-3 h-auto flex items-center justify-center gap-2 border-dashed hover:bg-accent"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm">채팅방 추가</span>
        </Button>
      )}

      {chatRooms.length === 0 && !loading && (
        <div className="text-xs text-gray-500 text-center py-4">
          {canCreateRoom
            ? "첫 번째 채팅방을 만들어보세요!"
            : "채팅방이 없습니다."}
        </div>
      )}
    </div>
  );
};

ChatRoomList.displayName = "ChatRoomList";

export default ChatRoomList;
