import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface ShipmentLineItemRequest {
  purchaseOrderLineItemId: number;
  qtyInBl: number;
}

export interface CreateShipmentRequest {
  blAwbNo: string;
  blAwbDate?: string;
  etd?: string;
  eta?: string;
  shippingLineId: number;
  vesselName?: string | null;
  fcl20Count: number;
  fcl40Count: number;
  soc: boolean;
  blFreeDays?: number;
  isDirectSales: boolean;
  consigneeName?: string | null;
  lineItems: ShipmentLineItemRequest[];
}

export interface ShipmentSummary {
  id: number;
  blAwbNo: string;
  poNumber: string;
  businessUnit: string;
  shippingLine: string;
  status: string;
  eta: string | null;
  lineItemCount: number;
  createdAt: string;
  isClearanceCompleted: boolean;
}

// Raw ids included so the New Shipment page can work out client-side
// which other confirmed orders could be combined with a given one into
// one shipment (same Supplier + Business Unit + Division) — the actual
// rule is enforced server-side on create.
export interface ConfirmedOrderOption {
  id: number;
  poNumber: string;
  businessUnit: string;
  supplier: string;
  orderValueUsd: number;
  businessUnitId: number;
  supplierId: number;
  divisionId: number;
}

export interface LineItemRemaining {
  id: number;
  productCategory: string;
  modelProduct: string;
  productType: string;
  qty: number;
  qtyShipped: number;
  qtyRemaining: number;
  unitOfMeasure: string;
  unitPrice: number;
  currency: string;
}

@Injectable({ providedIn: 'root' })
export class ShipmentsService {
  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<ShipmentSummary[]>(`${API_URL}/shipments`);
  }

  create(req: CreateShipmentRequest) {
    return this.http.post(`${API_URL}/shipments`, req);
  }

  getConfirmedOrders() {
    return this.http.get<ConfirmedOrderOption[]>(`${API_URL}/purchase-orders/confirmed`);
  }

  getLineItemsRemaining(purchaseOrderId: number) {
    return this.http.get<LineItemRemaining[]>(`${API_URL}/purchase-orders/${purchaseOrderId}/line-items-remaining`);
  }
}
