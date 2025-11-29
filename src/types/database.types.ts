/**
 * Supabase 데이터베이스 타입 정의
 *
 * 이 파일은 Supabase CLI로 자동 생성할 수도 있습니다:
 * npx supabase gen types typescript --project-id <project-id> > src/types/database.types.ts
 */

// =============================================
// Enum 타입 정의
// =============================================

export type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type InvitationStatus = 'pending' | 'accepted' | 'expired';
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
export type AuthProvider = 'email' | 'google';
export type NotificationType =
  | 'issue_assigned'
  | 'comment_added'
  | 'due_date_approaching'
  | 'due_date_today'
  | 'team_invited'
  | 'role_changed';
export type AICacheType =
  | 'summary'
  | 'suggestion'
  | 'auto_label'
  | 'duplicate'
  | 'comment_summary';
export type RateLimitWindowType = 'minute' | 'day';

// =============================================
// 테이블 Row 타입 (조회 시 사용)
// =============================================

export interface User {
  id: string;
  email: string;
  name: string;
  profile_image: string | null;
  provider: AuthProvider;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  joined_at: string;
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  token: string;
  status: InvitationStatus;
  invited_by_id: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface TeamActivityLog {
  id: string;
  team_id: string;
  user_id: string;
  action_type: string;
  target_type: string | null;
  target_id: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Project {
  id: string;
  team_id: string;
  name: string;
  description: string | null;
  owner_id: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProjectFavorite {
  id: string;
  project_id: string;
  user_id: string;
  created_at: string;
}

export interface ProjectStatus {
  id: string;
  project_id: string;
  name: string;
  color: string | null;
  position: number;
  is_default: boolean;
  wip_limit: number | null;
  created_at: string;
}

export interface Label {
  id: string;
  project_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Issue {
  id: string;
  project_id: string;
  issue_number: number;
  issue_key: string;
  title: string;
  description: string | null;
  status_id: string | null;
  priority: Priority;
  assignee_id: string | null;
  owner_id: string;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface IssueLabel {
  id: string;
  issue_id: string;
  label_id: string;
  created_at: string;
}

export interface Subtask {
  id: string;
  issue_id: string;
  title: string;
  is_completed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  issue_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface IssueHistory {
  id: string;
  issue_id: string;
  user_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface AICache {
  id: string;
  issue_id: string;
  cache_type: AICacheType;
  content: string;
  input_hash: string;
  created_at: string;
  expires_at: string | null;
}

export interface AIRateLimit {
  id: string;
  user_id: string;
  request_count: number;
  window_start: string;
  window_type: RateLimitWindowType;
}

export interface PasswordResetToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

// =============================================
// Insert 타입 (생성 시 사용)
// =============================================

export interface UserInsert {
  id: string; // auth.users의 id
  email: string;
  name: string;
  profile_image?: string | null;
  provider?: AuthProvider;
}

export interface TeamInsert {
  name: string;
  owner_id: string;
}

export interface TeamMemberInsert {
  team_id: string;
  user_id: string;
  role: TeamRole;
}

export interface TeamInvitationInsert {
  team_id: string;
  email: string;
  invited_by_id: string;
  expires_at?: string;
}

export interface ProjectInsert {
  team_id: string;
  name: string;
  description?: string | null;
  owner_id: string;
}

export interface ProjectStatusInsert {
  project_id: string;
  name: string;
  color?: string | null;
  position: number;
  wip_limit?: number | null;
}

export interface LabelInsert {
  project_id: string;
  name: string;
  color?: string;
}

export interface IssueInsert {
  project_id: string;
  title: string;
  description?: string | null;
  status_id?: string | null;
  priority?: Priority;
  assignee_id?: string | null;
  owner_id: string;
  due_date?: string | null;
  position?: number;
}

export interface IssueLabelInsert {
  issue_id: string;
  label_id: string;
}

export interface SubtaskInsert {
  issue_id: string;
  title: string;
  is_completed?: boolean;
  position?: number;
}

export interface CommentInsert {
  issue_id: string;
  user_id: string;
  content: string;
}

export interface NotificationInsert {
  user_id: string;
  type: NotificationType;
  title: string;
  message?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
}

export interface AICacheInsert {
  issue_id: string;
  cache_type: AICacheType;
  content: string;
  input_hash: string;
  expires_at?: string | null;
}

// =============================================
// Update 타입 (수정 시 사용)
// =============================================

export interface UserUpdate {
  name?: string;
  profile_image?: string | null;
}

export interface TeamUpdate {
  name?: string;
}

export interface TeamMemberUpdate {
  role?: TeamRole;
}

export interface TeamInvitationUpdate {
  status?: InvitationStatus;
}

export interface ProjectUpdate {
  name?: string;
  description?: string | null;
  is_archived?: boolean;
  deleted_at?: string | null;
}

export interface ProjectStatusUpdate {
  name?: string;
  color?: string | null;
  position?: number;
  wip_limit?: number | null;
}

export interface LabelUpdate {
  name?: string;
  color?: string;
}

export interface IssueUpdate {
  title?: string;
  description?: string | null;
  status_id?: string | null;
  priority?: Priority;
  assignee_id?: string | null;
  due_date?: string | null;
  position?: number;
  deleted_at?: string | null;
}

export interface SubtaskUpdate {
  title?: string;
  is_completed?: boolean;
  position?: number;
}

export interface CommentUpdate {
  content?: string;
  deleted_at?: string | null;
}

export interface NotificationUpdate {
  is_read?: boolean;
}

// =============================================
// 조인된 타입 (관계 포함)
// =============================================

export interface IssueWithRelations extends Issue {
  status?: ProjectStatus | null;
  assignee?: User | null;
  owner?: User;
  labels?: Label[];
  subtasks?: Subtask[];
  comments_count?: number;
}

export interface ProjectWithRelations extends Project {
  team?: Team;
  owner?: User;
  statuses?: ProjectStatus[];
  labels?: Label[];
  issues_count?: number;
  is_favorited?: boolean;
}

export interface TeamWithRelations extends Team {
  owner?: User;
  members?: TeamMemberWithUser[];
  projects_count?: number;
}

export interface TeamMemberWithUser extends TeamMember {
  user?: User;
}

export interface CommentWithUser extends Comment {
  user?: User;
}

export interface IssueHistoryWithUser extends IssueHistory {
  user?: User;
}

export interface TeamActivityLogWithUser extends TeamActivityLog {
  user?: User;
}

// =============================================
// API 응답 타입
// =============================================

export interface AIRateLimitStatus {
  allowed: boolean;
  minute_remaining: number;
  day_remaining: number;
  reset_minute: string;
  reset_day: string;
}

export interface AISummaryResponse {
  summary: string;
  cached: boolean;
}

export interface AISuggestionResponse {
  suggestions: string[];
  cached: boolean;
}

export interface AILabelRecommendation {
  labels: Label[];
  cached: boolean;
}

export interface AIDuplicateDetection {
  duplicates: {
    issue: Issue;
    similarity: number;
  }[];
}

// =============================================
// Database 스키마 타입 (Supabase 클라이언트용)
// =============================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: UserInsert;
        Update: UserUpdate;
      };
      teams: {
        Row: Team;
        Insert: TeamInsert;
        Update: TeamUpdate;
      };
      team_members: {
        Row: TeamMember;
        Insert: TeamMemberInsert;
        Update: TeamMemberUpdate;
      };
      team_invitations: {
        Row: TeamInvitation;
        Insert: TeamInvitationInsert;
        Update: TeamInvitationUpdate;
      };
      team_activity_logs: {
        Row: TeamActivityLog;
        Insert: Omit<TeamActivityLog, 'id' | 'created_at'>;
        Update: never;
      };
      projects: {
        Row: Project;
        Insert: ProjectInsert;
        Update: ProjectUpdate;
      };
      project_favorites: {
        Row: ProjectFavorite;
        Insert: Omit<ProjectFavorite, 'id' | 'created_at'>;
        Update: never;
      };
      project_statuses: {
        Row: ProjectStatus;
        Insert: ProjectStatusInsert;
        Update: ProjectStatusUpdate;
      };
      labels: {
        Row: Label;
        Insert: LabelInsert;
        Update: LabelUpdate;
      };
      issues: {
        Row: Issue;
        Insert: IssueInsert;
        Update: IssueUpdate;
      };
      issue_labels: {
        Row: IssueLabel;
        Insert: IssueLabelInsert;
        Update: never;
      };
      subtasks: {
        Row: Subtask;
        Insert: SubtaskInsert;
        Update: SubtaskUpdate;
      };
      comments: {
        Row: Comment;
        Insert: CommentInsert;
        Update: CommentUpdate;
      };
      issue_history: {
        Row: IssueHistory;
        Insert: Omit<IssueHistory, 'id' | 'created_at'>;
        Update: never;
      };
      notifications: {
        Row: Notification;
        Insert: NotificationInsert;
        Update: NotificationUpdate;
      };
      ai_cache: {
        Row: AICache;
        Insert: AICacheInsert;
        Update: never;
      };
      ai_rate_limits: {
        Row: AIRateLimit;
        Insert: Omit<AIRateLimit, 'id'>;
        Update: Omit<Partial<AIRateLimit>, 'id' | 'user_id' | 'window_type'>;
      };
      password_reset_tokens: {
        Row: PasswordResetToken;
        Insert: Omit<PasswordResetToken, 'id' | 'created_at' | 'token'>;
        Update: Pick<PasswordResetToken, 'used_at'>;
      };
    };
    Functions: {
      check_ai_rate_limit: {
        Args: { p_user_id: string };
        Returns: AIRateLimitStatus[];
      };
      increment_ai_rate_limit: {
        Args: { p_user_id: string };
        Returns: void;
      };
      generate_content_hash: {
        Args: { content: string };
        Returns: string;
      };
      log_team_activity: {
        Args: {
          p_team_id: string;
          p_user_id: string;
          p_action_type: string;
          p_target_type: string;
          p_target_id: string;
          p_description: string;
          p_metadata?: Record<string, unknown>;
        };
        Returns: string;
      };
      create_notification: {
        Args: {
          p_user_id: string;
          p_type: NotificationType;
          p_title: string;
          p_message: string;
          p_reference_type?: string;
          p_reference_id?: string;
        };
        Returns: string;
      };
    };
  };
}
