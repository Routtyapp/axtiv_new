/**
 * 🚨 임시 기능: 자동 메시지 전송 (1초마다)
 * ⚠️ 이 파일은 테스트 목적으로만 사용되며, 나중에 삭제될 예정입니다.
 */

let autoMessageInterval = null;
let messageCounter = 0;

/**
 * 자동 메시지 전송 시작
 * @param {Function} sendMessage - 메시지 전송 함수
 * @param {string} workspaceId - 워크스페이스 ID
 * @param {string} chatRoomId - 채팅방 ID
 */
export const startAutoMessage = (sendMessage, workspaceId, chatRoomId) => {
  console.log("🚨 임시 자동 메시지 전송 시작 (1초마다)");

  if (autoMessageInterval) {
    console.log("⚠️ 자동 메시지가 이미 실행 중입니다");
    return;
  }

  messageCounter = 0;

  autoMessageInterval = setInterval(() => {
    messageCounter++;
    const message = `자동 메시지 #${messageCounter} (${new Date().toLocaleTimeString()})`;

    console.log(`🤖 자동 메시지 전송: ${message}`);

    // 메시지 전송
    sendMessage(message, "user", []);
  }, 1000); // 1초마다 실행
};

/**
 * 자동 메시지 전송 중지
 */
export const stopAutoMessage = () => {
  if (autoMessageInterval) {
    console.log("🛑 임시 자동 메시지 전송 중지");
    clearInterval(autoMessageInterval);
    autoMessageInterval = null;
    messageCounter = 0;
  }
};

/**
 * 자동 메시지 전송 상태 확인
 */
export const isAutoMessageRunning = () => {
  return autoMessageInterval !== null;
};

/**
 * 자동 메시지 전송 카운터 확인
 */
export const getAutoMessageCount = () => {
  return messageCounter;
};
