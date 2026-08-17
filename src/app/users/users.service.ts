import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface BuAccessRow {
  businessUnitId: number;
  businessUnitName: string;
  accessLevel: string;
}

export interface UserSummary {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: string;
  isActive: boolean;
  businessUnits: BuAccessRow[];
}

export interface BuAccessInput {
  businessUnitId: number;
  accessLevel: 'Read' | 'ReadWrite';
}

export interface CreateUserRequest {
  username: string;
  email: string;
  displayName: string;
  password: string;
  role: string;
  businessUnitAccess: BuAccessInput[];
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<UserSummary[]>(`${API_URL}/users`);
  }

  create(req: CreateUserRequest) {
    return this.http.post(`${API_URL}/auth/users`, req);
  }

  updateRoles(id: string, role: string, businessUnits: BuAccessInput[]) {
    return this.http.put(`${API_URL}/users/${id}/roles`, { role, businessUnits });
  }

  updateUsername(id: string, username: string) {
    return this.http.put(`${API_URL}/users/${id}/username`, { username });
  }

  deactivate(id: string) {
    return this.http.post(`${API_URL}/users/${id}/deactivate`, {});
  }

  reactivate(id: string) {
    return this.http.post(`${API_URL}/users/${id}/reactivate`, {});
  }
}
