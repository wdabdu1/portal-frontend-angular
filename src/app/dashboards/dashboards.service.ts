import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface ReadinessItem {
  groupItem: string;
  shouldBeDoneBy: string;
  actualDate: string | null;
  status: string;
  light: 'Green' | 'Amber' | 'Red';
}

export interface TrackResult {
  track: string;
  items: ReadinessItem[];
}

export interface ShipmentReadiness {
  shipmentId: number;
  blAwbNo: string;
  businessUnit: string;
  category: string;
  fcl20Count: number;
  fcl40Count: number;
  etd: string | null;
  eta: string | null;
  classification: 'Red' | 'Yellow' | 'Green';
  tracks: TrackResult[];
}

export interface ShipmentHighlight {
  shipmentId: number;
  blAwbNo: string;
  businessUnit: string;
  category: string;
  eta: string | null;
  fcl20Count: number;
  fcl40Count: number;
  currentStepName: string;
  currentStepTargetDate: string | null;
  currentStepStatus: string;
  currentStepLight: 'Green' | 'Amber' | 'Red';
  motSsmoAlertLevel: 'Yellow' | 'Red' | null;
  motSsmoAlertMessage: string | null;
  isCumulativelyLate: boolean;
  daysOverAllowance: number | null;
  currentDemurrageStorageHitSdg: number;
  projectedDemurrageStorageHitSdg: number;
}
@Injectable({ providedIn: 'root' })
export class DashboardsService {
  constructor(private http: HttpClient) {}

  getPreClearanceReadiness() {
    return this.http.get<ShipmentHighlight[]>(`${API_URL}/clearance/pre-clearance-readiness`);
  }
}
