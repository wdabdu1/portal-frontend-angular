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
  invoiceValue: number;
  invoiceCurrency: string;
  totalValueUsd: number;
  totalUnpaidUsd: number;
}

export interface SupplierInvoiceSummary {
  supplierInvoiceNo: string | null;
  invoiceValue: number;
  invoiceCurrency: string;
  invoiceValueUsd: number;
  totalPaidUsd: number;
  balanceUsd: number;
}

export interface PaymentRecord {
  id: number;
  paymentDate: string;
  currencyId: number;
  currencyCode: string;
  value: number;
  valueUsd: number;
  paymentDueId: number | null;
}

export interface PaymentDue {
  id: number;
  dueDate: string;
  amount: number;
  currencyId: number;
  currencyCode: string;
  label: string | null;
  paidUsd: number;
  amountUsd: number;
}

@Injectable({ providedIn: 'root' })
export class SupplierDuesService {
  constructor(private http: HttpClient) {}

  getOpen() {
    return this.http.get<SupplierDueRow[]>(`${API_URL}/supplier-dues`);
  }

  getInvoiceSummary(shipmentId: number) {
    return this.http.get<SupplierInvoiceSummary>(`${API_URL}/shipments/${shipmentId}/supplier-invoice-summary`);
  }

  getPaymentRecords(shipmentId: number) {
    return this.http.get<PaymentRecord[]>(`${API_URL}/shipments/${shipmentId}/supplier-payment/records`);
  }

  addPaymentRecord(shipmentId: number, req: { paymentDate: string; currencyId: number; value: number; paymentDueId: number | null }) {
    return this.http.post<PaymentRecord>(`${API_URL}/shipments/${shipmentId}/supplier-payment/records`, req);
  }

  deletePaymentRecord(shipmentId: number, recordId: number) {
    return this.http.delete(`${API_URL}/shipments/${shipmentId}/supplier-payment/records/${recordId}`);
  }

  getPaymentDues(shipmentId: number) {
    return this.http.get<PaymentDue[]>(`${API_URL}/shipments/${shipmentId}/supplier-payment/dues`);
  }
}
