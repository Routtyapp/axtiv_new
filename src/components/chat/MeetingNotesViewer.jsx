/**
 * MeetingNotesViewer.jsx
 *
 * 생성된 회의록을 표시하고 관리하는 컴포넌트
 * - Markdown 렌더링
 * - 복사, 다운로드, 저장 기능
 */

import { useState } from 'react'
import { Dialog, Button } from '../ui'
import { Copy, Download, Save, Check, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useMeetingNotes } from '../../hooks/useMeetingNotes'
import { generateMeetingTitle } from '../../utils/meetingNotesGenerator'

const MeetingNotesViewer = ({
  open,
  onOpenChange,
  content,
  metadata = {},
  onSaveSuccess,
  workspaceId,
  chatRoomId
}) => {
  const [copied, setCopied] = useState(false)

  const { saveMeetingNotes, saving, error } = useMeetingNotes(workspaceId, chatRoomId)

  /**
   * 클립보드에 복사
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('복사 오류:', err)
      alert('복사에 실패했습니다.')
    }
  }

  /**
   * Markdown 파일로 다운로드
   */
  const handleDownload = () => {
    try {
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      const fileName = generateMeetingTitle(metadata)
        .replace(/[^a-zA-Z0-9가-힣\s\-_]/g, '')
        .replace(/\s+/g, '_')

      link.download = `${fileName}.md`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('다운로드 오류:', err)
      alert('다운로드에 실패했습니다.')
    }
  }

  /**
   * 데이터베이스에 저장
   */
  const handleSave = async () => {
    try {
      const noteData = {
        title: generateMeetingTitle(metadata),
        content: content,
        startTime: metadata.startTime,
        endTime: metadata.endTime,
        messageCount: metadata.messageCount || 0,
        metadata: metadata
      }

      const savedNote = await saveMeetingNotes(noteData)

      alert('회의록이 성공적으로 저장되었습니다!')

      if (onSaveSuccess) {
        onSaveSuccess(savedNote)
      }

      onOpenChange(false)

    } catch (err) {
      console.error('저장 오류:', err)
      alert(`저장 중 오류가 발생했습니다: ${err.message}`)
    }
  }

  const handleClose = () => {
    if (!saving) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="📝 생성된 회의록"
      description="AI가 작성한 회의록을 확인하고 저장하세요."
      size="large"
    >
      <div className="space-y-4">
        {/* 액션 버튼 */}
        <div className="flex justify-end gap-2 pb-3 border-b">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={saving}
            className="flex items-center gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                복사됨
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                복사
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            다운로드
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                저장
              </>
            )}
          </Button>
        </div>

        {/* 오류 표시 */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="text-sm text-red-800 dark:text-red-200">
              ⚠️ {error}
            </div>
          </div>
        )}

        {/* Markdown 렌더링 */}
        <div className="prose dark:prose-invert max-w-none overflow-y-auto max-h-[60vh] p-4 bg-white dark:bg-gray-900 rounded-lg border">
          <ReactMarkdown
            components={{
              // 체크박스 커스터마이징
              input: ({ node, ...props }) => (
                <input
                  {...props}
                  className="mr-2 cursor-pointer"
                  onChange={(e) => {
                    // 클릭 시 체크 상태 변경 (읽기 전용이지만 시각적 피드백)
                    e.target.checked = !e.target.checked
                  }}
                />
              ),
              // 링크 새 탭에서 열기
              a: ({ node, ...props }) => (
                <a {...props} target="_blank" rel="noopener noreferrer" />
              ),
              // 코드 블록 스타일링
              code: ({ node, inline, ...props }) =>
                inline ? (
                  <code
                    {...props}
                    className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm"
                  />
                ) : (
                  <code {...props} className="block p-3 bg-gray-100 dark:bg-gray-800 rounded" />
                )
            }}
          >
            {content}
          </ReactMarkdown>
        </div>

        {/* 메타정보 */}
        {metadata.messageCount && (
          <div className="text-xs text-gray-500 text-right">
            {metadata.messageCount}개의 메시지를 분석하여 작성됨
          </div>
        )}

        {/* 안내 문구 */}
        <div className="text-sm text-gray-500 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          💡 <strong>팁:</strong> 회의록을 저장하면 언제든지 다시 확인할 수 있습니다.
          필요시 내용을 복사하거나 다운로드하여 외부 문서에 활용하세요.
        </div>

        {/* 닫기 버튼 */}
        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            닫기
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

export default MeetingNotesViewer
