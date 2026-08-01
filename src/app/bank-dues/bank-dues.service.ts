import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface BankDueRow {
  shipmentId: number;
  consignee: string;
  receiverBank: string | null;
  blAwbNo: string;
  sob: string | null;
  lastOffshoreInvoiceNo: string | null;
  tenorDays: number | null;
  dueDate: string | null;
  imFormNo: string | null;
  imFormDate: string | null;
  value: number | null;
  currency: string | null;
  valueAed: number;
  paidAed: number;
  balanceAed: number;
}

export interface CollectionRecord {
  id: number;
  paymentDate: string;
  currencyId: number;
  currencyCode: string;
  value: number;
  valueAed: number;
}

@Injectable({ providedIn: 'root' })
export class BankDuesService {
  constructor(private http: HttpClient) {}

  getOpen() {
    return this.http.get<BankDueRow[]>(`${API_URL}/bank-dues`);
  }

  getRecords(shipmentId: number) {
    return this.http.get<CollectionRecord[]>(`${API_URL}/bank-dues/${shipmentId}/records`);
  }

  addRecord(shipmentId: number, req: { paymentDate: string; currencyId: number; value: number }) {
    return this.http.post<CollectionRecord>(`${API_URL}/bank-dues/${shipmentId}/records`, req);
  }

  deleteRecord(shipmentId: number, recordId: number) {
    return this.http.delete(`${API_URL}/bank-dues/${shipmentId}/records/${recordId}`);
  }
}
