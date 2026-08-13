import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface TierBreakdownLine {
  tierLabel: string;
  days: number;
  rate: number;
  cost: number;
}

export interface ClearanceStepGap {
  groupItem: string;
  actualDaysTaken: number | null;
  targetDays: number;
  gap: number | null;
}

export interface DemurrageAnalysisResult {
  isSingleShipment: boolean;
  shipmentCount: number;
  businessUnit: string | null;
  consignee: string | null;
  category: string | null;
  modelProduct: string | null;
  qty: number | null;
  blAwbNo: string | null;
  fcl20Count: number | null;
  fcl40Count: number | null;
  shippingLine: string | null;
  summaryFreeDays: number | null;
  totalCalendarDays: number;
  weekendDays: number;
  holidayDays: number;
  eta: string | null;
  originalDocReceived: string | null;
  stepGaps: ClearanceStepGap[];
  storageFreeDays: number;
  storageChargeableDays: number;
  storageBreakdown: TierBreakdownLine[];
  storageCostSdg: number;
  demurrageFreeDays: number | null;
  demurrageChargeableDays: number | null;
  demurrageBreakdown: TierBreakdownLine[];
  demurrageCostSdg: number;
  totalSdg: number;
  warnings: string[];
}

export interface ShipmentWithHitOption {
  shipmentId: number;
  blAwbNo: string;
}

export interface DemurrageFilters {
  shipmentId?: number;
  etaFrom?: string;
  etaTo?: string;
  businessUnitId?: number;
  consigneeId?: number;
  shippingLineId?: number;
}

@Injectable({ providedIn: 'root' })
export class DemurrageAnalysisService {
  constructor(private http: HttpClient) {}

  private buildParams(filters: DemurrageFilters): string {
    const parts: string[] = [];
    if (filters.shipmentId) parts.push(`shipmentId=${filters.shipmentId}`);
    if (filters.etaFrom) parts.push(`etaFrom=${filters.etaFrom}`);
    if (filters.etaTo) parts.push(`etaTo=${filters.etaTo}`);
    if (filters.businessUnitId) parts.push(`businessUnitId=${filters.businessUnitId}`);
    if (filters.consigneeId) parts.push(`consigneeId=${filters.consigneeId}`);
    if (filters.shippingLineId) parts.push(`shippingLineId=${filters.shippingLineId}`);
    return parts.length > 0 ? '?' + parts.join('&') : '';
  }

  get(filters: DemurrageFilters) {
    return this.http.get<DemurrageAnalysisResult>(`${API_URL}/dashboards/demurrage-analysis${this.buildParams(filters)}`);
  }

  getShipmentsWithHits(filters: DemurrageFilters) {
    return this.http.get<ShipmentWithHitOption[]>(`${API_URL}/dashboards/demurrage-analysis/shipments-with-hits${this.buildParams(filters)}`);
  }
}
