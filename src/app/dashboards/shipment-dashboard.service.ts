import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface ShipmentDashboardRow {
  orderCreationDate: string;
  currentStatus: string;
  businessUnit: string;
  blAwbNo: string;
  poNumber: string;
  category: string;
  modelProduct: string;
  qty: number;
  unitPrice: number;
  currency: string;
  total: number;
  paidUsd: number;
  balanceUnpaidUsd: number;
  eta: string | null;
  etd: string | null;
  clearanceCompletionDate: string | null;
  // Only set on the "Draft PO" rows — the still-unshipped portion of a PO
  // line item that has no BL yet (or not a full one).
  remainingQty: number | null;
}

@Injectable({ providedIn: 'root' })
export class ShipmentDashboardService {
  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<ShipmentDashboardRow[]>(`${API_URL}/dashboards/shipments`);
  }
}
