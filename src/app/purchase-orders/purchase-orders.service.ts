import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface LineItemRequest {
  productCategoryId: number;
  modelProductId: number;
  productTypeId: number;
  qty: number;
  unitOfMeasureId: number;
  unitPrice: number;
  currencyId: number;
}

export interface OffshorePartnerRequest {
  businessPartnerId: number;
  sequenceOrder: number;
}

export interface CreatePurchaseOrderRequest {
  poNumber: string;
  businessUnitId: number;
  divisionId: number;
  supplierId: number;
  brandManufacturerId: number;
  approvalTypeId: number;
  consigneeId: number;
  supplierPiNo?: string;
  supplierPiDate?: string;
  supplierPaymentTermId: number;
  incotermId: number;
  originCountryId: number;
  buShippingBudget?: number;
  shipmentModeId: number;
  offshorePoNo?: string;
  offshorePoDate?: string;
  receivedSignedPiDate?: string;
  sentSignedPiDate?: string;
  buPoDate?: string;
  orderExecutionDate?: string;
  latestShippingDate?: string;
  lineItems: LineItemRequest[];
  offshorePartners: OffshorePartnerRequest[];
}

export interface PurchaseOrderSummary {
  id: number;
  poNumber: string;
  businessUnit: string;
  supplier: string;
  status: string;
  lineItemCount: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class PurchaseOrdersService {
  constructor(private http: HttpClient) {}

  create(req: CreatePurchaseOrderRequest) {
    return this.http.post(`${API_URL}/purchase-orders`, req);
  }

  getAll() {
    return this.http.get<PurchaseOrderSummary[]>(`${API_URL}/purchase-orders`);
  }

  confirm(id: number) {
    return this.http.post(`${API_URL}/purchase-orders/${id}/confirm`, {});
  }
}
