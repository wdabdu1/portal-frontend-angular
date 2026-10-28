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
  portOfLoading: string | null;
  portOfDischarge: string | null;
  paymentTerm: string;
  approvalType: string;
  totalOrderValueUsd: number | null;
  lineItems: PoLineItemDetail[];
  offshorePartners: PoOffshorePartnerDetail[];
  // Legacy single-advance fields — superseded by PO payments (see PoPaymentsSummary).
  advancePaymentPercent?: number | null;
  advancePaymentPlannedDate?: string | null;
  advancePaymentExecutedDate?: string | null;
}

export interface PoPaymentItem {
  id: number;
  description: string;
  amount: number;
  currencyId: number;
  currencyCode: string;
  amountUsd: number;
  percent: number;
  plannedDate: string | null;
  executedDate: string | null;
  note: string | null;
}

export interface PoPaymentsSummary {
  defaultCurrencyId: number;
  defaultCurrencyCode: string;
  isMixedCurrency: boolean;
  poTotalNative: number;
  poTotalUsd: number;
  totalPercent: number;
  executedPercent: number;
  remainingPercent: number;
  totalAmountInPoCurrency: number;
  executedAmountInPoCurrency: number;
  remainingAmountInPoCurrency: number;
  items: PoPaymentItem[];
}

export interface PoPaymentRequest {
  description: string | null;
  amount: number;
  currencyId: number;
  plannedDate: string | null;
  executedDate: string | null;
  note: string | null;
}

@Injectable({ providedIn: 'root' })
export class OrderDetailsService {
  constructor(private http: HttpClient) {}

  get(id: number) {
    return this.http.get<PurchaseOrderDetail>(`${API_URL}/orders/${id}/details`);
  }

  getPayments(id: number) {
    return this.http.get<PoPaymentsSummary>(`${API_URL}/purchase-orders/${id}/payments`);
  }

  addPayment(id: number, req: PoPaymentRequest) {
    return this.http.post<PoPaymentsSummary>(`${API_URL}/purchase-orders/${id}/payments`, req);
  }

  updatePayment(id: number, paymentId: number, req: PoPaymentRequest) {
    return this.http.put<PoPaymentsSummary>(`${API_URL}/purchase-orders/${id}/payments/${paymentId}`, req);
  }

  deletePayment(id: number, paymentId: number) {
    return this.http.delete<PoPaymentsSummary>(`${API_URL}/purchase-orders/${id}/payments/${paymentId}`);
  }
}
