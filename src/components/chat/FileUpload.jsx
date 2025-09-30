import { useRef, useState } from 'react'
import { Flex, Text, Progress } from '@radix-ui/themes'
import { Button, Tooltip } from '../ui'
import { getFileIcon, formatFileSize, isImageFile, isAIAnalyzable } from '../../utils/fileUtils'

const FileUpload = ({
  selectedFiles,
  uploading,
  errors,
  onRemoveFile,
  onClearFiles,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onDismissError
}) => {
  const [isDragActive, setIsDragActive] = useState(false)

  const handleDragEnterWrapper = (event) => {
    onDragEnter(event)
    setIsDragActive(true)
  }

  const handleDragLeaveWrapper = (event) => {
    onDragLeave(event)
    // 실제로 컨테이너를 벗어났는지 확인
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDragActive(false)
    }
  }

  const handleDropWrapper = (event) => {
    onDrop(event)
    setIsDragActive(false)
  }

  return (
    <div className="file-upload">
      {/* 드래그 앤 드롭 영역 */}
      {selectedFiles.length > 0 && (
        <div
          className={`border-2 border-dashed rounded-lg p-4 mb-3 transition-colors ${
            isDragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 bg-gray-50'
          }`}
          onDragOver={onDragOver}
          onDragEnter={handleDragEnterWrapper}
          onDragLeave={handleDragLeaveWrapper}
          onDrop={handleDropWrapper}
        >
          <Text size="2" color="gray" align="center">
            {isDragActive ? '파일을 여기에 놓으세요' : '추가 파일을 드래그하거나 위 버튼을 클릭하세요'}
          </Text>
        </div>
      )}

      {/* 선택된 파일 목록 */}
      {selectedFiles.length > 0 && (
        <div className="selected-files mb-3">
          <Flex justify="between" align="center" mb="2">
            <Text size="2" weight="medium">
              선택된 파일 ({selectedFiles.length})
            </Text>
            <Button
              variant="ghost"
              size="1"
              color="red"
              onClick={onClearFiles}
              disabled={uploading}
            >
              모두 삭제
            </Button>
          </Flex>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {selectedFiles.map((fileItem) => (
              <FilePreview
                key={fileItem.id}
                fileItem={fileItem}
                onRemove={() => onRemoveFile(fileItem.id)}
                disabled={uploading}
              />
            ))}
          </div>
        </div>
      )}

      {/* 에러 메시지 */}
      {errors.length > 0 && (
        <div className="errors mb-3">
          {errors.map((error, index) => (
            <div
              key={index}
              className="bg-red-50 border border-red-200 rounded-md p-2 mb-2"
            >
              <Flex justify="between" align="start">
                <div>
                  <Text size="2" color="red" weight="medium">
                    {error.file}
                  </Text>
                  <Text size="1" color="red">
                    {error.error}
                  </Text>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDismissError(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </Button>
              </Flex>
            </div>
          ))}
        </div>
      )}

      {/* 업로드 진행률 */}
      {uploading && (
        <div className="upload-progress mb-3">
          <Flex justify="between" align="center" mb="1">
            <Text size="2" color="blue">
              업로드 중...
            </Text>
            <Text size="1" color="gray">
              {selectedFiles.filter(f => f.uploaded).length} / {selectedFiles.length}
            </Text>
          </Flex>
          <Progress
            value={selectedFiles.length > 0 ?
              (selectedFiles.filter(f => f.uploaded).length / selectedFiles.length) * 100 : 0
            }
            color="blue"
          />
        </div>
      )}
    </div>
  )
}

// 개별 파일 미리보기 컴포넌트
const FilePreview = ({ fileItem, onRemove, disabled }) => {
  const { file, previewUrl, uploading, uploaded, progress, error, aiAnalyzable } = fileItem

  return (
    <div className={`file-preview border rounded-md p-2 ${
      error ? 'border-red-300 bg-red-50' :
      uploaded ? 'border-green-300 bg-green-50' :
      uploading ? 'border-blue-300 bg-blue-50' :
      'border-gray-300 bg-white'
    }`}>
      <Flex gap="3" align="center">
        {/* 파일 아이콘/썸네일 */}
        <div className="flex-shrink-0 relative">
          {isImageFile(file.type) && previewUrl ? (
            <img
              src={previewUrl}
              alt={file.name}
              className="w-10 h-10 object-cover rounded"
            />
          ) : (
            <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded text-lg">
              {getFileIcon(file.type)}
            </div>
          )}

          {/* AI 분석 가능 표시 */}
          {aiAnalyzable && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
              <Text size="1" style={{ fontSize: '8px', color: 'white' }}>
                🤖
              </Text>
            </div>
          )}
        </div>

        {/* 파일 정보 */}
        <div className="flex-1 min-w-0">
          <Text size="2" weight="medium" className="truncate block">
            {file.name}
          </Text>
          <Text size="1" color="gray">
            {formatFileSize(file.size)}
            {aiAnalyzable && (
              <span className="ml-2 text-purple-600">
                · AI 분석 가능
              </span>
            )}
          </Text>

          {/* 상태 표시 */}
          {error && (
            <Text size="1" color="red">
              업로드 실패: {error}
            </Text>
          )}
          {uploading && (
            <div className="mt-1">
              <Progress value={progress} size="1" color="blue" />
            </div>
          )}
          {uploaded && (
            <Text size="1" color="green">
              ✓ 업로드 완료
            </Text>
          )}
        </div>

        {/* 삭제 버튼 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={disabled}
          className="text-red-500 hover:text-red-700"
        >
          ×
        </Button>
      </Flex>
    </div>
  )
}

export default FileUpload