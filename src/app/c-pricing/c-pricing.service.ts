import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface CPricingItemRow {
  shipmentLineItemId: number;
  businessUnitId: number;
  businessUnit: string;
  blAwbNo: string;
  category: string;
  modelProduct: string;
  eta: string | null;
  cPricingCategoryId: number | null;
  cPricingCategoryName: string | null;
  cPricingTypeId: number | null;
  cPricingTypeName: string | null;
  hsCode: string | null;
  description: string | null;
  currencyId: number | null;
  currencyCode: string | null;
  cp: number | null;
  isConfirmed: boolean;
}

export interface SaveCPricingItemRequest {
  cPricingCategoryId: number | null;
  cPricingTypeId: number | null;
  hsCode: string | null;
  description: string | null;
  currencyId: number | null;
  cp: number | null;
}

export interface CPricingCategory {
  id: number;
  name: string;
  isActive: boolean;
}

export interface CPricingType {
  id: number;
  name: string;
  cPricingCategoryId: number;
  isActive: boolean;
}

export interface CPricingHistoryRow {
  businessUnit: string;
  blAwbNo: string;
  actualArrivalDate: string | null;
  category: string;
  modelProduct: string;
  cPricingCategory: string | null;
  cPricingType: string | null;
  hsCode: string | null;
  description: string | null;
  costPrice: number | null;
  currency: string | null;
}

@Injectable({ providedIn: 'root' })
export class CPricingService {
  constructor(private http: HttpClient) {}

  getItems() {
    return this.http.get<CPricingItemRow[]>(`${API_URL}/c-pricing/items`);
  }

  saveItem(shipmentLineItemId: number, req: SaveCPricingItemRequest) {
    return this.http.put(`${API_URL}/c-pricing/items/${shipmentLineItemId}`, req);
  }

  getHistory() {
    return this.http.get<CPricingHistoryRow[]>(`${API_URL}/c-pricing/history`);
  }

  getCategories() {
    return this.http.get<CPricingCategory[]>(`${API_URL}/c-pricing/categories`);
  }

  createCategory(name: string) {
    return this.http.post<CPricingCategory>(`${API_URL}/c-pricing/categories`, { name, isActive: true });
  }

  updateCategory(id: number, name: string, isActive: boolean) {
    return this.http.put(`${API_URL}/c-pricing/categories/${id}`, { name, isActive });
  }

  deleteCategory(id: number) {
    return this.http.delete(`${API_URL}/c-pricing/categories/${id}`);
  }

  getTypes(categoryId?: number) {
    const suffix = categoryId ? `?categoryId=${categoryId}` : '';
    return this.http.get<CPricingType[]>(`${API_URL}/c-pricing/types${suffix}`);
  }

  createType(name: string, cPricingCategoryId: number) {
    return this.http.post<CPricingType>(`${API_URL}/c-pricing/types`, { name, cPricingCategoryId, isActive: true });
  }

  updateType(id: number, name: string, cPricingCategoryId: number, isActive: boolean) {
    return this.http.put(`${API_URL}/c-pricing/types/${id}`, { name, cPricingCategoryId, isActive });
  }

  deleteType(id: number) {
    return this.http.delete(`${API_URL}/c-pricing/types/${id}`);
  }
}
