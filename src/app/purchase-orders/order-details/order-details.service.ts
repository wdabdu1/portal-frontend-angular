import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../../api-config';

export interface PoLineItemDetail {
  productCategory: string;
  productType: string;
  modelProduct: string;
  qty: number;
  unitOfMeasure: string;
  unitPrice: number | null;
  currency: string | null;
  totalValue: number | null;
}

export interface PoOffshorePartnerDetail {
  sequenceOrder: number;
  name: string;
  isLast: boolean;
}

export interface PurchaseOrderDetail {
  id: number;
  poNumber: string;
  status: string;
  createdAt: string;
  businessUnit: string;
  division: string | null;
  supplier: string | null;
  brandManufacturer: string;
  consignee: string;
  incoterm: string;
  paymentTerm: string;
  approvalType: string;
  totalOrderValueUsd: number | null;
  lineItems: PoLineItemDetail[];
  offshorePartners: PoOffshorePartnerDetail[];
  advancePaymentPercent: number | null;
  advancePaymentPlannedDate: string | null;
  advancePaymentExecutedDate: string | null;
}

@Injectable({ providedIn: 'root' })
export class OrderDetailsService {
  constructor(private http: HttpClient) {}

  get(id: number) {
    return this.http.get<PurchaseOrderDetail>(`${API_URL}/orders/${id}/details`);
  }

  saveAdvancePayment(id: number, req: { advancePaymentPercent: number | null; advancePaymentPlannedDate: string | null; advancePaymentExecutedDate: string | null }) {
    return this.http.put(`${API_URL}/purchase-orders/${id}/advance-payment`, req);
  }
}
