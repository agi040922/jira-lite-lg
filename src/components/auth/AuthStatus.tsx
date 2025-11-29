'use client'

import { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

interface AuthStatusProps {
  session: Session | null
}

/**
 * 인증 상태 컴포넌트
 * - JWT 토큰 정보를 표시
 * - 세션 만료 시간을 실시간으로 계산하여 표시
 * - access_token과 refresh_token을 시각적으로 구분하여 표시
 */
export function AuthStatus({ session }: AuthStatusProps) {
  const [timeLeft, setTimeLeft] = useState<string>('')

  // 세션 만료까지 남은 시간을 계산하는 useEffect
  // 1초마다 업데이트하여 실시간으로 표시
  useEffect(() => {
    if (!session?.expires_at) return

    const calculateTimeLeft = () => {
      const expiresAt = session.expires_at! * 1000 // Unix timestamp를 밀리초로 변환
      const now = Date.now()
      const difference = expiresAt - now

      if (difference <= 0) {
        setTimeLeft('만료됨')
        return
      }

      // 남은 시간을 시:분:초 형식으로 변환
      const hours = Math.floor(difference / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setTimeLeft(`${hours}시간 ${minutes}분 ${seconds}초`)
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(interval)
  }, [session?.expires_at])

  if (!session) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">세션 상태</h2>
        <p className="text-gray-600">로그인되지 않았습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 세션 정보 */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">세션 정보</h2>
        <div className="space-y-3">
          <div>
            <span className="text-sm font-medium text-gray-700">사용자 ID:</span>
            <p className="mt-1 font-mono text-sm text-gray-900">{session.user.id}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">이메일:</span>
            <p className="mt-1 text-sm text-gray-900">{session.user.email}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">만료 시간:</span>
            <p className="mt-1 text-sm text-gray-900">
              {new Date(session.expires_at! * 1000).toLocaleString('ko-KR')}
            </p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">남은 시간:</span>
            <p className={`mt-1 text-sm font-semibold ${
              timeLeft === '만료됨' ? 'text-red-600' : 'text-green-600'
            }`}>
              {timeLeft}
            </p>
          </div>
        </div>
      </div>

      {/* Access Token */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-blue-900">Access Token</h2>
        <p className="mb-2 text-xs text-blue-700">
          API 요청 시 사용되는 JWT 토큰 (만료 시간: {session.expires_in}초)
        </p>
        <div className="overflow-x-auto">
          <code className="block break-all rounded bg-white p-3 font-mono text-xs text-gray-800">
            {session.access_token}
          </code>
        </div>
      </div>

      {/* Refresh Token */}
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-green-900">Refresh Token</h2>
        <p className="mb-2 text-xs text-green-700">
          세션을 갱신할 때 사용되는 토큰 (보안상 중요한 정보입니다)
        </p>
        <div className="overflow-x-auto">
          <code className="block break-all rounded bg-white p-3 font-mono text-xs text-gray-800">
            {session.refresh_token}
          </code>
        </div>
      </div>

      {/* 사용자 메타데이터 */}
      {session.user.user_metadata && Object.keys(session.user.user_metadata).length > 0 && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-purple-900">사용자 메타데이터</h2>
          <pre className="overflow-x-auto rounded bg-white p-3 font-mono text-xs text-gray-800">
            {JSON.stringify(session.user.user_metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
