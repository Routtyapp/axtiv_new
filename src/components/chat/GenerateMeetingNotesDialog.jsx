/**
 * GenerateMeetingNotesDialog.jsx
 *
 * 회의록 생성 다이얼로그
 * - 시간 범위 선택
 * - 메시지 미리보기
 * - 회의록 생성 옵션
 */

import { useState, useEffect } from 'react'
import { Dialog, Button, Input } from '../ui'
import { Calendar, Clock, FileText, Loader2 } from 'lucide-react'
import { useMeetingNotes } from '../../hooks/useMeetingNotes'

const GenerateMeetingNotesDialog = ({
  open,
  onOpenChange,
  onSuccess,
  workspaceId,
  chatRoomId,
  chatRoomName
}) => {
  // 기본값: 최근 1시간
  const getDefaultTimeRange = () => {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    return {
      startTime: oneHourAgo.toISOString().slice(0, 16), // YYYY-MM-DDTHH:MM
      endTime: now.toISOString().slice(0, 16)
    }
  }

  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [messageCount, setMessageCount] = useState(0)
  const [previewLoading, setPreviewLoading] = useState(false)

  const {
    loading,
    error,
    fetchMessagesInRange,
    createMeetingNotesStreaming
  } = useMeetingNotes(workspaceId, chatRoomId)

  // 다이얼로그 열릴 때 초기화
  useEffect(() => {
    if (open) {
      const defaults = getDefaultTimeRange()
      setStartTime(defaults.startTime)
      setEndTime(defaults.endTime)
      setMessageCount(0)
    }
  }, [open])

  // 시간 범위 변경 시 메시지 수 미리보기
  useEffect(() => {
    if (open && startTime && endTime) {
      handlePreview()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime, endTime, open])

  /**
   * 메시지 수 미리보기
   */
  const handlePreview = async () => {
    if (!startTime || !endTime) return

    try {
      setPreviewLoading(true)
      const messages = await fetchMessagesInRange(
        new Date(startTime).toISOString(),
        new Date(endTime).toISOString()
      )
      setMessageCount(messages.length)
    } catch (err) {
      console.error('미리보기 오류:', err)
      setMessageCount(0)
    } finally {
      setPreviewLoading(false)
    }
  }

  /**
   * 회의록 생성
   */
  const handleGenerate = async () => {
    if (!startTime || !endTime) {
      alert('시작 시간과 종료 시간을 모두 선택해주세요.')
      return
    }

    if (messageCount === 0) {
      alert('선택한 시간 범위에 메시지가 없습니다.')
      return
    }

    try {
      // 메시지 조회
      const messages = await fetchMessagesInRange(
        new Date(startTime).toISOString(),
        new Date(endTime).toISOString()
      )

      if (messages.length === 0) {
        alert('선택한 시간 범위에 메시지가 없습니다.')
        return
      }

      // 회의 메타데이터
      const metadata = {
        chatRoomName,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString()
      }

      // 회의록 생성 (스트리밍 모드)
      const generatedNotes = await createMeetingNotesStreaming(
        messages,
        metadata,
        null // 스트리밍 콜백 불필요
      )

      // 성공 시 부모 컴포넌트에 알림
      if (onSuccess) {
        onSuccess({
          content: generatedNotes,
          metadata: {
            ...metadata,
            messageCount: messages.length
          },
          messages
        })
      }

      onOpenChange(false)

    } catch (err) {
      console.error('회의록 생성 오류:', err)
      alert(`회의록 생성 중 오류가 발생했습니다: ${err.message}`)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="📝 회의록 생성"
      description="선택한 시간 범위의 대화 내용을 분석하여 회의록을 생성합니다."
      confirmText={loading ? "생성 중..." : "회의록 생성"}
      cancelText="취소"
      onConfirm={handleGenerate}
      onCancel={handleClose}
      confirmDisabled={loading || messageCount === 0 || !startTime || !endTime}
    >
      <div className="space-y-6">
        {/* 채팅방 정보 */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <FileText className="h-4 w-4" />
            <span className="font-medium">{chatRoomName}</span>
          </div>
        </div>

        {/* 시간 범위 선택 */}
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Calendar className="h-4 w-4" />
              시작 시간
            </label>
            <Input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={loading}
              className="w-full"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Clock className="h-4 w-4" />
              종료 시간
            </label>
            <Input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              disabled={loading}
              className="w-full"
            />
          </div>
        </div>

        {/* 빠른 선택 버튼 */}
        <div className="space-y-2">
          <div className="text-sm font-medium">빠른 선택</div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const now = new Date()
                const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
                setStartTime(oneHourAgo.toISOString().slice(0, 16))
                setEndTime(now.toISOString().slice(0, 16))
              }}
              disabled={loading}
            >
              최근 1시간
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const now = new Date()
                const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000)
                setStartTime(threeHoursAgo.toISOString().slice(0, 16))
                setEndTime(now.toISOString().slice(0, 16))
              }}
              disabled={loading}
            >
              최근 3시간
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const now = new Date()
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                setStartTime(today.toISOString().slice(0, 16))
                setEndTime(now.toISOString().slice(0, 16))
              }}
              disabled={loading}
            >
              오늘
            </Button>
          </div>
        </div>

        {/* 메시지 미리보기 */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">선택된 메시지</div>
            {previewLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>확인 중...</span>
              </div>
            ) : (
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {messageCount}개
              </div>
            )}
          </div>

          {messageCount > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              💡 {messageCount}개의 메시지를 분석하여 회의록을 작성합니다.
            </div>
          )}

          {messageCount === 0 && !previewLoading && startTime && endTime && (
            <div className="mt-2 text-xs text-red-500">
              ⚠️ 선택한 시간 범위에 메시지가 없습니다.
            </div>
          )}
        </div>

        {/* 오류 표시 */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="text-sm text-red-800 dark:text-red-200">
              ⚠️ {error}
            </div>
          </div>
        )}

        {/* 안내 문구 */}
        <div className="text-sm text-gray-500 space-y-1">
          <p>✨ AI가 다음 내용을 분석하여 회의록을 작성합니다:</p>
          <ul className="list-disc list-inside pl-2 space-y-0.5">
            <li>전반적인 안건 및 주제</li>
            <li>참가자별 의견 및 기여도</li>
            <li>결정 사항 및 액션 아이템</li>
            <li>AI 제안사항</li>
          </ul>
        </div>
      </div>
    </Dialog>
  )
}

export default GenerateMeetingNotesDialog
