import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface Profile {
  email: string;
  displayName: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  constructor(private http: HttpClient) {}

  get() {
    return this.http.get<Profile>(`${API_URL}/profile`);
  }

  update(displayName: string) {
    return this.http.put(`${API_URL}/profile`, { displayName });
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.http.post(`${API_URL}/profile/change-password`, { currentPassword, newPassword });
  }
}
