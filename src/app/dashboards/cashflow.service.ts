import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface CustomsClearancePaymentRow {
  id: number;
  businessUnit: string;
  chargeType: string;
  valueSdg: number;
  dueDate: string | null;
  blAwbNo: string;
  isPaid: boolean;
  paidDate: string | null;
}

export interface SupplierPaymentRow {
  businessUnit: string;
  supplierName: string;
  blAwbNo: string;
  dueDate: string;
  label: string;
  amountUsd: number;
}

@Injectable({ providedIn: 'root' })
export class CashflowService {
  constructor(private http: HttpClient) {}

  getCustomsClearancePayments(status: 'Paid' | 'Unpaid' | 'All' = 'Unpaid') {
    return this.http.get<CustomsClearancePaymentRow[]>(`${API_URL}/dashboards/customs-clearance-payments?status=${status}`);
  }

  markCustomsClearancePaymentsPaid(lineItemIds: number[]) {
    return this.http.post(`${API_URL}/dashboards/customs-clearance-payments/mark-paid`, { lineItemIds });
  }

  getSupplierPayments() {
    return this.http.get<SupplierPaymentRow[]>(`${API_URL}/dashboards/supplier-payments`);
  }
}
