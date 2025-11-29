
export enum Status {
  BACKLOG = 'Backlog',
  TODO = 'Todo',
  IN_PROGRESS = 'In Progress',
  IN_REVIEW = 'In Review',
  DONE = 'Done',
  CANCELED = 'Canceled'
}

export enum Priority {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
  NONE = 'None'
}

export enum Health {
  ON_TRACK = 'On track',
  AT_RISK = 'At risk',
  OFF_TRACK = 'Off track'
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
}

export interface Project {
  id: string;
  name: string;
  description: string;
  health: Health;
  lead: User;
  targetDate: string;
  statusPercent: number;
  priority: Priority;
  updatedAt: string;
}

export interface Issue {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  assignee?: User;
  dueDate?: string;
  createdAt: string;
  labels: string[];
  subtasks: { id: string; title: string; done: boolean }[];
  commentsCount: number;
}

