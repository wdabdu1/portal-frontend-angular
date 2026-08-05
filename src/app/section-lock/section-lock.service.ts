import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface SectionLockInfo {
  sectionKey: string;
  confirmedByUserId: string;
  confirmedByName: string;
  confirmedAt: string;
}

@Injectable({ providedIn: 'root' })
export class SectionLockService {
  constructor(private http: HttpClient) {}

  getLocks(entityType: string, entityId: number) {
    return this.http.get<SectionLockInfo[]>(`${API_URL}/section-locks/${entityType}/${entityId}`);
  }

  confirm(entityType: string, entityId: number, sectionKey: string) {
    return this.http.post(`${API_URL}/section-locks/confirm`, { entityType, entityId, sectionKey });
  }

  unlock(entityType: string, entityId: number, sectionKey: string) {
    return this.http.post(`${API_URL}/section-locks/unlock`, { entityType, entityId, sectionKey });
  }
}
