import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface LookupEntity {
  id: number;
  isActive?: boolean;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class SettingsLookupService {
  constructor(private http: HttpClient) {}

  getAll<T extends LookupEntity>(resource: string) {
    return this.http.get<T[]>(`${API_URL}/settings/${resource}`);
  }

  create<T extends LookupEntity>(resource: string, entity: Partial<T>) {
    return this.http.post<T>(`${API_URL}/settings/${resource}`, entity);
  }

  update<T extends LookupEntity>(resource: string, id: number, entity: Partial<T>) {
    return this.http.put(`${API_URL}/settings/${resource}/${id}`, entity);
  }

  delete(resource: string, id: number) {
    return this.http.delete(`${API_URL}/settings/${resource}/${id}`);
  }
}
