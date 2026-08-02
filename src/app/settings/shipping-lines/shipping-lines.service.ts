import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../../api-config';

export interface TariffRow {
  id?: number;
  tariffGroupId: number;
  tariffGroupName?: string;
  containerSize: '20' | '40';
  freeDays: number;
  firstPeriodDays: number;
  firstPeriodRateSdg: number;
  afterwardRateSdg: number;
}

export interface ShippingLine {
  id: number;
  name: string;
  isActive: boolean;
  tariffs: TariffRow[];
}

@Injectable({ providedIn: 'root' })
export class ShippingLinesService {
  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<ShippingLine[]>(`${API_URL}/settings/shipping-lines`);
  }

  create(name: string, tariffs: TariffRow[]) {
    return this.http.post<ShippingLine>(`${API_URL}/settings/shipping-lines`, { name, tariffs });
  }

  replaceTariffs(id: number, tariffs: TariffRow[]) {
    return this.http.put(`${API_URL}/settings/shipping-lines/${id}/tariffs`, tariffs);
  }
}
