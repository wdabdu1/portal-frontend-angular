import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface TpStage {
  purchaseOrderOffshorePartnerId: number;
  companyName: string;
  sequenceOrder: number;
  isLast: boolean;
  markupPercent: number | null;
  currencyId: number | null;
  currencyCode: string | null;
  total: number | null;
  totalUsd: number | null;
}

export interface TpLineItem {
  shipmentLineItemId: number;
  businessUnit: string;
  category: string;
  modelProduct: string;
  blAwbNo: string;
  supplierTotal: number;
  supplierCurrencyCode: string;
  supplierTotalUsd: number;
  supplierCnfUsd: number;
  stages: TpStage[];
}

export interface TpOrderSummary {
  shipmentId: number;
  blAwbNo: string;
  poNumber: string;
  businessUnit: string;
  supplierName: string;
  supplierValueUsd: number;
  createdAt: string;
  routeCompanyNames: string[];
  isConfirmed: boolean;
}

export interface BuStageAccumulated {
  sequenceOrder: number;
  isLast: boolean;
  totalUsd: number;
  markupPercent: number;
}

export interface BuAccumulatedRow {
  businessUnit: string;
  totalSupplierUsd: number;
  stages: BuStageAccumulated[];
}

@Injectable({ providedIn: 'root' })
export class TransferPricingService {
  constructor(private http: HttpClient) {}

  getShipment(shipmentId: number) {
    return this.http.get<TpLineItem[]>(`${API_URL}/transfer-pricing/${shipmentId}`);
  }

  saveLineItem(shipmentLineItemId: number, stages: { purchaseOrderOffshorePartnerId: number; currencyId: number; markupPercent: number | null }[]) {
    return this.http.put(`${API_URL}/transfer-pricing/line-item/${shipmentLineItemId}`, { stages });
  }

  getOrders() {
    return this.http.get<TpOrderSummary[]>(`${API_URL}/transfer-pricing/orders`);
  }

  getAccumulated() {
    return this.http.get<BuAccumulatedRow[]>(`${API_URL}/transfer-pricing/accumulated`);
  }
}
