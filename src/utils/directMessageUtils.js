import { supabase } from '../lib/supabase'

/**
 * 두 사용자 간의 1:1 채팅방을 찾거나 생성합니다
 * @param {string} workspaceId - 워크스페이스 ID
 * @param {string} userId1 - 사용자 1 UUID
 * @param {string} userId2 - 사용자 2 UUID
 * @param {string} user1Email - 사용자 1 이메일
 * @param {string} user2Email - 사용자 2 이메일
 * @returns {Promise<Object>} 채팅방 객체
 */
export const findOrCreateDirectChatRoom = async (
    workspaceId,
    userId1,
    userId2,
    user1Email,
    user2Email
) => {
    try {
        // 1. 기존 채팅방 찾기
        // direct_participants 배열에 두 사용자 ID가 모두 포함된 채팅방 검색
        const { data: existingRoom, error: findError } = await supabase
            .from('chat_rooms')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('is_direct_message', true)
            .contains('direct_participants', [userId1, userId2])
            .maybeSingle()

        if (findError) {
            console.error('Error finding direct chat room:', findError)
            throw findError
        }

        // 기존 채팅방이 있으면 반환
        if (existingRoom) {
            console.log('Found existing direct chat room:', existingRoom.id)
            return existingRoom
        }

        // 2. 새 채팅방 생성
        const roomName = generateDirectChatRoomName(user1Email, user2Email)

        const { data: newRoom, error: createError } = await supabase
            .from('chat_rooms')
            .insert({
                workspace_id: workspaceId,
                name: roomName,
                description: '개인 채팅',
                is_direct_message: true,
                direct_participants: [userId1, userId2],
                is_default: false,
                is_active: true,
                created_by: userId1
            })
            .select()
            .single()

        if (createError) {
            console.error('Error creating direct chat room:', createError)
            throw createError
        }

        console.log('Created new direct chat room:', newRoom.id)

        // 3. 두 사용자를 멤버로 추가
        const { error: membersError } = await supabase
            .from('chat_room_members')
            .insert([
                {
                    chat_room_id: newRoom.id,
                    user_id: userId1,
                    role: 'member',
                    invited_by: userId1
                },
                {
                    chat_room_id: newRoom.id,
                    user_id: userId2,
                    role: 'member',
                    invited_by: userId1
                }
            ])

        if (membersError) {
            console.error('Error adding members to direct chat room:', membersError)
            // 멤버 추가 실패 시 채팅방 삭제
            await supabase.from('chat_rooms').delete().eq('id', newRoom.id)
            throw membersError
        }

        return newRoom
    } catch (error) {
        console.error('Error in findOrCreateDirectChatRoom:', error)
        throw error
    }
}

/**
 * 개인 채팅방 이름을 생성합니다
 * @param {string} user1Email - 사용자 1 이메일
 * @param {string} user2Email - 사용자 2 이메일
 * @returns {string} 채팅방 이름
 */
export const generateDirectChatRoomName = (user1Email, user2Email) => {
    const name1 = user1Email?.split('@')[0] || 'User1'
    const name2 = user2Email?.split('@')[0] || 'User2'

    // 알파벳 순으로 정렬하여 일관성 유지
    const names = [name1, name2].sort()
    return `${names[0]} <> ${names[1]}`
}

/**
 * 개인 채팅방에서 상대방 정보를 가져옵니다
 * @param {Object} chatRoom - 채팅방 객체
 * @param {string} currentUserId - 현재 사용자 UUID
 * @returns {string|null} 상대방 UUID
 */
export const getOtherParticipant = (chatRoom, currentUserId) => {
    if (!chatRoom?.is_direct_message || !chatRoom?.direct_participants) {
        return null
    }

    const participants = chatRoom.direct_participants
    return participants.find(id => id !== currentUserId) || null
}

/**
 * 채팅방이 개인 채팅방인지 확인합니다
 * @param {Object} chatRoom - 채팅방 객체
 * @returns {boolean}
 */
export const isDirectMessage = (chatRoom) => {
    return chatRoom?.is_direct_message === true
}

/**
 * 개인 채팅방의 상대방 이름을 가져옵니다
 * @param {string} roomName - 채팅방 이름 (예: "user1 <> user2")
 * @param {string} currentUserEmail - 현재 사용자 이메일
 * @returns {string} 상대방 이름
 */
export const getOtherParticipantName = (roomName, currentUserEmail) => {
    if (!roomName || !roomName.includes('<>')) {
        return roomName
    }

    const currentUserName = currentUserEmail?.split('@')[0] || ''
    const [name1, name2] = roomName.split('<>').map(n => n.trim())

    // 현재 사용자가 아닌 쪽 이름 반환
    if (name1 === currentUserName) {
        return name2
    } else if (name2 === currentUserName) {
        return name1
    }

    return roomName
}