
import { Priority, Project, Status, User, Issue, Health } from './types';

export const currentUser: User = {
  id: 'u1',
  name: '김철수',
  email: 'chulsoo@lightsoft.com',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  role: 'OWNER'
};

export const teamMembers: User[] = [
  currentUser,
  { id: 'u2', name: '이영희', email: 'yh@lightsoft.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka', role: 'ADMIN' },
  { id: 'u3', name: '박지민', email: 'jm@lightsoft.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jimin', role: 'MEMBER' },
  { id: 'u4', name: '최민수', email: 'ms@lightsoft.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Minsoo', role: 'MEMBER' },
];

export const projects: Project[] = [
  { 
    id: 'p1', 
    name: '제이콘 토목 산업 작업', 
    description: '토목 산업 관련 플랫폼 구축', 
    health: Health.ON_TRACK,
    lead: teamMembers[1],
    targetDate: '11월 19일',
    statusPercent: 79,
    priority: Priority.HIGH,
    updatedAt: '2025-11-19'
  },
  { 
    id: 'p2', 
    name: '돌핀 CRM', 
    description: '고객 관리 시스템 고도화', 
    health: Health.ON_TRACK,
    lead: teamMembers[2],
    targetDate: '11월 28일',
    statusPercent: 54,
    priority: Priority.MEDIUM,
    updatedAt: '2025-11-20'
  },
  { 
    id: 'p3', 
    name: '동문 모임 관리 웹사이트', 
    description: '일단 신경끌것', 
    health: Health.OFF_TRACK,
    lead: teamMembers[0],
    targetDate: '12월 05일',
    statusPercent: 100,
    priority: Priority.LOW,
    updatedAt: '2025-12-01'
  },
  { 
    id: 'p4', 
    name: '수퍼 퍼플 프로젝트 (학원 CRM)', 
    description: '학원 관리 시스템', 
    health: Health.ON_TRACK,
    lead: teamMembers[3],
    targetDate: '12월 12일',
    statusPercent: 0,
    priority: Priority.HIGH,
    updatedAt: '2025-12-01'
  },
  { 
    id: 'p5', 
    name: '안과용 설문조사 웹페이지 개선', 
    description: '견적 전송 중', 
    health: Health.AT_RISK,
    lead: teamMembers[1],
    targetDate: '미정',
    statusPercent: 100,
    priority: Priority.MEDIUM,
    updatedAt: '2025-11-15'
  }
];

export const issues: Issue[] = [
  {
    id: 'LIG-325',
    projectId: 'p1',
    title: '배포 스크립트 or 커맨드 제작',
    description: '자동 배포를 위한 스크립트를 작성해야 합니다.',
    status: Status.IN_REVIEW,
    priority: Priority.HIGH,
    assignee: teamMembers[0],
    createdAt: '11월 27일',
    labels: ['DevOps'],
    subtasks: [],
    commentsCount: 2
  },
  {
    id: 'LIG-337',
    projectId: 'p1',
    title: '홈페이지 개편',
    description: '메인 페이지 UI를 전면 개편합니다.',
    status: Status.TODO,
    priority: Priority.MEDIUM,
    assignee: teamMembers[2],
    dueDate: '12월 2일',
    createdAt: '11월 28일',
    labels: ['Design', 'Frontend'],
    subtasks: [],
    commentsCount: 1
  },
  {
    id: 'LIG-235',
    projectId: 'p2',
    title: '토스 페이먼츠 결제 기능 확인',
    description: '결제 모듈 연동 테스트',
    status: Status.TODO,
    priority: Priority.HIGH,
    assignee: teamMembers[3],
    createdAt: '11월 14일',
    labels: ['Backend'],
    subtasks: [],
    commentsCount: 0
  },
  {
    id: 'LIG-311',
    projectId: 'p3',
    title: 'ivma 견적 보내기',
    description: '견적서 작성 및 발송',
    status: Status.BACKLOG,
    priority: Priority.LOW,
    assignee: teamMembers[3],
    createdAt: '11월 25일',
    labels: ['Sales'],
    subtasks: [],
    commentsCount: 0
  },
  {
    id: 'LIG-279',
    projectId: 'p3',
    title: '개발현황 공유',
    description: '주간 개발 현황 보고',
    status: Status.BACKLOG,
    priority: Priority.LOW,
    assignee: teamMembers[3],
    createdAt: '11월 20일',
    labels: [],
    subtasks: [],
    commentsCount: 3
  },
  {
    id: 'LIG-252',
    projectId: 'p1',
    title: '하드코딩된 계좌번호 수정',
    description: '환경변수로 분리 필요',
    status: Status.DONE,
    priority: Priority.HIGH,
    assignee: teamMembers[0],
    createdAt: '11월 18일',
    labels: ['Refactor'],
    subtasks: [],
    commentsCount: 5
  },
  {
    id: 'LIG-246',
    projectId: 'p1',
    title: '신규 게시글 추가',
    description: '게시판 CRUD 구현',
    status: Status.DONE,
    priority: Priority.MEDIUM,
    assignee: teamMembers[0],
    createdAt: '11월 17일',
    labels: ['Feature'],
    subtasks: [],
    commentsCount: 1
  },
  {
    id: 'LIG-275',
    projectId: 'p2',
    title: '팝업 생성 - 창 1개만 만들어지고 탭 구분으로만 공지를 볼 수 있어서 창 여러개로 올라오도록 변경',
    description: '멀티 윈도우 지원 필요',
    status: Status.DONE,
    priority: Priority.LOW,
    assignee: teamMembers[2],
    createdAt: '11월 19일',
    labels: ['Feature'],
    subtasks: [],
    commentsCount: 0
  }
];

// Analytics Mock Data
export const statsData = {
    weeklyTrend: [
        { name: 'Mon', created: 4, completed: 2 },
        { name: 'Tue', created: 3, completed: 5 },
        { name: 'Wed', created: 2, completed: 3 },
        { name: 'Thu', created: 6, completed: 4 },
        { name: 'Fri', created: 3, completed: 6 },
        { name: 'Sat', created: 1, completed: 1 },
        { name: 'Sun', created: 0, completed: 0 },
    ],
    memberWorkload: [
        { name: '김철수', issues: 5, completed: 3 },
        { name: '이영희', issues: 3, completed: 2 },
        { name: '박지민', issues: 8, completed: 4 },
        { name: '최민수', issues: 6, completed: 1 },
    ],
    projectStatus: [
        { name: 'On Track', value: 3, color: '#22c55e' },
        { name: 'At Risk', value: 1, color: '#f59e0b' },
        { name: 'Off Track', value: 1, color: '#ef4444' },
    ]
};

