import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface DelayEntry {
  id: number;
  shipmentId: number;
  withdrawalId: number | null;
  reasonId: number;
  reason: string;
  fromDate: string;
  toDate: string | null;
  days: number;
  ongoing: boolean;
  note: string | null;
  createdBy: string;
  createdAt: string;
}

export interface DelayReasonOption { id: number; name: string; }

export interface SaveDelayRequest {
  shipmentId: number;
  withdrawalId: number | null;
  reasonId: number;
  fromDate: string;
  toDate: string | null;
  note: string | null;
}

export interface DelayReasonTotal { reasonId: number; reason: string; entries: number; shipments: number; days: number; }
export interface DelaySummaryEntry {
  id: number; shipmentId: number; blAwbNo: string; businessUnit: string; consignee: string; reason: string;
  fromDate: string; toDate: string | null; days: number; ongoing: boolean; note: string | null; createdBy: string;
}
export interface DispatchRow {
  shipmentId: number; blAwbNo: string; businessUnit: string; consignee: string;
  releaseDate: string; firstLoadDate: string | null; fullyDispatchedDate: string | null;
  days: number; dispatched: boolean; targetDays: number; gap: number; loggedDays: number; unexplainedDays: number;
  totalQty: number; loadedQty: number;
  withdrawalId?: number | null; withdrawalRef?: string | null;
}
export interface CityDeliveryPerformance { city: string; targetDays: number | null; drops: number; avgDays: number; onTime: number; late: number; }
export interface DelaySummary {
  dispatchTargetDays: number;
  reasons: DelayReasonTotal[];
  entries: DelaySummaryEntry[];
  dispatch: DispatchRow[];
  delivery: CityDeliveryPerformance[];
}

@Injectable({ providedIn: 'root' })
export class DelayLogService {
  constructor(private http: HttpClient) {}

  list(shipmentId: number) {
    return this.http.get<DelayEntry[]>(`${API_URL}/logistics/delays?shipmentId=${shipmentId}`);
  }
  reasons() {
    return this.http.get<DelayReasonOption[]>(`${API_URL}/logistics/delays/reasons`);
  }
  create(req: SaveDelayRequest) {
    return this.http.post<DelayEntry>(`${API_URL}/logistics/delays`, req);
  }
  update(id: number, req: SaveDelayRequest) {
    return this.http.put<DelayEntry>(`${API_URL}/logistics/delays/${id}`, req);
  }
  remove(id: number) {
    return this.http.delete(`${API_URL}/logistics/delays/${id}`);
  }
  summary(from?: string, to?: string) {
    const params: string[] = [];
    if (from) params.push(`from=${from}`);
    if (to) params.push(`to=${to}`);
    return this.http.get<DelaySummary>(`${API_URL}/logistics/delays/summary${params.length ? '?' + params.join('&') : ''}`);
  }
}
