// 파일 처리 관련 유틸리티 함수들

// 지원하는 파일 타입과 크기 제한 (bytes)
export const FILE_TYPES = {
  images: {
    types: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
    icon: '🖼️'
  },
  documents: {
    types: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown'],
    maxSize: 50 * 1024 * 1024, // 50MB
    icon: '📄'
  },
  videos: {
    types: ['video/mp4', 'video/mov', 'video/avi', 'video/quicktime'],
    maxSize: 100 * 1024 * 1024, // 100MB
    icon: '🎥'
  },
  archives: {
    types: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'],
    maxSize: 100 * 1024 * 1024, // 100MB
    icon: '📦'
  }
}

// 파일 타입 카테고리 확인
export const getFileCategory = (mimeType) => {
  for (const [category, config] of Object.entries(FILE_TYPES)) {
    if (config.types.includes(mimeType)) {
      return category
    }
  }
  return 'unknown'
}

// 파일 아이콘 가져오기
export const getFileIcon = (mimeType) => {
  const category = getFileCategory(mimeType)
  return FILE_TYPES[category]?.icon || '📎'
}

// 파일 유효성 검사
export const validateFile = (file) => {
  const category = getFileCategory(file.type)

  if (category === 'unknown') {
    return {
      valid: false,
      error: `지원하지 않는 파일 형식입니다: ${file.type}`
    }
  }

  const maxSize = FILE_TYPES[category].maxSize
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `파일 크기가 너무 큽니다. 최대 ${formatFileSize(maxSize)} 까지 지원됩니다.`
    }
  }

  return { valid: true }
}

// 파일 크기를 사람이 읽기 쉬운 형태로 변환
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 파일명에서 확장자 추출
export const getFileExtension = (filename) => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2)
}

// 안전한 파일명 생성 (특수문자 제거 등)
export const sanitizeFileName = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // 특수문자를 _로 대체
    .replace(/_{2,}/g, '_') // 연속된 _를 하나로
    .toLowerCase()
}

// 고유한 파일 경로 생성
export const generateFilePath = (workspaceId, filename) => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 8)

  const extension = getFileExtension(filename)
  const baseName = filename.replace(`.${extension}`, '')
  const safeName = sanitizeFileName(baseName)

  return `${workspaceId}/${year}/${month}/${day}/${timestamp}_${randomString}_${safeName}.${extension}`
}

// 이미지 파일인지 확인
export const isImageFile = (mimeType) => {
  return FILE_TYPES.images.types.includes(mimeType)
}

// 파일을 Base64로 변환 (미리보기용)
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = (error) => reject(error)
  })
}

// 파일을 순수 Base64 문자열로 인코딩 (AI API 전송용)
export const encodeFileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // data:image/jpeg;base64, 부분을 제거하고 순수 base64만 반환
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// OpenAI API 호출용 파일 객체 생성
export const createFileForOpenAI = (file, base64Data) => {
  // 이미지 파일인 경우
  if (isImageFile(file.type)) {
    return {
      type: "input_image",
      image_url: `data:${file.type};base64,${base64Data}`
    }
  }

  // 텍스트/문서 파일인 경우 (향후 확장 가능)
  return {
    type: "input_text",
    text: `[파일: ${file.name}]` // 실제로는 텍스트 추출 로직 필요
  }
}

// PDF 파일인지 확인
export const isPDFFile = (mimeType) => {
  return mimeType === 'application/pdf'
}

// Claude API 호출용 파일 객체 생성
export const createFileForClaude = (file, base64Data) => {
  // 이미지 파일인 경우
  if (isImageFile(file.type)) {
    return {
      type: "image",
      source: {
        type: "base64",
        media_type: file.type,
        data: base64Data
      }
    }
  }

  // PDF 파일인 경우
  if (isPDFFile(file.type)) {
    return {
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: base64Data
      }
    }
  }

  // 텍스트/문서 파일인 경우 (향후 확장 가능)
  return {
    type: "text",
    text: `[파일: ${file.name}]` // 실제로는 텍스트 추출 로직 필요
  }
}

// 통합 API 호출용 파일 객체 생성 (provider에 따라 형식 선택)
export const createFileForAPI = (file, base64Data, provider = 'openai') => {
  if (provider === 'claude' || provider === 'anthropic') {
    return createFileForClaude(file, base64Data)
  }
  return createFileForOpenAI(file, base64Data)
}

// AI 분석 가능한 파일인지 확인
export const isAIAnalyzable = (mimeType) => {
  // 이미지와 PDF 파일 지원
  const supportedTypes = [
    ...FILE_TYPES.images.types,
    'application/pdf',
    'text/plain',
    'text/markdown'
  ]
  return supportedTypes.includes(mimeType)
}

// Claude API에서 지원하는 파일인지 확인
export const isClaudeSupported = (mimeType) => {
  return isImageFile(mimeType) || isPDFFile(mimeType)
}

// Base64 데이터 크기 계산 (원본 파일 크기 * 1.33)
export const getBase64Size = (file) => {
  return Math.ceil(file.size * 1.33)
}

// API 요청 크기 제한 확인 (OpenAI 기준)
export const checkAPILimits = (files) => {
  const totalSize = files.reduce((sum, file) => sum + getBase64Size(file), 0)
  const maxSize = 20 * 1024 * 1024 // 20MB (OpenAI 제한)

  if (totalSize > maxSize) {
    return {
      valid: false,
      error: `파일들의 총 크기가 API 제한(${formatFileSize(maxSize)})을 초과합니다. 현재: ${formatFileSize(totalSize)}`
    }
  }

  return { valid: true }
}

// 이미지 미리보기 URL 생성
export const createPreviewUrl = (file) => {
  if (!isImageFile(file.type)) {
    return null
  }
  return URL.createObjectURL(file)
}

// 메모리 누수 방지를 위한 미리보기 URL 해제
export const revokePreviewUrl = (url) => {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

// 파일 타입별 썸네일 생성
export const generateThumbnail = async (file, maxWidth = 200, maxHeight = 200) => {
  if (!isImageFile(file.type)) {
    return null
  }

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // 비율 유지하면서 리사이즈
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      canvas.toBlob(resolve, 'image/jpeg', 0.8)
    }

    img.src = URL.createObjectURL(file)
  })
}

// 드래그 앤 드롭 유틸리티
export const isDragEventWithFiles = (event) => {
  return event.dataTransfer &&
         event.dataTransfer.types &&
         event.dataTransfer.types.includes('Files')
}

// 파일 목록에서 유효한 파일만 필터링
export const filterValidFiles = (files) => {
  const validFiles = []
  const errors = []

  Array.from(files).forEach((file, index) => {
    const validation = validateFile(file)
    if (validation.valid) {
      validFiles.push(file)
    } else {
      errors.push({ file: file.name, error: validation.error, index })
    }
  })

  return { validFiles, errors }
}