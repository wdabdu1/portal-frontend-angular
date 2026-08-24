import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface TruckAvailabilityRow {
  truckId: number;
  plateNo: string;
  driverName: string | null;
  status: 'Available' | 'InTransit' | 'Unplaced';
  currentCityId: number | null;
  currentCityName: string | null;
  inTransitToCityId: number | null;
  inTransitToCityName: string | null;
  expectedArrivalDate: string | null;
}

export interface TruckMovementRow {
  id: number;
  plateNo: string;
  fromCityName: string | null;
  toCityName: string;
  moveDate: string;
  reason: string | null;
  value: number | null;
  notes: string | null;
  confirmedByName: string;
  createdAt: string;
}

export interface MoveTruckRequest {
  truckId: number;
  toCityId: number;
  moveDate: string;
  reason?: string;
  value?: number;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class TruckAvailabilityService {
  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<TruckAvailabilityRow[]>(`${API_URL}/truck-availability`);
  }

  getMovements() {
    return this.http.get<TruckMovementRow[]>(`${API_URL}/truck-availability/movements`);
  }

  moveTruck(req: MoveTruckRequest) {
    return this.http.post(`${API_URL}/truck-availability/move`, req);
  }
}
