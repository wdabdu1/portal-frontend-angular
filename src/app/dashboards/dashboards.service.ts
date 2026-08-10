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
  eta: string | null;
  tracks: TrackResult[];
}

@Injectable({ providedIn: 'root' })
export class DashboardsService {
  constructor(private http: HttpClient) {}

  getPreClearanceReadiness() {
    return this.http.get<ShipmentReadiness[]>(`${API_URL}/clearance/pre-clearance-readiness`);
  }
}
