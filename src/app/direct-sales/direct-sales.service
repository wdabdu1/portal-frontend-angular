import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface DirectSalesDueRow {
  shipmentId: number;
  businessUnit: string;
  division: string;
  consignee: string;
  blAwbNo: string;
  category: string;
  dueDate: string;
  dueAmount: number;
  dueCurrency: string;
  dueAmountUsd: number;
  collectedUsd: number;
  remainingUsd: number;
  settled: boolean;
}

@Injectable({ providedIn: 'root' })
export class DirectSalesService {
  constructor(private http: HttpClient) {}

  // Always fetched with every due (settled included) — the Open/Settled/All
  // toggle in the list component filters client-side, so switching views
  // doesn't need a round trip.
  getDues() {
    return this.http.get<DirectSalesDueRow[]>(`${API_URL}/direct-sales`, { params: { includeSettled: 'true' } });
  }
}
