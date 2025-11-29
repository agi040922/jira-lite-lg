// 팀 초대 상태 타입
export type InvitationStatus = 'pending' | 'accepted' | 'expired';

// 팀 초대 데이터 타입
export interface TeamInvitation {
  id: string;
  email: string;
  token: string;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
  invited_by?: string; // 초대한 사람의 이메일 또는 이름
}

// 초대 이메일 발송 요청 타입
export interface SendInviteRequest {
  email: string;
  invitedBy?: string;
}

// 초대 이메일 발송 응답 타입
export interface SendInviteResponse {
  success: boolean;
  message: string;
  token?: string;
}
