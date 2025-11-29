import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 세션 새로고침 - 토큰이 만료되었으면 자동으로 갱신
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 보호된 라우트 정의
  const protectedRoutes = ['/dashboard', '/inbox', '/issues', '/projects', '/reviews', '/settings', '/insights', '/views', '/team']
  const isProtectedRoute = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route))
  
  // 공개 경로 정의 (인증 불필요)
  const publicRoutes = ['/test', '/auth']
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  // 인증이 필요한 경로인데 사용자가 로그인하지 않은 경우
  if (!user && isProtectedRoute) {
    // 루트 경로로 리다이렉트 (로그인 페이지가 있다면 '/login'으로 변경)
    const redirectUrl = new URL('/', request.url)
    console.log(`Redirecting unauthenticated user from ${request.nextUrl.pathname} to /`)
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * 다음을 제외한 모든 요청 경로에 대해 실행:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화 파일)
     * - favicon.ico (파비콘 파일)
     * - public 폴더의 파일들
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
