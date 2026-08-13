import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface SupplierDelayLine {
  purchaseOrderId: number;
  poNumber: string;
  businessUnit: string;
  supplier: string;
  category: string;
  modelProduct: string;
  orderedQty: number;
  dispatchedQty: number;
  pendingQty: number;
  latestShippingDate: string | null;
  daysRemaining: number | null;
  urgencyLevel: 'Light' | 'Amber' | 'Red';
}

@Injectable({ providedIn: 'root' })
export class SupplierDelayService {
  constructor(private http: HttpClient) {}

  get(businessUnitId?: number, supplierId?: number) {
    const parts: string[] = [];
    if (businessUnitId) parts.push(`businessUnitId=${businessUnitId}`);
    if (supplierId) parts.push(`supplierId=${supplierId}`);
    const params = parts.length > 0 ? '?' + parts.join('&') : '';
    return this.http.get<SupplierDelayLine[]>(`${API_URL}/dashboards/supplier-delay${params}`);
  }
}
