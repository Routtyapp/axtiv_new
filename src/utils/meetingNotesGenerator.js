/**
 * meetingNotesGenerator.js
 *
 * AI를 활용한 회의록 자동 생성 유틸리티
 * - Claude API를 사용하여 채팅 메시지를 분석하고 구조화된 회의록 생성
 */

import Anthropic from '@anthropic-ai/sdk'

/**
 * 시스템 프롬프트: 회의록 생성 지침
 *
 * 요구사항:
 * - 전반적인 안건과 주제 분석
 * - 각 참가자의 의견 정리
 * - 참가자별 대화 내용 분석
 * - 전체 결론 도출
 * - AI 제안사항 제공
 */
const MEETING_NOTES_SYSTEM_PROMPT = `당신은 전문적인 회의록 작성 전문가입니다.

주어진 채팅 대화 내용을 분석하여 체계적이고 전문적인 회의록을 작성해야 합니다.

## 작성 지침

1. **전반적인 안건과 주제 분석**
   - 대화의 주요 목적과 핵심 주제를 파악하세요
   - 논의된 모든 안건을 체계적으로 정리하세요

2. **참가자별 의견 정리**
   - 각 참가자가 제시한 주요 의견과 관점을 요약하세요
   - 참가자들의 입장 차이나 공통점을 분석하세요

3. **참가자별 대화 분석**
   - 각 참가자가 어떤 내용을 중점적으로 논의했는지 분석하세요
   - 참가자의 기여도와 역할을 파악하세요

4. **전체 결론 정리**
   - 회의를 통해 도출된 결론과 합의사항을 명확히 정리하세요
   - 결정되지 않은 사항이 있다면 명시하세요

5. **AI 제안사항**
   - 논의 내용을 기반으로 추가적인 고려사항을 제안하세요
   - 실행 가능한 다음 단계나 개선 방안을 제시하세요
   - 놓칠 수 있는 리스크나 기회를 지적하세요

## 출력 형식

반드시 아래 Markdown 형식을 따라 작성하세요:

# 회의록: [회의 주제]

## 📅 회의 정보
- **일시**: [추출된 날짜와 시간]
- **참석자**: [참석자 목록]
- **장소**: [채팅방 이름]

## 📋 안건 및 주요 주제
[전반적인 안건과 논의된 주요 주제들을 항목별로 정리]

1. [주제 1]
2. [주제 2]
...

## 👥 참가자별 의견 및 기여

### [참가자 1 이름]
- **주요 의견**: [핵심 의견 요약]
- **논의 내용**: [상세 논의 내용]
- **기여도**: [특별히 기여한 부분]

### [참가자 2 이름]
- **주요 의견**: [핵심 의견 요약]
- **논의 내용**: [상세 논의 내용]
- **기여도**: [특별히 기여한 부분]

[모든 참가자에 대해 반복]

## ✅ 결정 사항
[회의에서 확정된 결정사항들을 명확하게 정리]

1. [결정사항 1]
2. [결정사항 2]
...

## 🎯 액션 아이템
[실행해야 할 구체적인 작업들]

- [ ] [작업 내용] (담당: [이름], 기한: [날짜])
- [ ] [작업 내용] (담당: [이름], 기한: [날짜])
...

## 🔄 보류 및 추가 논의 필요 사항
[결론이 나지 않았거나 추가 논의가 필요한 사항]

- [사항 1]
- [사항 2]
...

## 🤖 AI 제안사항
[AI가 분석한 추가 고려사항 및 제안]

### 고려할 점
- [제안 1]
- [제안 2]
...

### 리스크 및 주의사항
- [리스크 1]
- [리스크 2]
...

### 다음 단계 제안
- [제안 1]
- [제안 2]
...

---
*본 회의록은 AI에 의해 자동 생성되었습니다. 내용을 검토하고 필요시 수정해주세요.*`

/**
 * 메시지 데이터를 AI가 이해하기 쉬운 형식으로 포맷팅
 *
 * @param {Array} messages - 채팅 메시지 배열
 * @param {Object} options - 포맷팅 옵션
 * @returns {string} 포맷팅된 대화 내용
 */
export function formatMessagesForAI(messages, options = {}) {
  const {
    includeTimestamps = true,
    includeMessageType = false
  } = options

  if (!messages || messages.length === 0) {
    return '대화 내용이 없습니다.'
  }

  const formattedMessages = messages.map((msg) => {
    const timestamp = includeTimestamps
      ? `[${new Date(msg.created_at).toLocaleString('ko-KR')}] `
      : ''

    const messageType = includeMessageType && msg.message_type !== 'user'
      ? `[${msg.message_type}] `
      : ''

    const sender = msg.sender_name || msg.sender_id || '알 수 없음'
    const content = msg.content || ''

    return `${timestamp}${messageType}${sender}: ${content}`
  }).join('\n')

  return formattedMessages
}

/**
 * 참가자 목록 추출
 *
 * @param {Array} messages - 채팅 메시지 배열
 * @returns {Array} 고유 참가자 목록
 */
export function extractParticipants(messages) {
  if (!messages || messages.length === 0) {
    return []
  }

  const participantsMap = new Map()

  messages.forEach((msg) => {
    const senderId = msg.sender_id
    const senderName = msg.sender_name || msg.sender_id || '알 수 없음'

    if (senderId && !participantsMap.has(senderId)) {
      participantsMap.set(senderId, {
        id: senderId,
        name: senderName,
        messageCount: 0
      })
    }

    if (senderId) {
      participantsMap.get(senderId).messageCount++
    }
  })

  return Array.from(participantsMap.values())
}

/**
 * Claude API를 사용하여 회의록 생성
 *
 * @param {Array} messages - 채팅 메시지 배열
 * @param {Object} metadata - 회의 메타데이터 (채팅방 이름, 시간 범위 등)
 * @param {Object} options - 생성 옵션
 * @returns {Promise<string>} 생성된 회의록 (Markdown)
 */
export async function generateMeetingNotes(messages, metadata = {}, options = {}) {
  try {
    // 환경 변수에서 API 키 가져오기
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

    if (!apiKey) {
      throw new Error('VITE_ANTHROPIC_API_KEY 환경 변수가 설정되지 않았습니다.')
    }

    // Anthropic 클라이언트 생성
    const anthropic = new Anthropic({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // 브라우저에서 직접 호출 (프로덕션에서는 백엔드 사용 권장)
    })

    // 메시지 포맷팅
    const formattedMessages = formatMessagesForAI(messages, {
      includeTimestamps: true,
      includeMessageType: options.includeMessageType || false
    })

    // 참가자 목록 추출
    const participants = extractParticipants(messages)
    const participantNames = participants.map(p => p.name).join(', ')

    // 사용자 프롬프트 생성
    const userPrompt = `다음 채팅 대화 내용을 분석하여 회의록을 작성해주세요.

## 회의 정보
- 채팅방: ${metadata.chatRoomName || '알 수 없음'}
- 시작 시간: ${metadata.startTime ? new Date(metadata.startTime).toLocaleString('ko-KR') : '알 수 없음'}
- 종료 시간: ${metadata.endTime ? new Date(metadata.endTime).toLocaleString('ko-KR') : '알 수 없음'}
- 참석자 (${participants.length}명): ${participantNames}
- 메시지 수: ${messages.length}개

## 대화 내용
${formattedMessages}

---

위 대화 내용을 토대로 체계적이고 전문적인 회의록을 작성해주세요.
대화 내용을 요약하여 회의록을 작성해줘.
전반적인 안건과 주제를 분석하고 각 참가자의 의견을 정리해줘.
참가자별로 나눠서 그들이 어떤 대화를 했는지 분석해서 표시하고,
전체적으로 어떤 결론에 도달했는지 정리해줘.
또 네가 제시하고자 하는 도움을 줄 수 있는 부분이 있다면 AI 제안사항이라는 섹션으로 별도의 제안을 해줘.`

    // Claude API 호출
    const response = await anthropic.messages.create({
      model: options.model || 'claude-3-5-sonnet-20241022',
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
      system: MEETING_NOTES_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    })

    // 응답에서 텍스트 추출
    const generatedNotes = response.content[0].text

    return generatedNotes

  } catch (error) {
    console.error('회의록 생성 중 오류 발생:', error)
    throw new Error(`회의록 생성 실패: ${error.message}`)
  }
}

/**
 * 스트리밍 방식으로 회의록 생성
 *
 * @param {Array} messages - 채팅 메시지 배열
 * @param {Object} metadata - 회의 메타데이터
 * @param {Function} onUpdate - 스트리밍 업데이트 콜백 (partialText) => void
 * @param {Object} options - 생성 옵션
 * @returns {Promise<string>} 완성된 회의록
 */
export async function generateMeetingNotesStreaming(messages, metadata = {}, onUpdate, options = {}) {
  try {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

    if (!apiKey) {
      throw new Error('VITE_ANTHROPIC_API_KEY 환경 변수가 설정되지 않았습니다.')
    }

    const anthropic = new Anthropic({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    })

    const formattedMessages = formatMessagesForAI(messages, {
      includeTimestamps: true,
      includeMessageType: options.includeMessageType || false
    })

    const participants = extractParticipants(messages)
    const participantNames = participants.map(p => p.name).join(', ')

    const userPrompt = `다음 채팅 대화 내용을 분석하여 회의록을 작성해주세요.

## 회의 정보
- 채팅방: ${metadata.chatRoomName || '알 수 없음'}
- 시작 시간: ${metadata.startTime ? new Date(metadata.startTime).toLocaleString('ko-KR') : '알 수 없음'}
- 종료 시간: ${metadata.endTime ? new Date(metadata.endTime).toLocaleString('ko-KR') : '알 수 없음'}
- 참석자 (${participants.length}명): ${participantNames}
- 메시지 수: ${messages.length}개

## 대화 내용
${formattedMessages}

---

위 대화 내용을 토대로 체계적이고 전문적인 회의록을 작성해주세요.
대화 내용을 요약하여 회의록을 작성해줘.
전반적인 안건과 주제를 분석하고 각 참가자의 의견을 정리해줘.
참가자별로 나눠서 그들이 어떤 대화를 했는지 분석해서 표시하고,
전체적으로 어떤 결론에 도달했는지 정리해줘.
또 네가 제시하고자 하는 도움을 줄 수 있는 부분이 있다면 AI 제안사항이라는 섹션으로 별도의 제안을 해줘.`

    // 스트리밍 호출
    const stream = await anthropic.messages.stream({
      model: options.model || 'claude-3-5-sonnet-20241022',
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
      system: MEETING_NOTES_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    })

    let fullText = ''

    // 스트리밍 이벤트 처리
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
        fullText += chunk.delta.text

        // 콜백으로 부분 텍스트 전달
        if (onUpdate && typeof onUpdate === 'function') {
          onUpdate(fullText)
        }
      }
    }

    return fullText

  } catch (error) {
    console.error('스트리밍 회의록 생성 중 오류 발생:', error)
    throw new Error(`회의록 생성 실패: ${error.message}`)
  }
}

/**
 * 회의록 제목 자동 생성
 *
 * @param {Object} metadata - 회의 메타데이터
 * @returns {string} 생성된 제목
 */
export function generateMeetingTitle(metadata = {}) {
  const chatRoomName = metadata.chatRoomName || '채팅방'
  const date = metadata.startTime
    ? new Date(metadata.startTime).toLocaleDateString('ko-KR')
    : new Date().toLocaleDateString('ko-KR')

  return `${chatRoomName} 회의록 - ${date}`
}
