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
  targetDays: number | null;
  gap: number | null;
  category: string;
  // Single-shipment mode only — the matching Clearance accordion group's
  // Comments field. Always null in group mode (free text isn't averaged).
  comment: string | null;
}

export interface CategoryGapRollup {
  category: string;
  totalActualDays: number;
  totalTargetDays: number;
  totalGapDays: number;
}

export interface ClockSizeLine { label: string; containerCount: number; freeDays: number; chargeableDays: number; }
export interface ChargeClock {
  name: string; startDate: string | null; endDate: string | null; endIsActual: boolean; endLabel: string;
  elapsedDays: number; freeEndsOn: string | null; lines: ClockSizeLine[]; costSdg: number;
}
export interface AttributionRow {
  step: string; from: string; to: string; calendarDays: number; cumulativeDays: number;
  freeDaysUsed: number; chargeableDays: number; note: string | null;
}
export interface ClockAttribution { clock: string; freeDays: number; totalChargeableDays: number; rows: AttributionRow[]; }
export interface DemurrageTimeline {
  arrivalDate: string | null; arrivalIsActual: boolean; clearanceCompletedDate: string | null;
  truckPortEntryDate: string | null; containersReturnedDate: string | null;
  demurrage: ChargeClock; storage: ChargeClock; attribution: ClockAttribution[]; dataGaps: string[];
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
  vesselArrivalOffsetDays: number | null;
  stepGaps: ClearanceStepGap[];
  documentChainSteps: ClearanceStepGap[];
  categoryRollups: CategoryGapRollup[];
  storageFreeDays: number;
  storageChargeableDays: number;
  storageBreakdown: TierBreakdownLine[];
  storageCostSdg: number;
  demurrageFreeDays: number | null;
  demurrageChargeableDays: number | null;
  demurrageBreakdown: TierBreakdownLine[];
  demurrageCostSdg: number;
  totalSdg: number;
  forecastDemurrageSdg: number | null;
  forecastStorageSdg: number | null;
  forecastTotalSdg: number | null;
  actualDemurragePaidSdg: number | null;
  actualStoragePaidSdg: number | null;
  actualTotalPaidSdg: number | null;
  savingsSdg: number | null;
  warnings: string[];
  // Single shipment, Route 1 only: the Logistics-owned wait after clearance (SPC Bill settlement ->
  // whole shipment on trucks) and its logged delay reasons. NOT part of the stepGaps reconciliation.
  timeline?: DemurrageTimeline | null;
  logisticsSteps?: ClearanceStepGap[] | null;
  logisticsDelays?: {
    id: number; reason: string; fromDate: string; toDate: string | null; days: number; ongoing: boolean; note: string | null; createdBy: string;
  }[] | null;
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

export interface ForecastRecalcRow {
  blAwbNo: string; oldDemurrageSdg: number | null; newDemurrageSdg: number | null; oldStorageSdg: number | null; newStorageSdg: number | null;
}
export interface ForecastRecalcResult {
  updated: number; unchanged: number; skippedLocked: number; notApplicable: number; changes: ForecastRecalcRow[];
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

  // Manager / SuperUser: re-compute the SLA-plan forecast of every shipment that already has one.
  recalculateAllForecasts() {
    return this.http.post<ForecastRecalcResult>(`${API_URL}/clearance/recalculate-all-forecasts`, {});
  }
}
