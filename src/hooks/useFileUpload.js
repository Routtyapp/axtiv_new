import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import OpenAI from 'openai'
import {
  validateFile,
  generateFilePath,
  createPreviewUrl,
  revokePreviewUrl,
  filterValidFiles,
  encodeFileToBase64,
  createFileForAPI,
  isAIAnalyzable,
  checkAPILimits
} from '../utils/fileUtils'

const useFileUpload = (workspaceId, user) => {
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const [errors, setErrors] = useState([])
  const [base64Data, setBase64Data] = useState({}) // AI 분석용 base64 데이터 저장

  // 파일 선택 핸들러
  const handleFileSelect = useCallback(async (files, provider = 'openai') => {
    const { validFiles, errors: validationErrors } = filterValidFiles(files)

    if (validationErrors.length > 0) {
      setErrors(prev => [...prev, ...validationErrors])
    }

    // API 크기 제한 검사
    const apiLimitCheck = checkAPILimits(validFiles)
    if (!apiLimitCheck.valid) {
      setErrors(prev => [...prev, { file: 'API 제한', error: apiLimitCheck.error }])
    }

    const filesWithPreview = validFiles.map(file => ({
      file,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      previewUrl: createPreviewUrl(file),
      uploading: false,
      uploaded: false,
      progress: 0,
      error: null,
      aiAnalyzable: isAIAnalyzable(file.type) // AI 분석 가능 여부
    }))

    // AI 분석 가능한 파일들의 base64 인코딩
    for (const fileItem of filesWithPreview) {
      if (fileItem.aiAnalyzable) {
        try {
          const base64 = await encodeFileToBase64(fileItem.file)
          setBase64Data(prev => ({
            ...prev,
            [fileItem.id]: {
              base64,
              apiObject: createFileForAPI(fileItem.file, base64, provider)
            }
          }))
        } catch (error) {
          console.error(`Base64 인코딩 실패 (${fileItem.file.name}):`, error)
          setErrors(prev => [...prev, {
            file: fileItem.file.name,
            error: 'AI 분석을 위한 파일 처리 중 오류가 발생했습니다.'
          }])
        }
      }
    }

    setSelectedFiles(prev => [...prev, ...filesWithPreview])
  }, [])

  // 개별 파일 제거
  const removeFile = useCallback((fileId) => {
    setSelectedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId)
      if (fileToRemove && fileToRemove.previewUrl) {
        revokePreviewUrl(fileToRemove.previewUrl)
      }
      return prev.filter(f => f.id !== fileId)
    })

    // base64 데이터도 제거
    setBase64Data(prev => {
      const newData = { ...prev }
      delete newData[fileId]
      return newData
    })
  }, [])

  // 모든 파일 제거
  const clearFiles = useCallback(() => {
    selectedFiles.forEach(fileItem => {
      if (fileItem.previewUrl) {
        revokePreviewUrl(fileItem.previewUrl)
      }
    })
    setSelectedFiles([])
    setUploadProgress({})
    setErrors([])
    setBase64Data({}) // base64 데이터도 초기화
  }, [selectedFiles])

  // OpenAI Vector Store에 파일 업로드
  const uploadToOpenAIVectorStore = async (file) => {
    // Vector Store ID를 함수 최상단에서 한 번만 읽기
    const vectorStoreId = import.meta.env.VITE_VECTOR_STORE_ID

    if (!vectorStoreId) {
      console.warn('⚠️ VITE_VECTOR_STORE_ID가 설정되지 않았습니다.')
      return null
    }

    try {
      // OpenAI 클라이언트 초기화
      const openai = new OpenAI({
        apiKey: import.meta.env.VITE_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true
      })

      console.log(`📤 Vector Store 업로드 시작: ${file.name}`)
      console.log(`🔑 Vector Store ID: ${vectorStoreId}`)

      // 1. OpenAI에 파일 업로드
      const openaiFile = await openai.files.create({
        file: file,
        purpose: 'assistants'
      })

      console.log(`✅ OpenAI 파일 업로드 완료: ${openaiFile.id}`)

      // 2. Vector Store에 파일 첨부
      const vectorStoreFile = await openai.vectorStores.files.create(
        vectorStoreId,
        {
          file_id: openaiFile.id
        }
      )

      console.log(`✅ Vector Store 첨부 완료: ${vectorStoreFile.id}`)

      // 3. 파일 처리 완료 대기 (최대 30초)
      let fileStatus = vectorStoreFile.status
      let attempts = 0
      const maxAttempts = 30

      while (fileStatus !== 'completed' && fileStatus !== 'failed' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000))

        const updatedFile = await openai.vectorStores.files.retrieve(
          vectorStoreId,
          vectorStoreFile.id
        )

        fileStatus = updatedFile.status
        attempts++

        console.log(`📊 Vector Store 처리 상태: ${fileStatus} (${attempts}/${maxAttempts})`)

        if (fileStatus === 'completed') {
          console.log(`✅ Vector Store 처리 완료: ${file.name}`)
          return {
            openaiFileId: openaiFile.id,
            vectorStoreFileId: vectorStoreFile.id,
            status: 'completed'
          }
        } else if (fileStatus === 'failed') {
          console.error(`❌ Vector Store 처리 실패: ${file.name}`)
          return {
            openaiFileId: openaiFile.id,
            vectorStoreFileId: vectorStoreFile.id,
            status: 'failed'
          }
        }
      }

      // 타임아웃
      if (attempts >= maxAttempts) {
        console.warn(`⚠️ Vector Store 처리 타임아웃: ${file.name}`)
        return {
          openaiFileId: openaiFile.id,
          vectorStoreFileId: vectorStoreFile.id,
          status: 'timeout'
        }
      }

      return null

    } catch (error) {
      console.error(`❌ Vector Store 업로드 실패 (${file.name}):`, error)
      throw error
    }
  }

  // 개별 파일 업로드
  const uploadSingleFile = async (fileItem, messageId) => {
    const { file, id } = fileItem

    try {
      // 파일 경로 생성
      const filePath = generateFilePath(workspaceId, file.name)

      // Supabase Storage에 업로드
      const { data: storageData, error: storageError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false
        })

      if (storageError) {
        throw storageError
      }

      // 파일 URL 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath)

      // AI 분석 가능한 파일이면 OpenAI Vector Store에도 업로드
      let vectorStoreData = null
      if (fileItem.aiAnalyzable) {
        try {
          vectorStoreData = await uploadToOpenAIVectorStore(file)
          console.log(`🎯 Vector Store 업로드 결과:`, vectorStoreData)
        } catch (vectorError) {
          console.warn(`⚠️ Vector Store 업로드 실패 (계속 진행):`, vectorError)
          // Vector Store 업로드 실패해도 메시지 전송은 계속 진행
        }
      }

      // 데이터베이스에 파일 메타데이터 저장 (message_id는 나중에 연결)
      const { data: fileData, error: dbError } = await supabase
        .from('chat_files')
        .insert({
          message_id: null, // 임시로 null로 설정, 나중에 실제 메시지 ID로 업데이트
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_path: filePath,
          storage_url: publicUrl,
          uploaded_by: user.id
        })
        .select()
        .single()

      if (dbError) {
        // 업로드된 파일 삭제 (롤백)
        await supabase.storage.from('chat-files').remove([filePath])
        throw dbError
      }

      return {
        id: fileData.id,
        name: file.name,
        type: file.type,
        size: file.size,
        url: publicUrl,
        path: filePath,
        vectorStore: vectorStoreData // Vector Store 정보 포함
      }

    } catch (error) {
      console.error(`파일 업로드 실패 (${file.name}):`, error)
      throw error
    }
  }

  // 모든 파일 업로드
  const uploadFiles = useCallback(async (messageId) => {
    if (selectedFiles.length === 0) return []

    setUploading(true)
    setErrors([])

    const uploadPromises = selectedFiles.map(async (fileItem) => {
      try {
        // 업로드 상태 업데이트
        setSelectedFiles(prev =>
          prev.map(f =>
            f.id === fileItem.id
              ? { ...f, uploading: true, progress: 0 }
              : f
          )
        )

        const result = await uploadSingleFile(fileItem, messageId)

        // 성공 상태 업데이트
        setSelectedFiles(prev =>
          prev.map(f =>
            f.id === fileItem.id
              ? { ...f, uploading: false, uploaded: true, progress: 100 }
              : f
          )
        )

        return result

      } catch (error) {
        // 실패 상태 업데이트
        setSelectedFiles(prev =>
          prev.map(f =>
            f.id === fileItem.id
              ? { ...f, uploading: false, error: error.message }
              : f
          )
        )

        setErrors(prev => [...prev, {
          file: fileItem.file.name,
          error: error.message
        }])

        return null
      }
    })

    const results = await Promise.all(uploadPromises)
    setUploading(false)

    // 성공적으로 업로드된 파일들만 반환
    return results.filter(result => result !== null)
  }, [selectedFiles, workspaceId, user])

  // 드래그 앤 드롭 핸들러들
  const handleDragOver = useCallback((event) => {
    event.preventDefault()
    event.stopPropagation()
  }, [])

  const handleDragEnter = useCallback((event) => {
    event.preventDefault()
    event.stopPropagation()
  }, [])

  const handleDragLeave = useCallback((event) => {
    event.preventDefault()
    event.stopPropagation()
  }, [])

  const handleDrop = useCallback((event) => {
    event.preventDefault()
    event.stopPropagation()

    const files = event.dataTransfer.files
    if (files && files.length > 0) {
      handleFileSelect(files)
    }
  }, [handleFileSelect])

  // 에러 제거
  const dismissError = useCallback((index) => {
    setErrors(prev => prev.filter((_, i) => i !== index))
  }, [])

  // 업로드 진행률 계산
  const getTotalProgress = useCallback(() => {
    if (selectedFiles.length === 0) return 0

    const totalProgress = selectedFiles.reduce((sum, file) => sum + file.progress, 0)
    return Math.round(totalProgress / selectedFiles.length)
  }, [selectedFiles])

  // AI 분석용 파일 데이터 가져오기 (provider별 형식 적용)
  const getAIFiles = useCallback((provider = 'openai') => {
    return selectedFiles
      .filter(fileItem => fileItem.aiAnalyzable && base64Data[fileItem.id])
      .map(fileItem => {
        const base64 = base64Data[fileItem.id].base64
        return {
          id: fileItem.id,
          name: fileItem.file.name,
          type: fileItem.file.type,
          apiObject: createFileForAPI(fileItem.file, base64, provider)
        }
      })
  }, [selectedFiles, base64Data])

  // AI 분석 가능한 파일이 있는지 확인
  const hasAIAnalyzableFiles = useCallback(() => {
    return selectedFiles.some(fileItem => fileItem.aiAnalyzable)
  }, [selectedFiles])

  return {
    selectedFiles,
    uploading,
    uploadProgress,
    errors,
    handleFileSelect,
    removeFile,
    clearFiles,
    uploadFiles,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    dismissError,
    getTotalProgress,
    getAIFiles, // AI 분석용 파일 데이터
    hasAIAnalyzableFiles, // AI 분석 가능한 파일 존재 여부
    hasFiles: selectedFiles.length > 0,
    hasErrors: errors.length > 0
  }
}

export default useFileUpload