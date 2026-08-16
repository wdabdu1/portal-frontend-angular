import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface DemurrageHitDetail {
  blAwbNo: string;
  businessUnit: string;
  demurrageStorageUsd: number;
  shipmentValueUsd: number;
  magnitudePercent: number;
}

export interface FreeZoneBreakdown {
  freeZoneName: string;
  depositCount: number;
  withdrawalCount: number;
  daysOfInventory: number | null;
}

export interface DepartmentPerformanceResponse {
  orderCount: number;
  orderValueUsd: number;
  executionPercent: number;
  draftCount: number;
  inTransitCount: number;
  underClearanceCount: number;
  deliveredCount: number;
  draftValueUsd: number;
  inTransitValueUsd: number;
  underClearanceValueUsd: number;
  deliveredValueUsd: number;
  depositCount: number;
  withdrawalCount: number;
  freeZoneBreakdowns: FreeZoneBreakdown[];
  shipmentsHitCount: number;
  totalDemurrageStorageUsd: number;
  totalShipmentValueUsd: number;
  overallMagnitudePercent: number;
  hitDetails: DemurrageHitDetail[];
}

export interface DepartmentPerformanceFilters {
  etaFrom?: string;
  etaTo?: string;
  businessUnitId?: number;
  consigneeId?: number;
  shippingLineId?: number;
}

@Injectable({ providedIn: 'root' })
export class DepartmentPerformanceService {
  constructor(private http: HttpClient) {}

  get(filters: DepartmentPerformanceFilters) {
    let params = '';
    const parts: string[] = [];
    if (filters.etaFrom) parts.push(`etaFrom=${filters.etaFrom}`);
    if (filters.etaTo) parts.push(`etaTo=${filters.etaTo}`);
    if (filters.businessUnitId) parts.push(`businessUnitId=${filters.businessUnitId}`);
    if (filters.consigneeId) parts.push(`consigneeId=${filters.consigneeId}`);
    if (filters.shippingLineId) parts.push(`shippingLineId=${filters.shippingLineId}`);
    if (parts.length > 0) params = '?' + parts.join('&');

    return this.http.get<DepartmentPerformanceResponse>(`${API_URL}/dashboards/department-performance${params}`);
  }
}
