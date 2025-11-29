"use server"

import { GoogleGenerativeAI } from "@google/generative-ai"

// Gemini API 클라이언트 초기화
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export async function askClaude(message: string) {
  try {
    // Gemini 2.5 Flash 모델 사용 (2025년 6월 출시, 최신 안정화 버전)
    // 무료 할당량: 분당 15요청, 하루 1500요청
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

    const result = await model.generateContent(message)
    const response = result.response
    const text = response.text()

    return { success: true, message: text }
  } catch (error) {
    console.error("Error calling Gemini:", error)

    // API 키 관련 에러 처리
    if (error instanceof Error && (
      error.message.includes("API_KEY") ||
      error.message.includes("API key not valid")
    )) {
      return {
        success: false,
        message: "⚠️ Gemini API 키가 유효하지 않습니다.\n\n해결 방법:\n1. https://aistudio.google.com/apikey 에서 무료 API 키 발급\n2. .env.local에 GEMINI_API_KEY 추가"
      }
    }

    // 404 에러 (모델을 찾을 수 없음)
    if (error instanceof Error && error.message.includes("404")) {
      return {
        success: false,
        message: "⚠️ Gemini 모델을 찾을 수 없습니다.\n\nAPI 키가 올바른지 확인해주세요."
      }
    }

    return { success: false, message: "Gemini API 호출에 실패했습니다. 콘솔을 확인해주세요." }
  }
}
