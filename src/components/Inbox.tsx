"use client";

import React, { useEffect, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Circle,
  Clock,
  Filter,
  Inbox as InboxIcon,
  MoreHorizontal,
  Search,
  AlertCircle,
  MessageSquare,
  UserPlus,
  CalendarClock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NotificationType } from "@/types/database.types";

// Notification과 관련된 Issue, User 정보를 포함하는 확장 타입
interface NotificationWithDetails {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
  issue?: {
    issue_key: string;
    title: string;
    priority: string;
  } | null;
  triggered_by?: {
    name: string;
    profile_image: string | null;
  } | null;
}

interface InboxProps {
  userId: string; // 현재 로그인한 사용자 ID
}

const Inbox: React.FC<InboxProps> = ({ userId }) => {
  const [notifications, setNotifications] = useState<NotificationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // 알림 데이터 불러오기
  useEffect(() => {
    fetchNotifications();
  }, [userId]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      // notifications 테이블에서 데이터 조회
      // reference_type이 'issue'인 경우 issues 테이블과 조인
      const { data, error: fetchError } = await supabase
        .from("notifications")
        .select(`
          *,
          issue:issues!notifications_reference_id_fkey(
            issue_key,
            title,
            priority
          ),
          triggered_by:users!notifications_user_id_fkey(
            name,
            profile_image
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (fetchError) {
        throw fetchError;
      }

      setNotifications(data || []);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError("알림을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 읽음/안읽음 상태 토글
  const toggleReadStatus = async (notificationId: string, currentReadStatus: boolean) => {
    try {
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_read: !currentReadStatus })
        .eq("id", notificationId);

      if (updateError) {
        throw updateError;
      }

      // 로컬 상태 업데이트
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: !currentReadStatus } : n
        )
      );
    } catch (err) {
      console.error("Failed to update notification status:", err);
    }
  };

  // 시간 포맷팅 (예: "2d", "3h", "5m")
  const formatTime = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d`;
    if (diffHours > 0) return `${diffHours}h`;
    if (diffMins > 0) return `${diffMins}m`;
    return "now";
  };

  // 우선순위 판단 (issue의 priority 기반)
  const isHighPriority = (priority?: string) => {
    return priority === "HIGH" || priority === "high";
  };

  // 알림 타입에 따른 아이콘 반환 (DB NotificationType에 맞게 매핑)
  const getIcon = (notification: NotificationWithDetails) => {
    const type = notification.type;

    switch (type) {
      case "issue_assigned": // DB: 이슈 할당됨
        return (
          <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-500">
            <UserPlus size={12} />
          </div>
        );
      case "comment_added": // DB: 댓글 추가됨
        return (
          <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600">
            <MessageSquare size={12} />
          </div>
        );
      case "due_date_approaching": // DB: 마감일 임박
        return (
          <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-orange-500">
            <CalendarClock size={12} />
          </div>
        );
      case "due_date_today": // DB: 마감일 오늘
        return (
          <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-red-500">
            <Clock size={12} />
          </div>
        );
      case "team_invited": // DB: 팀 초대됨
        return (
          <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-purple-500">
            <UserPlus size={12} />
          </div>
        );
      case "role_changed": // DB: 역할 변경됨
        return (
          <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500">
            <AlertCircle size={12} />
          </div>
        );
      default:
        return (
          <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
            <Bell size={12} />
          </div>
        );
    }
  };

  // 로딩 상태 처리
  if (loading) {
    return (
      <div className="flex h-full bg-white items-center justify-center">
        <div className="text-slate-500">알림을 불러오는 중...</div>
      </div>
    );
  }

  // 에러 상태 처리
  if (error) {
    return (
      <div className="flex h-full bg-white items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white">
      {/* Inbox List */}
      <div className="w-full md:w-[400px] border-r border-slate-200 flex flex-col bg-white">
        <div className="h-12 border-b border-slate-100 flex items-center justify-between px-4 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-800">Inbox</span>
            <MoreHorizontal size={14} className="text-slate-400" />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1 text-slate-400 hover:text-slate-600">
              <Filter size={14} />
            </button>
            <button className="p-1 text-slate-400 hover:text-slate-600">
              <CheckCircle2 size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <InboxIcon size={48} className="mb-2" />
              <p>알림이 없습니다</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex gap-3 p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer ${
                  !notification.is_read ? "bg-blue-50/30" : ""
                }`}
                onClick={() => toggleReadStatus(notification.id, notification.is_read)}
              >
                <div className="mt-0.5">{getIcon(notification)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <span className="text-xs font-medium text-slate-600 truncate">
                      {notification.issue?.issue_key} {notification.issue?.title || notification.title}
                    </span>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {formatTime(notification.created_at)}
                    </span>
                  </div>
                  <div className="text-sm text-slate-900 leading-snug mb-1">
                    {notification.message}
                  </div>
                  <div className="flex items-center gap-2">
                    {notification.issue && isHighPriority(notification.issue.priority) && (
                      <span className="w-4 h-4 rounded bg-red-100 flex items-center justify-center text-red-600 text-[10px] font-bold">
                        !
                      </span>
                    )}
                  </div>
                </div>
                {!notification.is_read && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Preview Area (Hidden on mobile, visible on desktop) */}
      <div className="hidden md:flex flex-1 flex-col bg-white items-center justify-center">
        <div className="text-slate-400 text-center">
          <InboxIcon size={64} className="mx-auto mb-4 opacity-30" />
          <p>알림을 선택하여 자세히 보기</p>
        </div>
      </div>
    </div>
  );
};

export default Inbox;
