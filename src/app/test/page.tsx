import Link from 'next/link'

export default function TestPage() {
  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-gray-900">
          Supabase 기능 테스트 페이지
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* CRUD 테스트 */}
          <Link
            href="/test/crud"
            className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2 text-blue-600">
              CRUD 테스트
            </h2>
            <p className="text-gray-600">
              기본 테이블 생성, 읽기, 수정, 삭제 기능 테스트
            </p>
          </Link>

          {/* 스토리지 테스트 */}
          <Link
            href="/test/storage"
            className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2 text-green-600">
              스토리지 테스트
            </h2>
            <p className="text-gray-600">
              버킷 파일 업로드 및 다운로드 기능 테스트
            </p>
          </Link>

          {/* 인증 테스트 */}
          <Link
            href="/test/auth"
            className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2 text-purple-600">
              인증 테스트
            </h2>
            <p className="text-gray-600">
              회원가입, 로그인, JWT 토큰, 세션 관리 테스트
            </p>
          </Link>

          {/* Realtime 테스트 */}
          <Link
            href="/test/realtime"
            className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2 text-orange-600">
              Realtime 테스트
            </h2>
            <p className="text-gray-600">
              실시간 데이터 동기화 및 구독 기능 테스트
            </p>
          </Link>

          {/* Rich Text Editor 테스트 */}
          <Link
            href="/test/editor"
            className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2 text-pink-600">
              Rich Text Editor
            </h2>
            <p className="text-gray-600">
              이미지 업로드, 클립보드 붙여넣기 기능 테스트
            </p>
          </Link>

          {/* Soft Delete 테스트 */}
          <Link
            href="/test/soft-delete"
            className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2 text-red-600">
              Soft Delete 테스트
            </h2>
            <p className="text-gray-600">
              논리적 삭제 및 복구 기능 테스트
            </p>
          </Link>

          {/* 팀 초대 테스트 */}
          <Link
            href="/test/team-invite"
            className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2 text-indigo-600">
              팀 멤버 초대
            </h2>
            <p className="text-gray-600">
              이메일 발송 기능 테스트
            </p>
          </Link>
        </div>

        <div className="mt-12 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-xl font-semibold mb-4 text-yellow-800">
            ⚠️ 테스트 전 준비사항
          </h3>
          <ul className="list-disc list-inside space-y-2 text-yellow-700">
            <li>.env.local 파일에 Supabase 환경 변수 설정</li>
            <li>Supabase 대시보드에서 필요한 버킷 생성</li>
            <li>Google OAuth 설정 완료</li>
            <li>이메일 발송을 위한 SMTP 설정 (선택)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
