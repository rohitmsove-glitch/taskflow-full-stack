import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Analytics, Task, TaskDraft } from './task.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  getTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.baseUrl}/tasks`);
  }

  createTask(task: TaskDraft): Observable<Task> {
    return this.http.post<Task>(`${this.baseUrl}/tasks`, task);
  }

  updateTask(id: string, task: TaskDraft): Observable<Task> {
    return this.http.put<Task>(`${this.baseUrl}/tasks/${encodeURIComponent(id)}`, task);
  }

  deleteTask(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/tasks/${encodeURIComponent(id)}`);
  }

  getAnalytics(): Observable<Analytics> {
    return this.http.get<Analytics>(`${this.baseUrl}/analytics`);
  }
}
