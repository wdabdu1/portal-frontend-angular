import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface SupplierDueRow {
  shipmentId: number;
  businessUnit: string;
  supplierName: string;
  poNumber: string;
  supplierInvoiceNo: string | null;
  blAwbNo: string;
  sob: string | null;
  paymentTerm: string;
  invoiceValue: number | null;
  invoiceCurrency: string | null;
  unpaidBalance: number;
  totalValueUsd: number;
  totalUnpaidUsd: number;
}

@Injectable({ providedIn: 'root' })
export class SupplierDuesService {
  constructor(private http: HttpClient) {}

  getOpen() {
    return this.http.get<SupplierDueRow[]>(`${API_URL}/supplier-dues`);
  }
}
