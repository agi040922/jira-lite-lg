import { useEffect, useState, useRef, useCallback } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

/**
 * 재사용 가능한 Supabase Realtime 구독 커스텀 훅
 *
 * @param channelName - 채널 이름
 * @param tableName - 구독할 테이블 이름
 * @param onInsert - INSERT 이벤트 발생시 콜백 함수
 * @param onUpdate - UPDATE 이벤트 발생시 콜백 함수
 * @param onDelete - DELETE 이벤트 발생시 콜백 함수
 */
interface UseRealtimeSubscriptionProps<T> {
  channelName: string
  tableName: string
  onInsert?: (payload: T) => void
  onUpdate?: (payload: T) => void
  onDelete?: (payload: T) => void
}

interface SubscriptionStatus {
  isConnected: boolean
  error: string | null
  channel: RealtimeChannel | null
}

export function useRealtimeSubscription<T>({
  channelName,
  tableName,
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeSubscriptionProps<T>) {
  const [status, setStatus] = useState<SubscriptionStatus>({
    isConnected: false,
    error: null,
    channel: null,
  })

  // 콜백 함수들을 ref로 저장하여 안정적인 참조 유지
  const onInsertRef = useRef(onInsert)
  const onUpdateRef = useRef(onUpdate)
  const onDeleteRef = useRef(onDelete)

  // ref 업데이트 (최신 콜백 함수 유지)
  useEffect(() => {
    onInsertRef.current = onInsert
    onUpdateRef.current = onUpdate
    onDeleteRef.current = onDelete
  }, [onInsert, onUpdate, onDelete])

  useEffect(() => {
    const supabase = createClient()

    // 채널 생성
    const channel = supabase.channel(channelName)

    // INSERT 이벤트 리스너 등록
    if (onInsertRef.current) {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: tableName,
        },
        (payload) => {
          onInsertRef.current?.(payload.new as T)
        }
      )
    }

    // UPDATE 이벤트 리스너 등록
    if (onUpdateRef.current) {
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: tableName,
        },
        (payload) => {
          onUpdateRef.current?.(payload.new as T)
        }
      )
    }

    // DELETE 이벤트 리스너 등록
    if (onDeleteRef.current) {
      channel.on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: tableName,
        },
        (payload) => {
          onDeleteRef.current?.(payload.old as T)
        }
      )
    }

    // 채널 구독
    channel.subscribe((subscriptionStatus, err) => {
      if (subscriptionStatus === 'SUBSCRIBED') {
        setStatus((prev) => ({
          ...prev,
          isConnected: true,
          error: null,
          channel,
        }))
      }

      if (subscriptionStatus === 'CHANNEL_ERROR') {
        setStatus((prev) => ({
          ...prev,
          isConnected: false,
          error: err?.message || '채널 연결 오류가 발생했습니다.',
        }))
      }

      if (subscriptionStatus === 'TIMED_OUT') {
        setStatus((prev) => ({
          ...prev,
          isConnected: false,
          error: 'Realtime 서버가 응답하지 않습니다.',
        }))
      }

      if (subscriptionStatus === 'CLOSED') {
        setStatus((prev) => ({
          ...prev,
          isConnected: false,
          error: 'Realtime 채널이 예기치 않게 닫혔습니다.',
        }))
      }
    })

    // 컴포넌트 언마운트시 구독 정리
    // Supabase 문서 권장 방법: unsubscribe -> removeChannel
    return () => {
      channel.unsubscribe()
      supabase.removeChannel(channel)
    }
  }, [channelName, tableName])

  /**
   * 수동으로 채널 재연결
   */
  const reconnect = async () => {
    if (status.channel) {
      await status.channel.subscribe()
    }
  }

  /**
   * 수동으로 채널 연결 해제
   */
  const disconnect = async () => {
    if (status.channel) {
      await status.channel.unsubscribe()
      setStatus({
        isConnected: false,
        error: null,
        channel: null,
      })
    }
  }

  return {
    isConnected: status.isConnected,
    error: status.error,
    reconnect,
    disconnect,
  }
}
