"use server"

import { GoogleGenerativeAI } from "@google/generative-ai"

// Gemini API 클라이언트 초기화
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

/**
 * 이슈 설명 요약 생성
 * @param description 이슈 설명
 * @returns AI 요약 결과
 */
export async function summarizeIssue(description: string) {
  try {
    if (!description || description.length < 10) {
      return {
        success: false,
        message: "설명이 너무 짧습니다. 최소 10자 이상의 설명이 필요합니다."
      }
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

    const prompt = `다음 이슈 설명을 2-4문장으로 요약해주세요:

${description}

요약:`

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    return { success: true, message: text }
  } catch (error) {
    console.error("Error calling Gemini:", error)
    return handleGeminiError(error)
  }
}

/**
 * 이슈 해결 전략 제안
 * @param title 이슈 제목
 * @param description 이슈 설명
 * @returns AI 제안 결과
 */
export async function suggestSolution(title: string, description: string) {
  try {
    if (!description || description.length < 10) {
      return {
        success: false,
        message: "설명이 너무 짧습니다. 최소 10자 이상의 설명이 필요합니다."
      }
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

    const prompt = `다음 이슈에 대한 해결 전략을 제안해주세요:

제목: ${title}
설명: ${description}

구체적이고 실행 가능한 해결 방안을 3-5개 단계로 제안해주세요.`

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    return { success: true, message: text }
  } catch (error) {
    console.error("Error calling Gemini:", error)
    return handleGeminiError(error)
  }
}

/**
 * 댓글 요약 생성
 * @param comments 댓글 목록 (JSON 문자열)
 * @returns AI 요약 결과
 */
export async function summarizeComments(comments: string) {
  try {
    const parsedComments = JSON.parse(comments)

    if (!Array.isArray(parsedComments) || parsedComments.length < 5) {
      return {
        success: false,
        message: "댓글이 5개 이상일 때만 요약을 생성할 수 있습니다."
      }
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

    const commentsText = parsedComments
      .map((c: any, idx: number) => `${idx + 1}. ${c.user?.name}: ${c.content}`)
      .join('\n')

    const prompt = `다음 이슈의 댓글 토론을 요약해주세요:

${commentsText}

3-5문장으로 논의 내용을 요약하고, 주요 결정 사항이 있다면 포함해주세요.`

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    return { success: true, message: text }
  } catch (error) {
    console.error("Error calling Gemini:", error)
    return handleGeminiError(error)
  }
}

/**
 * 일반 AI 질문 처리 (이슈 컨텍스트 포함)
 * @param message 사용자 질문
 * @param issueContext 이슈 컨텍스트 (선택)
 * @returns AI 응답 결과
 */
export async function askAIAboutIssue(message: string, issueContext?: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

    let prompt = message
    if (issueContext) {
      prompt = `다음 이슈에 대한 질문입니다:

이슈 컨텍스트:
${issueContext}

질문: ${message}`
    }

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    return { success: true, message: text }
  } catch (error) {
    console.error("Error calling Gemini:", error)
    return handleGeminiError(error)
  }
}

/**
 * Gemini 에러 처리
 */
function handleGeminiError(error: unknown) {
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

  return {
    success: false,
    message: "Gemini API 호출에 실패했습니다. 콘솔을 확인해주세요."
  }
}
