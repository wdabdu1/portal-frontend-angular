import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface TruckAvailabilityRow {
  truckId: number;
  plateNo: string;
  driverName: string | null;
  isAvailable: boolean;
  cityName: string | null;
  expectedAvailableDate: string | null;
  // The drop currently in progress for this truck (null once available) —
  // lets the UI update that drop's dates directly from this row without a
  // separate lookup.
  activeDropId: number | null;
}

export interface TruckMovementRow {
  id: number;
  moveDate: string;
  fromCity: string;
  toCity: string;
  reason: string | null;
  value: number | null;
  notes: string | null;
}

@Injectable({ providedIn: 'root' })
export class TruckAvailabilityService {
  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<TruckAvailabilityRow[]>(`${API_URL}/truck-availability`);
  }

  move(truckId: number, req: { toCityId: number; moveDate: string; reason: string | null; value: number | null; notes: string | null }) {
    return this.http.post(`${API_URL}/truck-availability/${truckId}/move`, req);
  }

  setStartingCity(truckId: number, cityId: number) {
    return this.http.post(`${API_URL}/truck-availability/${truckId}/set-starting-city`, cityId);
  }

  getMovements(truckId: number) {
    return this.http.get<TruckMovementRow[]>(`${API_URL}/truck-availability/${truckId}/movements`);
  }
}
