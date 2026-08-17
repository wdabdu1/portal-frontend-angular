import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface ProcessStepDetail {
  stepName: string;
  category: 'Internal' | 'Supplier' | 'Bank' | 'Government' | 'Shipping Line';
  forecastStart: string | null;
  forecastEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  executionSpeedDays: number | null;
  completionDateDeltaDays: number | null;
}

export interface CategoryRollup {
  category: string;
  avgExecutionSpeedDays: number;
  avgCompletionDateDeltaDays: number;
  stepInstanceCount: number;
}

export interface ProcessPerformanceResult {
  isSingleShipment: boolean;
  shipmentCount: number;
  blAwbNo: string | null;
  businessUnit: string | null;
  consignee: string | null;
  supplier: string | null;
  sobActualDate: string | null;
  actualArrivalDate: string | null;
  steps: ProcessStepDetail[];
  categoryRollups: CategoryRollup[];
}

export interface ShipmentSearchResult {
  shipmentId: number;
  blAwbNo: string;
  supplier: string;
  consignee: string;
}

export interface ProcessPerformanceFilters {
  shipmentId?: number;
  etaFrom?: string;
  etaTo?: string;
  businessUnitId?: number;
  consigneeId?: number;
  categoryId?: number;
  supplierId?: number;
  shippingLineId?: number;
  senderBankId?: number;
  receiverBankId?: number;
}

@Injectable({ providedIn: 'root' })
export class ProcessPerformanceService {
  constructor(private http: HttpClient) {}

  searchShipments(term: string) {
    return this.http.get<ShipmentSearchResult[]>(`${API_URL}/dashboards/process-performance/search-shipments?term=${encodeURIComponent(term)}`);
  }

  get(filters: ProcessPerformanceFilters) {
    const parts: string[] = [];
    if (filters.shipmentId) parts.push(`shipmentId=${filters.shipmentId}`);
    if (filters.etaFrom) parts.push(`etaFrom=${filters.etaFrom}`);
    if (filters.etaTo) parts.push(`etaTo=${filters.etaTo}`);
    if (filters.businessUnitId) parts.push(`businessUnitId=${filters.businessUnitId}`);
    if (filters.consigneeId) parts.push(`consigneeId=${filters.consigneeId}`);
    if (filters.categoryId) parts.push(`categoryId=${filters.categoryId}`);
    if (filters.supplierId) parts.push(`supplierId=${filters.supplierId}`);
    if (filters.shippingLineId) parts.push(`shippingLineId=${filters.shippingLineId}`);
    if (filters.senderBankId) parts.push(`senderBankId=${filters.senderBankId}`);
    if (filters.receiverBankId) parts.push(`receiverBankId=${filters.receiverBankId}`);
    const query = parts.length > 0 ? '?' + parts.join('&') : '';
    return this.http.get<ProcessPerformanceResult>(`${API_URL}/dashboards/process-performance${query}`);
  }
}
