import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface UserActivityRow {
  id: string;
  username: string;
  displayName: string;
  role: string;
  isActive: boolean;
  lastActivityAt: string | null;
  loginCount: number;
  isLiveNow: boolean;
}

@Injectable({ providedIn: 'root' })
export class UserActivityService {
  constructor(private http: HttpClient) {}

  getActivity() {
    return this.http.get<UserActivityRow[]>(`${API_URL}/users/activity`);
  }
}
