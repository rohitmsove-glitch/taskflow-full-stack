export type TaskStatus = 'Todo' | 'In Progress' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDraft {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
}

export interface Analytics {
  totalTasks: number;
  todo: number;
  inProgress: number;
  done: number;
  openTasks: number;
  completionRate: number;
  priorityBreakdown: { Low: number; Medium: number; High: number };
  source?: string;
}
