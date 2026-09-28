import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface MarineInsuranceRow {
  marineInsurance: boolean;
  businessUnit: string;
  blAwbNo: string;
  supplier: string | null;
  consignee: string;
  category: string;
  modelProduct: string;
  currency: string;
  value: number;
  valueUsd: number;
  etd: string | null;
  actualSob: string | null;
  portOfLoading: string | null;
  portOfDischarge: string | null;
}

@Injectable({ providedIn: 'root' })
export class MarineInsuranceDashboardService {
  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<MarineInsuranceRow[]>(`${API_URL}/dashboards/marine-insurance`);
  }
}
