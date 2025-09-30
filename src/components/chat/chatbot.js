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

// A// Anthropic (Claude) API 호출
const generateClaudeResponse = async (userMessages, model) => {
  const anthropic = new Anthropic({
    apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
    dangerouslyAllowBrowser: true,
  });

  console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
  console.log("Claude 모델:", model);
  console.log("메시지 수:", userMessages.length);

  // 각 메시지의 content 타입 확인
  userMessages.forEach((msg, idx) => {
    console.log(`메시지 ${idx + 1}:`, {
      role: msg.role,
      contentType: Array.isArray(msg.content) ? 'multimodal' : 'text',
      contentLength: Array.isArray(msg.content) ? msg.content.length : 1,
      contentTypes: Array.isArray(msg.content)
        ? msg.content.map(c => c.type).join(', ')
        : 'text'
    });
  });

  console.dir(userMessages, { depth: 3 });
  console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

  try {
    const response = await anthropic.messages.create({
      model: model,
      max_tokens: 4096,
      messages: userMessages,
      // 웹 검색 툴 추가
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 5,
        },
      ],
    });

    console.log("Claude API 응답:", response);

    // Anthropic 응답에서 텍스트 추출
    // 툴 사용 시 여러 content 블록이 올 수 있으므로 모든 텍스트를 결합
    const textContents = response.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n");

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

// 통합 응답 생성 함수
export const generateResponse = async (userMessages, model = "gpt-5") => {
  // 모델명으로 provider 판단
  if (model.startsWith("claude-")) {
    return await generateClaudeResponse(userMessages, model);
  } else {
    return await generateOpenAIResponse(userMessages, model);
  }
};
