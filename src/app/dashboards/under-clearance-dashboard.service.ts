import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface ClearanceDashboardRow {
  blAwbNo: string;
  clearanceProgressPercent: number;
  businessUnit: string;
  category: string;
  modelProduct: string;
  qty: number;
  fcl20Count: number;
  fcl40Count: number;
  eta: string | null;
  clearanceCompletionDate: string | null;
  daysRemaining: number | null;
  route: string;
  clearanceFrom: string;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class UnderClearanceDashboardService {
  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<ClearanceDashboardRow[]>(`${API_URL}/dashboards/under-clearance`);
  }
}
