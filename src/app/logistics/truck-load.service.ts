import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface TruckLoadSummary {
  id: number;
  plateNo: string;
  driverName: string | null;
  loadDate: string;
  dropCount: number;
  itemCount: number;
}

export interface TruckLoadItemSummary {
  id: number;
  warehouseAllocationId: number;
  modelProduct: string;
  unit: string;
  qty: number;
  inHousePrice: number | null;
  parallelMarketPrice: number | null;
}

export interface TruckLoadDropDetail {
  id: number;
  warehouseId: number;
  warehouseName: string;
  city: string | null;
  expectedDeliveryDate: string | null;
  actualDropOffDate: string | null;
  items: TruckLoadItemSummary[];
}

export interface TruckLoadItemRow {
  truckLoadItemId: number;
  truckLoadId: number;
  plateNo: string;
  driverName: string | null;
  loadDate: string;
  warehouseName: string;
  city: string | null;
  expectedDeliveryDate: string | null;
  actualDropOffDate: string | null;
  modelProduct: string;
  unit: string;
  qty: number;
  inHousePrice: number | null;
  parallelMarketPrice: number | null;
  isCompleted: boolean;
}

export interface TruckLoadDetail {
  id: number;
  truckId: number;
  plateNo: string;
  driverId: number | null;
  driverName: string | null;
  loadDate: string;
  notes: string | null;
  drops: TruckLoadDropDetail[];
}

export interface LoadableAllocation {
  warehouseAllocationId: number;
  modelProduct: string;
  unit: string;
  blAwbNo: string;
  remainingToLoad: number;
}

export interface ReadyForTruckAssignment {
  warehouseAllocationId: number;
  businessUnit: string;
  modelProduct: string;
  unit: string;
  blAwbNo: string;
  warehouseName: string;
  allocatedQty: number;
  loadedQty: number;
  remainingQty: number;
  allocatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class TruckLoadService {
  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<TruckLoadSummary[]>(`${API_URL}/truck-loads`);
  }

  create(req: { truckId: number; driverId: number | null; loadDate: string; notes: string | null }) {
    return this.http.post<TruckLoadSummary>(`${API_URL}/truck-loads`, req);
  }

  getDetail(id: number) {
    return this.http.get<TruckLoadDetail>(`${API_URL}/truck-loads/${id}`);
  }

  addDrop(truckLoadId: number, warehouseId: number, expectedDeliveryDate: string | null) {
    return this.http.post<{ id: number }>(`${API_URL}/truck-loads/${truckLoadId}/drops`, { warehouseId, expectedDeliveryDate });
  }

  setActualDropOff(dropId: number, actualDropOffDate: string | null) {
    return this.http.put(`${API_URL}/truck-loads/drops/${dropId}/actual-dropoff`, { actualDropOffDate });
  }

  getItems() {
    return this.http.get<TruckLoadItemRow[]>(`${API_URL}/truck-loads/items`);
  }

  getReadyForAssignment() {
    return this.http.get<ReadyForTruckAssignment[]>(`${API_URL}/truck-loads/ready-for-assignment`);
  }

  deleteDrop(dropId: number) {
    return this.http.delete(`${API_URL}/truck-loads/drops/${dropId}`);
  }

  getLoadableAllocations(dropId: number) {
    return this.http.get<LoadableAllocation[]>(`${API_URL}/truck-loads/drops/${dropId}/loadable-allocations`);
  }

  addItem(dropId: number, req: { warehouseAllocationId: number; qty: number; inHousePrice: number | null; parallelMarketPrice: number | null }) {
    return this.http.post<{ id: number }>(`${API_URL}/truck-loads/drops/${dropId}/items`, req);
  }

  deleteItem(itemId: number) {
    return this.http.delete(`${API_URL}/truck-loads/items/${itemId}`);
  }
}
