import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// .env 파일 로드
dotenv.config();

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY
});

async function main() {
  try {
    console.log("OpenAI SDK 정보 확인 중...");
    console.log("Available methods:", Object.keys(openai));

    // 1. 벡터 스토어 생성
    console.log("\n벡터 스토어 생성 중...");
    const vectorStore = await openai.vectorStores.create({
      name: "Axtiv Chat Files Vector Store"
    });

    console.log("\n✅ 벡터 스토어가 성공적으로 생성되었습니다!");
    console.log("\n📋 벡터 스토어 정보:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`ID: ${vectorStore.id}`);
    console.log(`Name: ${vectorStore.name}`);
    console.log(`Status: ${vectorStore.status}`);
    console.log(`Created At: ${new Date(vectorStore.created_at * 1000).toLocaleString()}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // 2. 파일 업로드 (예시: 테스트 파일)
    console.log("📤 파일 업로드 중...");

    // 예시 파일 경로 - 실제 사용 시 변경 필요
    const filePath = "./test-document.txt";

    // 파일이 존재하는지 확인
    if (!fs.existsSync(filePath)) {
      console.log("⚠️  테스트 파일이 없습니다. 샘플 파일을 생성합니다...");
      fs.writeFileSync(filePath, "This is a test document for vector store.");
    }

    const file = await openai.files.create({
      file: fs.createReadStream(filePath),
      purpose: "assistants"
    });

    console.log("✅ 파일이 업로드되었습니다!");
    console.log(`File ID: ${file.id}`);
    console.log(`Filename: ${file.filename}`);
    console.log(`Size: ${file.bytes} bytes\n`);

    // 3. 벡터 스토어에 파일 첨부
    console.log("🔗 벡터 스토어에 파일 첨부 중...");

    const vectorStoreFile = await openai.vectorStores.files.create(
      vectorStore.id,
      {
        file_id: file.id
      }
    );

    console.log("✅ 파일이 벡터 스토어에 첨부되었습니다!");
    console.log("\n📄 벡터 스토어 파일 정보:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`File ID: ${vectorStoreFile.id}`);
    console.log(`Vector Store ID: ${vectorStoreFile.vector_store_id}`);
    console.log(`Status: ${vectorStoreFile.status}`);
    console.log(`Created At: ${new Date(vectorStoreFile.created_at * 1000).toLocaleString()}`);

    // 4. 파일 처리 상태 확인
    console.log("\n⏳ 파일 처리 상태 확인 중...");
    let fileStatus = vectorStoreFile.status;
    let attempts = 0;
    const maxAttempts = 30;

    while (fileStatus !== "completed" && fileStatus !== "failed" && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기

      const updatedFile = await openai.vectorStores.files.retrieve(
        vectorStore.id,
        vectorStoreFile.id
      );

      fileStatus = updatedFile.status;
      attempts++;

      console.log(`Status: ${fileStatus} (${attempts}/${maxAttempts})`);

      if (fileStatus === "completed") {
        console.log("\n✅ 파일 처리가 완료되었습니다!");
        console.log(`Usage: ${updatedFile.usage_bytes} bytes`);
        break;
      } else if (fileStatus === "failed") {
        console.error("\n❌ 파일 처리 실패:");
        console.error(updatedFile.last_error);
        break;
      }
    }

    if (attempts >= maxAttempts) {
      console.warn("\n⚠️  타임아웃: 파일 처리 상태 확인 시간 초과");
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("💡 이 ID를 .env 파일의 VITE_VECTOR_STORE_ID에 복사하세요:");
    console.log(`VITE_VECTOR_STORE_ID=${vectorStore.id}\n`);

  } catch (error) {
    console.error("❌ 오류 발생:", error.message);
    console.error("전체 에러:", error);
    if (error.response) {
      console.error("API 응답:", error.response.data);
    }
  }
}

main();
