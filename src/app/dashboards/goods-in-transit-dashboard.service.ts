import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface GoodsInTransitRow {
  businessUnit: string;
  category: string;
  modelProduct: string;
  qty: number;
  pickFrom: string;
  pickupDate: string;
  dropOffCity: string;
  dropOffWarehouse: string;
  dropOffTargetDate: string | null;
  dropOffActualDate: string | null;
  truckNo: string;
  driverName: string;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class GoodsInTransitDashboardService {
  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<GoodsInTransitRow[]>(`${API_URL}/dashboards/goods-in-transit`);
  }
}
