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

    exportSettings() {
    return this.http.get(`${API_URL}/data-migration/settings-export`, { responseType: 'blob', observe: 'response' });
  }

  uploadData(file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<UploadSummary>(`${API_URL}/data-migration/data-upload`, form);
  }

  exportData() {
    return this.http.get(`${API_URL}/data-migration/data-export`, { responseType: 'blob', observe: 'response' });
  }

  completeDelete(confirmationPhrase: string) {
    return this.http.post<{ message: string; tables: string[] }>(`${API_URL}/data-migration/complete-delete`, { confirmationPhrase });
  }
}
