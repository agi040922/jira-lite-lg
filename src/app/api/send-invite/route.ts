import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/server';
import type { SendInviteRequest, SendInviteResponse } from '@/types/team-invite';

// Resend 클라이언트 초기화
// 환경 변수에서 API 키를 가져옵니다
const resend = new Resend(process.env.RESEND_API_KEY);

// 초대 이메일 HTML 템플릿
function getInviteEmailTemplate(inviteLink: string, invitedBy: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 30px;
            margin: 20px 0;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #0070f3;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>팀 초대</h2>
          <p>${invitedBy}님이 팀에 초대했습니다.</p>
          <p>아래 버튼을 클릭하여 초대를 수락하세요:</p>
          <a href="${inviteLink}" class="button">초대 수락하기</a>
          <p>또는 다음 링크를 복사하여 브라우저에 붙여넣으세요:</p>
          <p style="word-break: break-all; color: #666;">${inviteLink}</p>
          <div class="footer">
            <p>이 초대는 7일 후 만료됩니다.</p>
            <p>초대를 요청하지 않으셨다면 이 메일을 무시하세요.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    // 요청 본문 파싱
    const body: SendInviteRequest = await request.json();
    const { email, invitedBy = '관리자' } = body;

    // 이메일 유효성 검사
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, message: '유효한 이메일 주소를 입력해주세요.' } as SendInviteResponse,
        { status: 400 }
      );
    }

    // Supabase 클라이언트 생성
    const supabase = await createClient();

    // 이미 초대된 이메일인지 확인
    const { data: existingInvite } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      return NextResponse.json(
        { success: false, message: '이미 초대가 전송된 이메일입니다.' } as SendInviteResponse,
        { status: 400 }
      );
    }

    // 고유한 토큰 생성
    const token = uuidv4();

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
      });

    if (insertError) {
      console.error('초대 정보 저장 실패:', insertError);
      return NextResponse.json(
        { success: false, message: '초대 정보를 저장하는데 실패했습니다.' } as SendInviteResponse,
        { status: 500 }
      );
    }

    // 초대 링크 생성
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/test/team-invite/accept?token=${token}`;

    // 이메일 발송
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: email,
        subject: `${invitedBy}님이 팀에 초대했습니다`,
        html: getInviteEmailTemplate(inviteLink, invitedBy),
      });

      return NextResponse.json(
        {
          success: true,
          message: '초대 이메일이 성공적으로 발송되었습니다.',
          token,
        } as SendInviteResponse,
        { status: 200 }
      );
    } catch (emailError) {
      console.error('이메일 발송 실패:', emailError);

      // 이메일 발송 실패 시 DB에서 초대 정보 삭제
      await supabase.from('team_invitations').delete().eq('token', token);

      return NextResponse.json(
        { success: false, message: '이메일 발송에 실패했습니다.' } as SendInviteResponse,
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('초대 처리 중 오류:', error);
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' } as SendInviteResponse,
      { status: 500 }
    );
  }
}
