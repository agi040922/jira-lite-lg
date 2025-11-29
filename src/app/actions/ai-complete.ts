"use server"

import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@/lib/supabase/server"
import crypto from "crypto"

// Gemini API 클라이언트 초기화
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

// Feature Types
type FeatureType =
  | 'AI_SUMMARY'
  | 'AI_SUGGESTION'
  | 'AI_AUTO_LABEL'
  | 'AI_DUPLICATE'
  | 'AI_COMMENT_SUMMARY'

// Rate Limit 설정
const RATE_LIMITS = {
  perMinute: 10,
  perDay: 100
}

/**
 * SHA256 해시 생성
 */
function generateHash(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

/**
 * Rate Limiting 체크
 */
async function checkRateLimit(userId: string, featureType: FeatureType): Promise<{ allowed: boolean; message?: string }> {
  try {
    const supabase = await createClient()
    const now = new Date()

    // 분당 제한 체크 (최근 1분)
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
    const { data: minuteData, error: minuteError } = await supabase
      .from('ai_rate_limits')
      .select('request_count')
      .eq('user_id', userId)
      .eq('feature_type', featureType)
      .gte('window_start', oneMinuteAgo.toISOString())
      .single()

    if (!minuteError && minuteData) {
      if (minuteData.request_count >= RATE_LIMITS.perMinute) {
        return {
          allowed: false,
          message: `분당 요청 한도(${RATE_LIMITS.perMinute}회)를 초과했습니다. 잠시 후 다시 시도해주세요.`
        }
      }
    }

    // 일당 제한 체크 (최근 24시간)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const { data: dayData, error: dayError } = await supabase
      .from('ai_rate_limits')
      .select('request_count')
      .eq('user_id', userId)
      .eq('feature_type', featureType)
      .gte('window_start', oneDayAgo.toISOString())

    if (!dayError && dayData) {
      const totalRequests = dayData.reduce((sum, record) => sum + record.request_count, 0)
      if (totalRequests >= RATE_LIMITS.perDay) {
        return {
          allowed: false,
          message: `일일 요청 한도(${RATE_LIMITS.perDay}회)를 초과했습니다. 내일 다시 시도해주세요.`
        }
      }
    }

    return { allowed: true }
  } catch (error) {
    console.error('Rate limit check error:', error)
    return { allowed: true } // 에러 시 허용
  }
}

/**
 * Rate Limit 기록
 */
async function recordRateLimit(userId: string, featureType: FeatureType) {
  try {
    const supabase = await createClient()
    const now = new Date()
    const windowStart = new Date(now.getTime() - (now.getTime() % 60000)) // 분 단위로 반올림

    // 기존 레코드 확인
    const { data: existing } = await supabase
      .from('ai_rate_limits')
      .select('*')
      .eq('user_id', userId)
      .eq('feature_type', featureType)
      .eq('window_start', windowStart.toISOString())
      .single()

    if (existing) {
      // 카운트 증가
      await supabase
        .from('ai_rate_limits')
        .update({ request_count: existing.request_count + 1 })
        .eq('id', existing.id)
    } else {
      // 새 레코드 생성
      await supabase
        .from('ai_rate_limits')
        .insert({
          user_id: userId,
          feature_type: featureType,
          request_count: 1,
          window_start: windowStart.toISOString()
        })
    }
  } catch (error) {
    console.error('Rate limit record error:', error)
  }
}

/**
 * 캐시에서 결과 가져오기
 */
async function getFromCache(featureType: FeatureType, inputHash: string): Promise<any | null> {
  try {
    const supabase = await createClient()
    const now = new Date()

    const { data, error } = await supabase
      .from('ai_cache')
      .select('*')
      .eq('feature_type', featureType)
      .eq('input_hash', inputHash)
      .gt('expires_at', now.toISOString())
      .single()

    if (error || !data) return null

    // hit_count 증가
    await supabase
      .from('ai_cache')
      .update({ hit_count: data.hit_count + 1 })
      .eq('id', data.id)

    return data.result
  } catch (error) {
    console.error('Cache get error:', error)
    return null
  }
}

/**
 * 캐시에 결과 저장
 */
async function saveToCache(featureType: FeatureType, inputHash: string, inputData: any, result: any) {
  try {
    const supabase = await createClient()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24시간 후

    await supabase
      .from('ai_cache')
      .upsert({
        feature_type: featureType,
        input_hash: inputHash,
        input_data: inputData,
        result: result,
        expires_at: expiresAt.toISOString(),
        hit_count: 0
      }, {
        onConflict: 'feature_type,input_hash'
      })
  } catch (error) {
    console.error('Cache save error:', error)
  }
}

/**
 * 캐시 무효화 (이슈 ID 기반)
 */
export async function invalidateIssueCache(issueId: string, featureTypes?: FeatureType[]) {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('ai_cache')
      .delete()
      .contains('input_data', { issueId })

    if (featureTypes && featureTypes.length > 0) {
      query = query.in('feature_type', featureTypes)
    }

    await query
  } catch (error) {
    console.error('Cache invalidation error:', error)
  }
}

/**
 * FR-040: 이슈 설명 요약 생성
 */
export async function summarizeIssue(issueId: string, description: string) {
  try {
    if (!description || description.length < 10) {
      return {
        success: false,
        message: "설명이 너무 짧습니다. 최소 10자 이상의 설명이 필요합니다."
      }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, message: "로그인이 필요합니다." }
    }

    const featureType: FeatureType = 'AI_SUMMARY'

    // Rate Limiting 체크
    const rateLimitCheck = await checkRateLimit(user.id, featureType)
    if (!rateLimitCheck.allowed) {
      return { success: false, message: rateLimitCheck.message }
    }

    // 캐시 체크
    const inputHash = generateHash(description)
    const cachedResult = await getFromCache(featureType, inputHash)
    if (cachedResult) {
      return { success: true, message: cachedResult.summary, fromCache: true }
    }

    // AI 호출
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })
    const prompt = `다음 이슈 설명을 2-4문장으로 요약해주세요:

${description}

요약:`

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    // 캐시 저장
    const resultData = { summary: text }
    await saveToCache(featureType, inputHash, { issueId, description }, resultData)

    // Rate Limit 기록
    await recordRateLimit(user.id, featureType)

    return { success: true, message: text }
  } catch (error) {
    console.error("Error calling Gemini:", error)
    return handleGeminiError(error)
  }
}

/**
 * FR-041: 해결 전략 제안
 */
export async function suggestSolution(issueId: string, title: string, description: string) {
  try {
    if (!description || description.length < 10) {
      return {
        success: false,
        message: "설명이 너무 짧습니다. 최소 10자 이상의 설명이 필요합니다."
      }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, message: "로그인이 필요합니다." }
    }

    const featureType: FeatureType = 'AI_SUGGESTION'

    // Rate Limiting 체크
    const rateLimitCheck = await checkRateLimit(user.id, featureType)
    if (!rateLimitCheck.allowed) {
      return { success: false, message: rateLimitCheck.message }
    }

    // 캐시 체크
    const inputHash = generateHash(title + description)
    const cachedResult = await getFromCache(featureType, inputHash)
    if (cachedResult) {
      return { success: true, message: cachedResult.suggestion, fromCache: true }
    }

    // AI 호출
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })
    const prompt = `다음 이슈에 대한 해결 전략을 제안해주세요:

제목: ${title}
설명: ${description}

구체적이고 실행 가능한 해결 방안을 3-5개 단계로 제안해주세요.`

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    // 캐시 저장
    const resultData = { suggestion: text }
    await saveToCache(featureType, inputHash, { issueId, title, description }, resultData)

    // Rate Limit 기록
    await recordRateLimit(user.id, featureType)

    return { success: true, message: text }
  } catch (error) {
    console.error("Error calling Gemini:", error)
    return handleGeminiError(error)
  }
}

/**
 * FR-043: AI 라벨 자동 추천
 */
export async function suggestLabels(issueId: string, title: string, description: string, existingLabels: { name: string; color: string }[]) {
  try {
    if (!description || description.length < 10) {
      return {
        success: false,
        message: "설명이 너무 짧습니다. 최소 10자 이상의 설명이 필요합니다."
      }
    }

    if (!existingLabels || existingLabels.length === 0) {
      return {
        success: false,
        message: "프로젝트에 라벨이 없습니다. 먼저 라벨을 생성해주세요."
      }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, message: "로그인이 필요합니다." }
    }

    const featureType: FeatureType = 'AI_AUTO_LABEL'

    // Rate Limiting 체크
    const rateLimitCheck = await checkRateLimit(user.id, featureType)
    if (!rateLimitCheck.allowed) {
      return { success: false, message: rateLimitCheck.message }
    }

    // 캐시 체크
    const inputHash = generateHash(title + description + JSON.stringify(existingLabels))
    const cachedResult = await getFromCache(featureType, inputHash)
    if (cachedResult) {
      return { success: true, data: cachedResult.labels, fromCache: true }
    }

    // AI 호출
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })
    const labelsText = existingLabels.map(l => l.name).join(', ')

    const prompt = `다음 이슈에 적합한 라벨을 프로젝트의 기존 라벨 중에서 최대 3개 추천해주세요:

이슈 제목: ${title}
이슈 설명: ${description}

사용 가능한 라벨: ${labelsText}

추천 라벨을 JSON 배열 형식으로 반환해주세요. 각 라벨은 name만 포함하면 됩니다.
예시: ["라벨1", "라벨2", "라벨3"]`

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    // JSON 파싱
    let suggestedLabels: string[] = []
    try {
      const jsonMatch = text.match(/\[.*\]/s)
      if (jsonMatch) {
        suggestedLabels = JSON.parse(jsonMatch[0])
      }
    } catch (e) {
      return { success: false, message: "AI 응답 파싱에 실패했습니다." }
    }

    // 유효한 라벨만 필터링
    const validLabels = suggestedLabels
      .filter(name => existingLabels.some(l => l.name === name))
      .slice(0, 3)

    // 캐시 저장
    const resultData = { labels: validLabels }
    await saveToCache(featureType, inputHash, { issueId, title, description, existingLabels }, resultData)

    // Rate Limit 기록
    await recordRateLimit(user.id, featureType)

    return { success: true, data: validLabels }
  } catch (error) {
    console.error("Error calling Gemini:", error)
    return handleGeminiError(error)
  }
}

/**
 * FR-044: AI 중복 이슈 탐지
 */
export async function detectDuplicates(projectId: string, title: string, description: string, existingIssues: { id: string; title: string; description: string | null }[]) {
  try {
    if (!description || description.length < 10) {
      return {
        success: false,
        message: "설명이 너무 짧습니다. 최소 10자 이상의 설명이 필요합니다."
      }
    }

    if (!existingIssues || existingIssues.length === 0) {
      return {
        success: true,
        data: [],
        message: "기존 이슈가 없습니다."
      }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, message: "로그인이 필요합니다." }
    }

    const featureType: FeatureType = 'AI_DUPLICATE'

    // Rate Limiting 체크
    const rateLimitCheck = await checkRateLimit(user.id, featureType)
    if (!rateLimitCheck.allowed) {
      return { success: false, message: rateLimitCheck.message }
    }

    // 캐시 체크
    const inputHash = generateHash(title + description + JSON.stringify(existingIssues.map(i => i.id)))
    const cachedResult = await getFromCache(featureType, inputHash)
    if (cachedResult) {
      return { success: true, data: cachedResult.duplicates, fromCache: true }
    }

    // AI 호출
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

    const issuesText = existingIssues
      .slice(0, 20) // 최근 20개만
      .map((issue, idx) => `${idx + 1}. [ID: ${issue.id}] ${issue.title}\n   ${issue.description || '설명 없음'}`)
      .join('\n\n')

    const prompt = `다음 새 이슈와 유사한 기존 이슈가 있는지 찾아주세요:

[새 이슈]
제목: ${title}
설명: ${description}

[기존 이슈들]
${issuesText}

유사한 이슈가 있다면 ID를 JSON 배열로 반환해주세요 (최대 3개, 유사도 순).
유사한 이슈가 없다면 빈 배열을 반환해주세요.
예시: ["issue-id-1", "issue-id-2"]`

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    // JSON 파싱
    let duplicateIds: string[] = []
    try {
      const jsonMatch = text.match(/\[.*\]/s)
      if (jsonMatch) {
        duplicateIds = JSON.parse(jsonMatch[0])
      }
    } catch (e) {
      return { success: false, message: "AI 응답 파싱에 실패했습니다." }
    }

    // 유효한 ID만 필터링
    const validDuplicates = duplicateIds
      .filter(id => existingIssues.some(i => i.id === id))
      .slice(0, 3)

    // 캐시 저장
    const resultData = { duplicates: validDuplicates }
    await saveToCache(featureType, inputHash, { projectId, title, description }, resultData)

    // Rate Limit 기록
    await recordRateLimit(user.id, featureType)

    return { success: true, data: validDuplicates }
  } catch (error) {
    console.error("Error calling Gemini:", error)
    return handleGeminiError(error)
  }
}

/**
 * FR-045: AI 댓글 요약
 */
export async function summarizeComments(issueId: string, comments: { user: { name: string }; content: string }[]) {
  try {
    if (!comments || comments.length < 5) {
      return {
        success: false,
        message: "댓글이 5개 이상일 때만 요약을 생성할 수 있습니다."
      }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, message: "로그인이 필요합니다." }
    }

    const featureType: FeatureType = 'AI_COMMENT_SUMMARY'

    // Rate Limiting 체크
    const rateLimitCheck = await checkRateLimit(user.id, featureType)
    if (!rateLimitCheck.allowed) {
      return { success: false, message: rateLimitCheck.message }
    }

    // 캐시 체크
    const commentsText = comments.map(c => c.content).join('\n')
    const inputHash = generateHash(commentsText)
    const cachedResult = await getFromCache(featureType, inputHash)
    if (cachedResult) {
      return { success: true, message: cachedResult.summary, fromCache: true }
    }

    // AI 호출
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

    const formattedComments = comments
      .map((c, idx) => `${idx + 1}. ${c.user?.name || '알 수 없음'}: ${c.content}`)
      .join('\n')

    const prompt = `다음 이슈의 댓글 토론을 요약해주세요:

${formattedComments}

3-5문장으로 논의 내용을 요약하고, 주요 결정 사항이 있다면 포함해주세요.`

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    // 캐시 저장
    const resultData = { summary: text }
    await saveToCache(featureType, inputHash, { issueId, comments }, resultData)

    // Rate Limit 기록
    await recordRateLimit(user.id, featureType)

    return { success: true, message: text }
  } catch (error) {
    console.error("Error calling Gemini:", error)
    return handleGeminiError(error)
  }
}

/**
 * 일반 AI 질문 처리 (이슈 컨텍스트 포함)
 */
export async function askAIAboutIssue(message: string, issueContext?: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, message: "로그인이 필요합니다." }
    }

    // Rate Limiting 체크 (AI_SUGGESTION 타입 사용)
    const featureType: FeatureType = 'AI_SUGGESTION'
    const rateLimitCheck = await checkRateLimit(user.id, featureType)
    if (!rateLimitCheck.allowed) {
      return { success: false, message: rateLimitCheck.message }
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

    let prompt = message
    if (issueContext) {
      prompt = `다음 이슈에 대한 질문입니다:

이슈 컨텍스트:
${issueContext}

질문: ${message}`
    }

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    // Rate Limit 기록
    await recordRateLimit(user.id, featureType)

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
  if (error instanceof Error && (
    error.message.includes("API_KEY") ||
    error.message.includes("API key not valid")
  )) {
    return {
      success: false,
      message: "⚠️ Gemini API 키가 유효하지 않습니다.\n\n해결 방법:\n1. https://aistudio.google.com/apikey 에서 무료 API 키 발급\n2. .env.local에 GEMINI_API_KEY 추가"
    }
  }

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
