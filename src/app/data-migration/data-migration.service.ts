import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface SheetUploadResult {
  sheet: string;
  created: number;
  updated: number;
  errors: string[];
}

export interface UploadSummary {
  results: SheetUploadResult[];
}

@Injectable({ providedIn: 'root' })
export class DataMigrationService {
  constructor(private http: HttpClient) {}

  uploadSettings(file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<UploadSummary>(`${API_URL}/data-migration/settings-upload`, form);
  }
}
