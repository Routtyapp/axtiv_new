import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// OpenAI API 호출
const generateOpenAIResponse = async (userMessages, model) => {
  const client = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
  });

  console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
  console.log("OpenAI 모델:", model);
  console.dir(userMessages);
  console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

  try {
    const response = await client.responses.create({
      model: model,
      input: userMessages,
      tools: [
        { type: "web_search" },
        {
          type: "file_search",
          vector_store_ids: [import.meta.env.VITE_VECTOR_STORE_ID],
        },
      ],
      reasoning: { effort: "low" },
      text: { verbosity: "low" },
    });

    console.log(response.output_text);
    return response.output_text;
  } catch (error) {
    console.error("OpenAI 응답 생성 중 오류:", error);
    throw error;
  }
};

// Anthropic (Claude) API 호출
const generateClaudeResponse = async (userMessages, model) => {
  const anthropic = new Anthropic({
    apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
    dangerouslyAllowBrowser: true,
  });

  console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
  console.log("Claude 모델:", model);
  console.log("메시지 수:", userMessages.length);

  userMessages.forEach((msg, idx) => {
    console.log(`메시지 ${idx + 1}:`, {
      role: msg.role,
      contentType: Array.isArray(msg.content) ? "multimodal" : "text",
      contentLength: Array.isArray(msg.content) ? msg.content.length : 1,
      contentTypes: Array.isArray(msg.content)
        ? msg.content.map((c) => c.type).join(", ")
        : "text",
    });
  });

  console.dir(userMessages, { depth: 3 });
  console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

  try {
    const response = await anthropic.messages.create({
      model: model,
      max_tokens: 4096,
      system: `응답할 때 반드시 마크다운 형식을 사용하여 구조화하세요:

**형식 규칙:**
- 주요 섹션은 ## 헤더 사용
- 하위 섹션은 ### 헤더 사용
- 항목 나열 시 - 또는 1. 리스트 사용
- 중요한 키워드나 강조는 **굵게** 표시
- 코드는 \`\`\`언어명 으로 감싸기
- 인라인 코드는 \`백틱\`으로 감싸기
- 짧은 문단으로 나누고 적절한 줄바꿈 사용
- 긴 텍스트 덩어리 대신 구조화된 형태로 작성

**금지 사항:**
- 긴 문단을 통으로 작성하지 마세요
- 구조 없이 텍스트만 나열하지 마세요`,
      messages: userMessages,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 5,
        },
      ],
    });

    console.log("Claude API 응답:", response);

    const textContents = response.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n\n");

    return textContents || "";
  } catch (error) {
    console.error("Claude 응답 생성 중 오류:", error);
    console.error("오류 상세:", error.message);
    if (error.response) {
      console.error("API 응답 오류:", error.response);
    }
    throw error;
  }
};

// Claude 스트리밍 응답
export const generateClaudeResponseStream = async (
  userMessages,
  model,
  onChunk
) => {
  const anthropic = new Anthropic({
    apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
    dangerouslyAllowBrowser: true,
  });

  console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
  console.log("Claude 스트리밍 시작:", model);
  console.log("메시지 수:", userMessages.length);
  console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

  try {
    const stream = await anthropic.messages.stream({
      model: model,
      max_tokens: 4096,
      system: `응답할 때 반드시 마크다운 형식을 사용하여 구조화하세요:

**형식 규칙:**
- 주요 섹션은 ## 헤더 사용
- 하위 섹션은 ### 헤더 사용
- 항목 나열 시 - 또는 1. 리스트 사용
- 중요한 키워드나 강조는 **굵게** 표시
- 코드는 \`\`\`언어명 으로 감싸기
- 인라인 코드는 \`백틱\`으로 감싸기
- 짧은 문단으로 나누고 적절한 줄바꿈 사용
- 긴 텍스트 덩어리 대신 구조화된 형태로 작성

**금지 사항:**
- 긴 문단을 통으로 작성하지 마세요
- 구조 없이 텍스트만 나열하지 마세요`,
      messages: userMessages,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 5,
        },
      ],
    });

    let fullText = "";

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta?.text) {
        const chunk = event.delta.text;
        fullText += chunk;

        if (onChunk) {
          onChunk(fullText);
        }
      }
    }

    console.log("Claude 스트리밍 완료:", fullText.length, "글자");
    return fullText;
  } catch (error) {
    console.error("Claude 스트리밍 중 오류:", error);
    console.error("오류 상세:", error.message);
    if (error.response) {
      console.error("API 응답 오류:", error.response);
    }
    throw error;
  }
};

// 통합 응답 생성 함수
export const generateResponse = async (userMessages, model = "gpt-5") => {
  if (model.startsWith("claude-")) {
    return await generateClaudeResponse(userMessages, model);
  } else {
    return await generateOpenAIResponse(userMessages, model);
  }
};
