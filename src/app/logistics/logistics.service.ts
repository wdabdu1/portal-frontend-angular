import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface LogisticsItemRow {
  sourceType: 'Port' | 'FZWithdrawal';
  sourceLineItemId: number;
  businessUnit: string;
  consignee: string;
  category: string;
  modelProduct: string;
  blAwbNo: string;
  plannedCompletionDate: string | null;
  actualCompletionDate: string | null;
  qty: number;
  unit: string;
  clearanceRoute: string;
  fzDestination: string | null;
  allocatedQty: number;
  remainingQty: number;
}

export interface AllocationResponse {
  id: number;
  warehouseId: number;
  warehouseName: string;
  qty: number;
  contactName: string | null;
  contactPhone: string | null;
  deliveryCity: string | null;
}

@Injectable({ providedIn: 'root' })
export class LogisticsService {
  constructor(private http: HttpClient) {}

  getItems() {
    return this.http.get<LogisticsItemRow[]>(`${API_URL}/logistics/items`);
  }

  getAllocations(sourceType: string, sourceLineItemId: number) {
    return this.http.get<AllocationResponse[]>(`${API_URL}/logistics/allocations?sourceType=${sourceType}&sourceLineItemId=${sourceLineItemId}`);
  }

  allocate(req: { sourceType: string; sourceLineItemId: number; warehouseId: number; qty: number; contactName: string | null; contactPhone: string | null }) {
    return this.http.post<{ id: number }>(`${API_URL}/logistics/allocate`, req);
  }

  deleteAllocation(id: number) {
    return this.http.delete(`${API_URL}/logistics/allocations/${id}`);
  }
}
