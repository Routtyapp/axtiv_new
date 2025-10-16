/**
 * useMeetingNotes.js
 *
 * 회의록 생성 및 관리를 위한 커스텀 Hook
 * - 시간 범위 기반 메시지 조회
 * - AI 회의록 생성
 * - 회의록 저장 및 조회
 */

import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  generateMeetingNotes,
  generateMeetingNotesStreaming,
  generateMeetingTitle
} from '../utils/meetingNotesGenerator'

export const useMeetingNotes = (workspaceId, chatRoomId) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [messages, setMessages] = useState([])
  const [generatedNotes, setGeneratedNotes] = useState('')
  const [saving, setSaving] = useState(false)

  /**
   * 시간 범위 내의 메시지 조회
   *
   * @param {string} startTime - 시작 시간 (ISO 8601)
   * @param {string} endTime - 종료 시간 (ISO 8601)
   * @returns {Promise<Array>} 메시지 배열
   */
  const fetchMessagesInRange = useCallback(async (startTime, endTime) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('chat_messages')
        .select('id, sender_id, sender_name, content, message_type, created_at')
        .eq('chat_room_id', chatRoomId)
        .gte('created_at', startTime)
        .lte('created_at', endTime)
        .order('created_at', { ascending: true })

      if (fetchError) {
        throw fetchError
      }

      // AI 메시지 제외 (선택적)
      const userMessages = data.filter(msg => msg.message_type !== 'system')

      setMessages(userMessages)
      return userMessages

    } catch (err) {
      console.error('메시지 조회 오류:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [chatRoomId])

  /**
   * 회의록 생성 (일반 모드)
   *
   * @param {Array} messagesToAnalyze - 분석할 메시지 배열
   * @param {Object} metadata - 회의 메타데이터
   * @param {Object} options - 생성 옵션
   * @returns {Promise<string>} 생성된 회의록
   */
  const createMeetingNotes = useCallback(async (messagesToAnalyze, metadata = {}, options = {}) => {
    try {
      setLoading(true)
      setError(null)

      if (!messagesToAnalyze || messagesToAnalyze.length === 0) {
        throw new Error('분석할 메시지가 없습니다.')
      }

      // AI 회의록 생성
      const notes = await generateMeetingNotes(messagesToAnalyze, metadata, options)

      setGeneratedNotes(notes)
      return notes

    } catch (err) {
      console.error('회의록 생성 오류:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * 회의록 생성 (스트리밍 모드)
   *
   * @param {Array} messagesToAnalyze - 분석할 메시지 배열
   * @param {Object} metadata - 회의 메타데이터
   * @param {Function} onUpdate - 스트리밍 업데이트 콜백
   * @param {Object} options - 생성 옵션
   * @returns {Promise<string>} 완성된 회의록
   */
  const createMeetingNotesStreaming = useCallback(async (
    messagesToAnalyze,
    metadata = {},
    onUpdate,
    options = {}
  ) => {
    try {
      setLoading(true)
      setError(null)

      if (!messagesToAnalyze || messagesToAnalyze.length === 0) {
        throw new Error('분석할 메시지가 없습니다.')
      }

      // 스트리밍 회의록 생성
      const notes = await generateMeetingNotesStreaming(
        messagesToAnalyze,
        metadata,
        (partialText) => {
          setGeneratedNotes(partialText)
          if (onUpdate) {
            onUpdate(partialText)
          }
        },
        options
      )

      setGeneratedNotes(notes)
      return notes

    } catch (err) {
      console.error('스트리밍 회의록 생성 오류:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * 회의록을 데이터베이스에 저장
   *
   * @param {Object} noteData - 저장할 회의록 데이터
   * @returns {Promise<Object>} 저장된 회의록 객체
   */
  const saveMeetingNotes = useCallback(async (noteData) => {
    try {
      setSaving(true)
      setError(null)

      const {
        title,
        content,
        startTime,
        endTime,
        messageCount,
        metadata = {}
      } = noteData

      // 현재 사용자 정보 가져오기
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('사용자 인증 정보를 가져올 수 없습니다.')
      }

      // 회의록 저장
      const { data, error: insertError } = await supabase
        .from('meeting_notes')
        .insert({
          workspace_id: workspaceId,
          chat_room_id: chatRoomId,
          title: title || generateMeetingTitle(metadata),
          content: content,
          start_time: startTime,
          end_time: endTime,
          message_count: messageCount || 0,
          created_by: user.id,
          metadata: metadata
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      return data

    } catch (err) {
      console.error('회의록 저장 오류:', err)
      setError(err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [workspaceId, chatRoomId])

  /**
   * 워크스페이스의 회의록 목록 조회
   *
   * @param {Object} options - 조회 옵션 (limit, offset 등)
   * @returns {Promise<Array>} 회의록 목록
   */
  const fetchMeetingNotesList = useCallback(async (options = {}) => {
    try {
      setLoading(true)
      setError(null)

      const {
        limit = 50,
        offset = 0,
        chatRoomIdFilter = null
      } = options

      let query = supabase
        .from('meeting_notes')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // 채팅방 필터 적용 (선택적)
      if (chatRoomIdFilter) {
        query = query.eq('chat_room_id', chatRoomIdFilter)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        throw fetchError
      }

      return data

    } catch (err) {
      console.error('회의록 목록 조회 오류:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  /**
   * 특정 회의록 조회
   *
   * @param {string} noteId - 회의록 ID
   * @returns {Promise<Object>} 회의록 객체
   */
  const fetchMeetingNote = useCallback(async (noteId) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('meeting_notes')
        .select('*')
        .eq('id', noteId)
        .single()

      if (fetchError) {
        throw fetchError
      }

      setGeneratedNotes(data.content)
      return data

    } catch (err) {
      console.error('회의록 조회 오류:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * 회의록 삭제
   *
   * @param {string} noteId - 삭제할 회의록 ID
   * @returns {Promise<void>}
   */
  const deleteMeetingNote = useCallback(async (noteId) => {
    try {
      setLoading(true)
      setError(null)

      const { error: deleteError } = await supabase
        .from('meeting_notes')
        .delete()
        .eq('id', noteId)

      if (deleteError) {
        throw deleteError
      }

    } catch (err) {
      console.error('회의록 삭제 오류:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * 회의록 업데이트
   *
   * @param {string} noteId - 회의록 ID
   * @param {Object} updates - 업데이트할 필드
   * @returns {Promise<Object>} 업데이트된 회의록
   */
  const updateMeetingNote = useCallback(async (noteId, updates) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: updateError } = await supabase
        .from('meeting_notes')
        .update(updates)
        .eq('id', noteId)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      return data

    } catch (err) {
      console.error('회의록 업데이트 오류:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    // 상태
    loading,
    error,
    messages,
    generatedNotes,
    saving,

    // 메서드
    fetchMessagesInRange,
    createMeetingNotes,
    createMeetingNotesStreaming,
    saveMeetingNotes,
    fetchMeetingNotesList,
    fetchMeetingNote,
    deleteMeetingNote,
    updateMeetingNote,

    // 유틸리티
    setGeneratedNotes,
    setError
  }
}

export default useMeetingNotes
