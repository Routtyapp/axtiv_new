import { useState } from 'react'
import { Flex, Text, Grid } from '@radix-ui/themes'
import { Button, Tooltip } from '../ui'
import { getFileIcon, formatFileSize, isImageFile } from '../../utils/fileUtils'

const FileMessage = ({ files }) => {
  const [selectedImage, setSelectedImage] = useState(null)

  if (!files || files.length === 0) return null

  const handleImageClick = (file) => {
    if (isImageFile(file.type)) {
      setSelectedImage(file)
    }
  }

  const handleDownload = (file) => {
    // 파일 다운로드 처리
    const link = document.createElement('a')
    link.href = file.url
    link.download = file.name
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const closeImageViewer = () => {
    setSelectedImage(null)
  }

  return (
    <>
      <div className="file-message mt-2">
        {files.length === 1 ? (
          // 단일 파일 표시
          <SingleFileDisplay
            file={files[0]}
            onImageClick={handleImageClick}
            onDownload={handleDownload}
          />
        ) : (
          // 다중 파일 그리드 표시
          <MultiFileDisplay
            files={files}
            onImageClick={handleImageClick}
            onDownload={handleDownload}
          />
        )}
      </div>

      {/* 이미지 확대보기 모달 */}
      {selectedImage && (
        <ImageViewer
          file={selectedImage}
          onClose={closeImageViewer}
        />
      )}
    </>
  )
}

// 단일 파일 표시 컴포넌트
const SingleFileDisplay = ({ file, onImageClick, onDownload }) => {
  const isImage = isImageFile(file.type)

  if (isImage) {
    return (
      <div className="single-image-file">
        <div
          className="relative cursor-pointer group max-w-md"
          onClick={() => onImageClick(file)}
        >
          <img
            src={file.url}
            alt={file.name}
            className="rounded-lg max-w-full h-auto max-h-64 object-contain"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-lg flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
              클릭하여 확대
            </div>
          </div>
        </div>
        <FileInfo file={file} onDownload={onDownload} />
      </div>
    )
  }

  return <FileItem file={file} onDownload={onDownload} />
}

// 다중 파일 그리드 표시 컴포넌트
const MultiFileDisplay = ({ files, onImageClick, onDownload }) => {
  const imageFiles = files.filter(file => isImageFile(file.type))
  const otherFiles = files.filter(file => !isImageFile(file.type))

  return (
    <div className="multi-file-display space-y-3">
      {/* 이미지 파일들 그리드로 표시 */}
      {imageFiles.length > 0 && (
        <div className="image-grid">
          <Grid
            columns={imageFiles.length === 1 ? '1' : imageFiles.length === 2 ? '2' : '3'}
            gap="2"
          >
            {imageFiles.map((file) => (
              <div
                key={file.id}
                className="relative cursor-pointer group"
                onClick={() => onImageClick(file)}
              >
                <img
                  src={file.url}
                  alt={file.name}
                  className="rounded-md w-full h-20 object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-md flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-70 text-white px-1 py-0.5 rounded text-xs">
                    확대
                  </div>
                </div>
              </div>
            ))}
          </Grid>
          <Text size="1" color="gray" className="mt-1">
            이미지 {imageFiles.length}개 - 클릭하여 확대 보기
          </Text>
        </div>
      )}

      {/* 기타 파일들 목록으로 표시 */}
      {otherFiles.length > 0 && (
        <div className="other-files space-y-2">
          {otherFiles.map((file) => (
            <FileItem
              key={file.id}
              file={file}
              onDownload={onDownload}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// 개별 파일 아이템 컴포넌트
const FileItem = ({ file, onDownload }) => {
  return (
    <div className="file-item border border-gray-200 rounded-md p-2 bg-gray-50 hover:bg-gray-100 transition-colors">
      <Flex gap="3" align="center">
        <div className="flex-shrink-0 text-2xl">
          {getFileIcon(file.type)}
        </div>

        <div className="flex-1 min-w-0">
          <Text size="2" weight="medium" className="truncate block">
            {file.name}
          </Text>
          <Text size="1" color="gray">
            {formatFileSize(file.size)}
          </Text>
        </div>

        <Tooltip content="다운로드">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDownload(file)}
            className="text-gray-600 hover:text-gray-800"
          >
            ⬇️
          </Button>
        </Tooltip>
      </Flex>
    </div>
  )
}

// 파일 정보 표시 컴포넌트
const FileInfo = ({ file, onDownload }) => {
  return (
    <div className="file-info mt-1">
      <Flex justify="between" align="center">
        <div>
          <Text size="1" color="gray" className="block truncate">
            {file.name}
          </Text>
          <Text size="1" color="gray">
            {formatFileSize(file.size)}
          </Text>
        </div>
        <Tooltip content="다운로드">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDownload(file)}
            className="text-gray-600 hover:text-gray-800"
          >
            ⬇️
          </Button>
        </Tooltip>
      </Flex>
    </div>
  )
}

// 이미지 확대보기 모달
const ImageViewer = ({ file, onClose }) => {
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative max-w-4xl max-h-full">
        <img
          src={file.url}
          alt={file.name}
          className="max-w-full max-h-full object-contain"
        />

        {/* 닫기 버튼 */}
        <Button
          variant="solid"
          size="sm"
          className="absolute top-2 right-2 bg-black bg-opacity-50 text-white hover:bg-opacity-70"
          onClick={onClose}
        >
          ×
        </Button>

        {/* 파일 정보 */}
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-3">
          <Flex justify="between" align="center">
            <div>
              <Text size="2" weight="medium" className="block">
                {file.name}
              </Text>
              <Text size="1" color="gray">
                {formatFileSize(file.size)}
              </Text>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white hover:bg-opacity-20"
              onClick={() => {
                const link = document.createElement('a')
                link.href = file.url
                link.download = file.name
                link.target = '_blank'
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
              }}
            >
              ⬇️
            </Button>
          </Flex>
        </div>
      </div>
    </div>
  )
}

export default FileMessage