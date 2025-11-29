import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/server';

// 초대 링크 생성 요청 타입
interface GenerateInviteLinkRequest {
  email: string;
  invitedBy?: string;
  teamId: string;
  role: 'ADMIN' | 'MEMBER';
}

// 초대 링크 생성 응답 타입
interface GenerateInviteLinkResponse {
  success: boolean;
  message: string;
  token?: string;
  inviteLink?: string;
}

export async function POST(request: NextRequest) {
  try {
    // 요청 본문 파싱
    const body: GenerateInviteLinkRequest = await request.json();
    const { email, invitedBy = '관리자', teamId, role } = body;

    // 이메일 유효성 검사
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, message: '유효한 이메일 주소를 입력해주세요.' } as GenerateInviteLinkResponse,
        { status: 400 }
      );
    }

    if (!teamId) {
      return NextResponse.json(
        { success: false, message: '팀 ID가 필요합니다.' } as GenerateInviteLinkResponse,
        { status: 400 }
      );
    }

    // Supabase 클라이언트 생성
    const supabase = await createClient();

    // 이메일로 사용자 찾기 (선택사항 - 회원가입 전이어도 초대 가능)
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    // 이미 팀 멤버인지 확인 (사용자가 존재하는 경우만)
    if (existingUser) {
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', existingUser.id)
        .maybeSingle();

      if (existingMember) {
        return NextResponse.json(
          { success: false, message: '이미 팀에 속한 멤버입니다.' } as GenerateInviteLinkResponse,
          { status: 400 }
        );
      }
    }

    // 이미 초대된 이메일인지 확인 (pending 상태)
    const { data: existingInvite } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('email', email)
      .eq('team_id', teamId)
      .eq('status', 'pending')
      .maybeSingle();

    let token: string;

    if (existingInvite) {
      // 기존 초대가 있으면 그 토큰 재사용
      token = existingInvite.token;
    } else {
      // 고유한 토큰 생성
      token = uuidv4();

      // 만료 시간 설정 (7일 후)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // 데이터베이스에 초대 정보 저장
      const { error: insertError } = await supabase
        .from('team_invitations')
        .insert({
          email,
          token,
          status: 'pending',
          expires_at: expiresAt.toISOString(),
          invited_by: invitedBy,
          team_id: teamId,
          role,
        });

      if (insertError) {
        console.error('초대 정보 저장 실패:', insertError);
        return NextResponse.json(
          { success: false, message: '초대 정보를 저장하는데 실패했습니다.' } as GenerateInviteLinkResponse,
          { status: 500 }
        );
      }
    }

    // 초대 링크 생성
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/team/join?token=${token}`;

    return NextResponse.json(
      {
        success: true,
        message: '초대 링크가 생성되었습니다.',
        token,
        inviteLink,
      } as GenerateInviteLinkResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error('초대 링크 생성 중 오류:', error);
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' } as GenerateInviteLinkResponse,
      { status: 500 }
    );
  }
}
