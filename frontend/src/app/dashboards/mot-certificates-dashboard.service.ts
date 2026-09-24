import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface MotCertificateRow {
  businessUnit: string;
  category: string;
  blAwbNo: string;
  piNo: string;
  approvalDate: string | null;
  expiryDate: string;
  daysRemaining: number;
  urgencyLevel: string;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class MotCertificatesDashboardService {
  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<MotCertificateRow[]>(`${API_URL}/dashboards/mot-certificates`);
  }
}
