import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../../api-config';

export interface ShipmentLineItemDetail {
  productCategory: string;
  modelProduct: string;
  qtyInBl: number;
  unitOfMeasure: string | null;
  hsCode: string | null;
  unitPrice: number | null;
  currency: string | null;
  total: number | null;
}

export interface ErpColumnDetail {
  companyName: string;
  sequenceOrder: number;
  isLast: boolean;
  data: Record<string, unknown> | null;
}

export interface ShipmentFullDetail {
  id: number;
  blAwbNo: string;
  poNumber: string | null;
  status: string;
  businessUnit: string;
  division: string | null;
  supplier: string | null;
  consignee: string;
  category: string;
  vesselName: string | null;
  fcl20Count: number;
  fcl40Count: number;
  etd: string | null;
  eta: string | null;
  sobActualDate: string | null;
  lineItems: ShipmentLineItemDetail[];
  percentOfPoQty: number | null;
  forwarder: Record<string, unknown> | null;
  acd: Record<string, unknown> | null;
  draftDocuments: Record<string, unknown> | null;
  ssmo: Record<string, unknown> | null;
  mot: Record<string, unknown> | null;
  supplierFullSet: Record<string, unknown> | null;
  banking: Record<string, unknown> | null;
  erpInfo: ErpColumnDetail[];
  lastOffshoreInvoiceNo: string | null;
}

@Injectable({ providedIn: 'root' })
export class ShipmentDetailsService {
  constructor(private http: HttpClient) {}

  get(id: number) {
    return this.http.get<ShipmentFullDetail>(`${API_URL}/shipments/${id}/full-details`);
  }
}
