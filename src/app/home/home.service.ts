import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface HomePoRow {
  businessUnit: string;
  poNumber: string;
  supplier: string;
  targetDate: string;
}

export interface HomeShipmentRow {
  businessUnit: string;
  consignee: string;
  category: string;
  blAwbNo: string;
  extra1: string;
  targetDate: string;
  isActual: boolean;
}

export interface HomeTruckRow {
  businessUnit: string;
  consignee: string;
  category: string;
  truckNo: string;
  extra1: string;
  targetDate: string;
  isActual: boolean;
}

export interface HomePageResponse {
  showPos: boolean;
  recentPos: HomePoRow[];
  showShipments: boolean;
  recentShipments: HomeShipmentRow[];
  showArrivals: boolean;
  arrivedArrivingShipments: HomeShipmentRow[];
  showClearance: boolean;
  clearedAboutToClear: HomeShipmentRow[];
  showFz: boolean;
  recentlyDeposited: HomeShipmentRow[];
  withdrawnAboutToWithdraw: HomeShipmentRow[];
  showTrucks: boolean;
  allocatedTrucks: HomeTruckRow[];
  arrivedArrivingTrucks: HomeTruckRow[];
  redAlertCount: number;
}

@Injectable({ providedIn: 'root' })
export class HomePageService {
  constructor(private http: HttpClient) {}

  get() {
    return this.http.get<HomePageResponse>(`${API_URL}/dashboards/home`);
  }
}
