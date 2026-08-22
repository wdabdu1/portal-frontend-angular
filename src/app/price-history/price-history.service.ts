import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface PriceHistoryRow {
  businessUnit: string;
  blAwbNo: string;
  actualArrivalDate: string | null;
  category: string;
  modelProduct: string;
  hsCode: string | null;
  description: string | null;
  costPrice: number | null;
  currency: string | null;
}

@Injectable({ providedIn: 'root' })
export class PriceHistoryService {
  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<PriceHistoryRow[]>(`${API_URL}/price-history`);
  }
}
