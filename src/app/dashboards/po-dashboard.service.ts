import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface PoDashboardShipmentRow {
  blAwbNo: string;
  category: string;
  modelProduct: string;
  qty: number;
  unitPrice: number;
  currency: string;
  total: number;
  eta: string | null;
  etd: string | null;
  expectedClearanceCompletion: string | null;
}

export interface PoDashboardRow {
  id: number;
  poNumber: string;
  businessUnit: string;
  supplier: string;
  consignee: string;
  status: string;
  createdAt: string;
  orderValueUsd: number;
  shipments: PoDashboardShipmentRow[];
}

@Injectable({ providedIn: 'root' })
export class PoDashboardService {
  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<PoDashboardRow[]>(`${API_URL}/dashboards/purchase-orders`);
  }
}
