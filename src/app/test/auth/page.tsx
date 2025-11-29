'use client'

import { createClient } from '@/lib/supabase/client'
import { AuthStatus } from '@/components/auth/AuthStatus'
import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'

/**
 * Supabase 인증 테스트 페이지
 *
 * 주요 기능:
 * 1. 이메일/비밀번호 회원가입 및 로그인
 * 2. Google OAuth 로그인
 * 3. JWT 토큰 표시 (access_token, refresh_token)
 * 4. 세션 정보 실시간 표시 (만료 시간 포함)
 * 5. 세션 수동 갱신 기능
 * 6. 비밀번호 재설정 이메일 발송
 * 7. 로그아웃 기능
 * 8. 현재 사용자 정보 표시
 */
export default function AuthTestPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [session, setSession] = useState<Session | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  // 컴포넌트 마운트 시 현재 세션을 불러오고 인증 상태 변화를 감지
  useEffect(() => {
    // 초기 세션 가져오기
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // 인증 상태 변화 감지 (로그인, 로그아웃, 토큰 갱신 등)
    // onAuthStateChange는 구독(subscription) 객체를 반환
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    // 컴포넌트 언마운트 시 구독 해제 (메모리 누수 방지)
    return () => subscription.unsubscribe()
  }, [supabase.auth])

  /**
   * 회원가입 처리
   * - Supabase는 기본적으로 이메일 확인을 요구함
   * - 이메일 확인 설정은 Supabase 대시보드에서 변경 가능
   */
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // 이메일 확인 후 리다이렉트될 URL
          emailRedirectTo: `${window.location.origin}/test/auth`,
        },
      })

      if (error) throw error

      if (data.user && !data.session) {
        // 이메일 확인이 필요한 경우
        setMessage('회원가입 성공! 이메일을 확인하여 계정을 활성화해주세요.')
      } else {
        // 이메일 확인이 비활성화된 경우 즉시 로그인
        setMessage('회원가입 및 로그인 성공!')
      }
    } catch (error: any) {
      setMessage(`회원가입 실패: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  /**
   * 로그인 처리
   * - 이메일과 비밀번호로 인증
   * - 성공 시 세션 자동 생성 및 저장
   */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      setMessage('로그인 성공!')
      // 입력 필드 초기화
      setEmail('')
      setPassword('')
    } catch (error: any) {
      setMessage(`로그인 실패: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Google OAuth 로그인
   * - Google 로그인 페이지로 리다이렉트
   * - 인증 완료 후 현재 페이지로 돌아옴
   */
  const handleGoogleSignIn = async () => {
    setLoading(true)
    setMessage('')

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/test/auth`,
          // Google에서 제공하는 추가 정보 요청 (프로필, 이메일)
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) throw error

      // OAuth는 리다이렉트되므로 여기는 실행되지 않을 수 있음
      setMessage('Google 로그인 페이지로 이동 중...')
    } catch (error: any) {
      setMessage(`Google 로그인 실패: ${error.message}`)
      setLoading(false)
    }
  }

  /**
   * 세션 수동 갱신
   * - refresh_token을 사용하여 새로운 access_token 발급
   * - 일반적으로 Supabase가 자동으로 갱신하지만,
   *   수동 갱신이 필요한 경우 사용
   */
  const handleRefreshSession = async () => {
    setLoading(true)
    setMessage('')

    try {
      const { data, error } = await supabase.auth.refreshSession()

      if (error) throw error

      setMessage('세션 갱신 성공!')
      setSession(data.session)
    } catch (error: any) {
      setMessage(`세션 갱신 실패: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  /**
   * 비밀번호 재설정 이메일 발송
   * - 사용자 이메일로 비밀번호 재설정 링크 전송
   * - 링크 클릭 시 PASSWORD_RECOVERY 이벤트 발생
   */
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/test/auth`,
      })

      if (error) throw error

      setMessage('비밀번호 재설정 이메일이 발송되었습니다. 이메일을 확인해주세요.')
      setResetEmail('')
    } catch (error: any) {
      setMessage(`비밀번호 재설정 실패: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  /**
   * 로그아웃 처리
   * - 현재 세션을 무효화하고 로컬 스토리지에서 제거
   */
  const handleSignOut = async () => {
    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.signOut()

      if (error) throw error

      setMessage('로그아웃 성공!')
      setSession(null)
    } catch (error: any) {
      setMessage(`로그아웃 실패: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">
        Supabase 인증 테스트
      </h1>

      {/* 메시지 표시 영역 */}
      {message && (
        <div
          className={`mb-6 rounded-lg p-4 ${
            message.includes('실패') || message.includes('만료')
              ? 'bg-red-50 text-red-800'
              : 'bg-green-50 text-green-800'
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* 좌측: 인증 폼 */}
        <div className="space-y-6">
          {!session ? (
            <>
              {/* 이메일/비밀번호 회원가입 */}
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">
                  회원가입
                </h2>
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <label
                      htmlFor="signup-email"
                      className="block text-sm font-medium text-gray-700"
                    >
                      이메일
                    </label>
                    <input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="signup-password"
                      className="block text-sm font-medium text-gray-700"
                    >
                      비밀번호
                    </label>
                    <input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                      minLength={6}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      최소 6자 이상 입력해주세요
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {loading ? '처리 중...' : '회원가입'}
                  </button>
                </form>
              </div>

              {/* 이메일/비밀번호 로그인 */}
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">
                  로그인
                </h2>
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <label
                      htmlFor="signin-email"
                      className="block text-sm font-medium text-gray-700"
                    >
                      이메일
                    </label>
                    <input
                      id="signin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="signin-password"
                      className="block text-sm font-medium text-gray-700"
                    >
                      비밀번호
                    </label>
                    <input
                      id="signin-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {loading ? '처리 중...' : '로그인'}
                  </button>
                </form>
              </div>

              {/* Google OAuth 로그인 */}
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">
                  소셜 로그인
                </h2>
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-3 rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google로 로그인
                </button>
                <p className="mt-2 text-xs text-gray-500">
                  Google Client ID: 97892863767-g2ha0vrmr0qng4738udh0gq4hp001n4j
                </p>
              </div>

              {/* 비밀번호 재설정 */}
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">
                  비밀번호 재설정
                </h2>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label
                      htmlFor="reset-email"
                      className="block text-sm font-medium text-gray-700"
                    >
                      이메일
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {loading ? '처리 중...' : '재설정 이메일 발송'}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <>
              {/* 로그인된 상태: 사용자 정보 및 세션 관리 */}
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">
                  현재 사용자
                </h2>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      이메일:
                    </span>
                    <p className="mt-1 text-sm text-gray-900">
                      {session.user.email}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      사용자 ID:
                    </span>
                    <p className="mt-1 font-mono text-xs text-gray-900">
                      {session.user.id}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      로그인 방법:
                    </span>
                    <p className="mt-1 text-sm text-gray-900">
                      {session.user.app_metadata.provider || 'email'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      계정 생성일:
                    </span>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(session.user.created_at).toLocaleString(
                        'ko-KR'
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* 세션 관리 버튼 */}
              <div className="space-y-3">
                <button
                  onClick={handleRefreshSession}
                  disabled={loading}
                  className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? '처리 중...' : '세션 수동 갱신'}
                </button>
                <button
                  onClick={handleSignOut}
                  disabled={loading}
                  className="w-full rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? '처리 중...' : '로그아웃'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* 우측: 인증 상태 표시 */}
        <div>
          <AuthStatus session={session} />
        </div>
      </div>
    </div>
  )
}
