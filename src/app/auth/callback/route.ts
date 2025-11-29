import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * OAuth 콜백 핸들러
 *
 * Google OAuth 로그인 후 리다이렉트되는 엔드포인트
 * code를 session으로 교환합니다
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()

    // code를 session으로 교환
    await supabase.auth.exchangeCodeForSession(code)
  }

  // 로그인 성공 후 대시보드로 리다이렉트
  return NextResponse.redirect(`${origin}/dashboard`)
}
