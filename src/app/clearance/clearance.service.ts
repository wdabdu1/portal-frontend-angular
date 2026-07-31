import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface ClearanceShipmentSummary {
  shipmentId: number;
  blAwbNo: string;
  businessUnit: string;
  category: string;
  eta: string | null;
  fclCount: number;
  declarationNo: string | null;
  product: string;
  qty: number;
  trafficLight: 'Green' | 'Amber' | 'Red' | 'Grey';
  routeStatus: string;
}

export interface ClearanceDetail {
  shipmentId: number;
  blAwbNo: string;
  poNumber: string;
  copyOfBlReceivedDate: string | null;
  originalShipmentSetReceivedDate: string | null;
  lcNo: string | null;
  declarationNo: string | null;
  notes: string | null;
  route: number;
  clearanceCompleteDate: string | null;
}

@Injectable({ providedIn: 'root' })
export class ClearanceService {
  constructor(private http: HttpClient) {}

  getShipmentsForClearance(search?: string) {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.http.get<ClearanceShipmentSummary[]>(`${API_URL}/clearance/shipments${query}`);
  }

  getDetail(shipmentId: number) {
    return this.http.get<ClearanceDetail>(`${API_URL}/clearance/${shipmentId}/detail`);
  }

  saveGeneralInfo(shipmentId: number, req: Partial<ClearanceDetail>) {
    return this.http.put(`${API_URL}/clearance/${shipmentId}/general-info`, req);
  }

  setRoute(shipmentId: number, route: number) {
    return this.http.put(`${API_URL}/clearance/${shipmentId}/route`, { route });
  }
}
