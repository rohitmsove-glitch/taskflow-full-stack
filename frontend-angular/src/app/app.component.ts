import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from './api.service';
import { Analytics, Task, TaskDraft, TaskPriority, TaskStatus } from './task.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  private readonly api = inject(ApiService);

  tasks: Task[] = [];
  analytics: Analytics | null = null;
  loading = true;
  showForm = false;
  editingId: string | null = null;
  searchTerm = '';
  statusFilter = 'All tasks';
  notice = '';
  errorMessage = '';

  draft: TaskDraft = this.emptyDraft();

  ngOnInit(): void {
    this.refresh();
  }

  get filteredTasks(): Task[] {
    const needle = this.searchTerm.trim().toLowerCase();
    return this.tasks.filter((task) => {
      const matchesSearch = !needle || `${task.title} ${task.description}`.toLowerCase().includes(needle);
      const matchesStatus = this.statusFilter === 'All tasks' || task.status === this.statusFilter;
      return matchesSearch && matchesStatus;
    });
  }

  get highPriorityCount(): number {
    return this.tasks.filter((task) => task.priority === 'High' && task.status !== 'Done').length;
  }

  refresh(): void {
    this.loading = true;
    this.errorMessage = '';
    this.api.getTasks().subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.loading = false;
        this.loadAnalytics();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Could not connect to the API. Start the Node.js server, then refresh this page.';
      }
    });
  }

  loadAnalytics(): void {
    this.api.getAnalytics().subscribe({
      next: (analytics) => this.analytics = analytics,
      error: () => this.analytics = null
    });
  }

  openCreateForm(): void {
    this.editingId = null;
    this.draft = this.emptyDraft();
    this.showForm = true;
    this.notice = '';
  }

  editTask(task: Task): void {
    this.editingId = task.id;
    this.draft = {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : null
    };
    this.showForm = true;
    this.notice = '';
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.draft = this.emptyDraft();
  }

  saveTask(): void {
    this.notice = '';
    this.errorMessage = '';
    const payload: TaskDraft = {
      ...this.draft,
      title: this.draft.title.trim(),
      description: this.draft.description.trim(),
      dueDate: this.draft.dueDate || null
    };
    const request = this.editingId
      ? this.api.updateTask(this.editingId, payload)
      : this.api.createTask(payload);

    request.subscribe({
      next: () => {
        this.notice = this.editingId ? 'Task updated successfully.' : 'New task added to your workspace.';
        this.cancelForm();
        this.refresh();
      },
      error: (error: { error?: { error?: string } }) => {
        this.errorMessage = error?.error?.error || 'The task could not be saved. Please try again.';
      }
    });
  }

  markDone(task: Task): void {
    if (task.status === 'Done') return;
    this.api.updateTask(task.id, {
      title: task.title,
      description: task.description,
      status: 'Done',
      priority: task.priority,
      dueDate: task.dueDate
    }).subscribe({
      next: () => {
        this.notice = 'Nice work — task completed.';
        this.refresh();
      },
      error: () => this.errorMessage = 'Could not update the task status.'
    });
  }

  deleteTask(task: Task): void {
    if (!window.confirm(`Delete “${task.title}”? This cannot be undone.`)) return;
    this.api.deleteTask(task.id).subscribe({
      next: () => {
        this.notice = 'Task deleted.';
        this.refresh();
      },
      error: () => this.errorMessage = 'The task could not be deleted.'
    });
  }

  statusClass(status: TaskStatus): string {
    return `status-${status.toLowerCase().replace(' ', '-')}`;
  }

  priorityClass(priority: TaskPriority): string {
    return `priority-${priority.toLowerCase()}`;
  }

  isOverdue(task: Task): boolean {
    if (!task.dueDate || task.status === 'Done') return false;
    const today = new Date();
    const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return task.dueDate < localToday;
  }

  private emptyDraft(): TaskDraft {
    return {
      title: '',
      description: '',
      status: 'Todo',
      priority: 'Medium',
      dueDate: null
    };
  }
}
