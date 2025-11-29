'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription'
import { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Realtime 메시지 타입 정의
 */
interface RealtimeMessage {
  id: number
  message: string
  created_at: string
}

/**
 * Presence 사용자 상태 타입 정의
 */
interface PresenceState {
  user_id: string
  online_at: string
}

export default function RealtimePage() {
  const [messages, setMessages] = useState<RealtimeMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState(0)
  const [presenceChannel, setPresenceChannel] = useState<RealtimeChannel | null>(null)

  // 데이터베이스 변경 구독 (커스텀 훅 사용)
  const { isConnected, error, reconnect, disconnect } = useRealtimeSubscription<RealtimeMessage>({
    channelName: 'realtime-messages-channel',
    tableName: 'realtime_messages',
    onInsert: (newMsg) => {
      console.log('새 메시지 수신:', newMsg)
      setMessages((prev) => [...prev, newMsg])
    },
  })

  // Presence 기능 설정
  useEffect(() => {
    const supabase = createClient()

    // Presence 채널 생성
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: crypto.randomUUID(), // 각 클라이언트마다 고유 ID
        },
      },
    })

    // sync: 초기 상태 및 상태 변경시 호출
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const count = Object.keys(state).length
      setOnlineUsers(count)
      console.log('현재 접속자 수:', count)
    })

    // join: 새로운 사용자 입장
    channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      console.log('새 사용자 입장:', newPresences)
    })

    // leave: 사용자 퇴장
    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      console.log('사용자 퇴장:', leftPresences)
    })

    // 채널 구독 및 presence 추적
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // 현재 사용자를 presence에 추가
        const presenceStatus = await channel.track({
          user_id: crypto.randomUUID(),
          online_at: new Date().toISOString(),
        } as PresenceState)
        console.log('Presence 추적 상태:', presenceStatus)
      }
    })

    setPresenceChannel(channel)

    // 정리 함수
    return () => {
      channel.unsubscribe()
      supabase.removeChannel(channel)
    }
  }, [])

  // 초기 메시지 로드
  useEffect(() => {
    const fetchMessages = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('realtime_messages')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('메시지 로드 실패:', error)
        return
      }

      if (data) {
        setMessages(data)
      }
    }

    fetchMessages()
  }, [])

  /**
   * 새 메시지 추가 핸들러
   */
  const handleAddMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim()) return

    setIsLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('realtime_messages')
      .insert({
        message: newMessage.trim(),
      })

    if (error) {
      console.error('메시지 추가 실패:', error)
      alert('메시지 추가에 실패했습니다.')
    } else {
      setNewMessage('')
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">
          Supabase Realtime 테스트
        </h1>

        {/* 상태 표시 영역 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* 구독 상태 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-2 text-gray-900">구독 상태</h2>
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-gray-700">
                {isConnected ? '연결됨' : '연결 끊김'}
              </span>
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600">오류: {error}</p>
            )}

            {/* 연결 제어 버튼 */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={reconnect}
                disabled={isConnected}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
              >
                재연결
              </button>
              <button
                onClick={disconnect}
                disabled={!isConnected}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
              >
                연결 해제
              </button>
            </div>
          </div>

          {/* 접속자 수 (Presence) */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-2 text-gray-900">
              현재 접속 중인 사용자
            </h2>
            <p className="text-3xl font-bold text-blue-600">{onlineUsers}명</p>
            <p className="text-sm text-gray-500 mt-2">
              실시간 Presence 기능으로 추적 중
            </p>
          </div>
        </div>

        {/* 메시지 추가 폼 */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">
            새 메시지 추가
          </h2>
          <form onSubmit={handleAddMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="메시지를 입력하세요..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !newMessage.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isLoading ? '추가 중...' : '추가'}
            </button>
          </form>
        </div>

        {/* 메시지 목록 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">
            실시간 메시지 목록
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                아직 메시지가 없습니다.
              </p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-4 bg-gray-50 rounded border border-gray-200"
                >
                  <p className="text-gray-900">{msg.message}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(msg.created_at).toLocaleString('ko-KR')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 안내 메시지 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            테스트 방법
          </h3>
          <ul className="list-disc list-inside text-blue-800 space-y-1">
            <li>새 브라우저 탭을 열어 이 페이지를 여러 개 띄워보세요</li>
            <li>한 탭에서 메시지를 추가하면 다른 탭에도 실시간으로 나타납니다</li>
            <li>탭을 열 때마다 접속자 수가 증가합니다</li>
            <li>탭을 닫으면 접속자 수가 감소합니다</li>
            <li>연결 해제 버튼을 누르면 실시간 업데이트가 중지됩니다</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
