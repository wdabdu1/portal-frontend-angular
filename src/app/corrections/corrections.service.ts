import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface LookupRef { id: number; name: string; }

export interface PoCorrection {
  id: number;
  poNumber: string;
  status: string;
  businessUnit: string;
  originCountry: LookupRef;
  incoterm: LookupRef;
  shipmentMode: LookupRef;
  paymentTerm: LookupRef;
  approvalType: LookupRef;
  brandManufacturer: LookupRef;
  portOfLoading: LookupRef | null;
  portOfDischarge: LookupRef | null;
  offshorePoNo: string | null;
  offshorePoDate: string | null;
  supplierPiNo: string | null;
  supplierPiDate: string | null;
  receivedSignedPiDate: string | null;
  sentSignedPiDate: string | null;
  buPoDate: string | null;
  orderExecutionDate: string | null;
  latestShippingDate: string | null;
}

export interface PoCorrectionRequest {
  originCountryId: number;
  incotermId: number;
  shipmentModeId: number;
  supplierPaymentTermId: number;
  approvalTypeId: number;
  brandManufacturerId: number;
  portOfLoadingId: number | null;
  portOfDischargeId: number | null;
  offshorePoNo: string | null;
  offshorePoDate: string | null;
  supplierPiNo: string | null;
  supplierPiDate: string | null;
  receivedSignedPiDate: string | null;
  sentSignedPiDate: string | null;
  buPoDate: string | null;
  orderExecutionDate: string | null;
  latestShippingDate: string | null;
}

export interface ShipmentCorrectionLine { lineItemId: number; modelProduct: string; hsCode: string | null; }

export interface ShipmentCorrection {
  id: number;
  blAwbNo: string;
  poNumber: string;
  status: string;
  businessUnit: string;
  blAwbDate: string | null;
  etd: string | null;
  eta: string | null;
  shippingLine: LookupRef;
  vesselName: string | null;
  fcl20Count: number;
  fcl40Count: number;
  soc: boolean;
  blFreeDays: number | null;
  lineItems: ShipmentCorrectionLine[];
}

export interface ShipmentCorrectionRequest {
  blAwbDate: string | null;
  etd: string | null;
  eta: string | null;
  shippingLineId: number;
  vesselName: string | null;
  fcl20Count: number;
  fcl40Count: number;
  soc: boolean;
  blFreeDays: number | null;
  lineItems: { lineItemId: number; hsCode: string | null }[];
}

export interface ChangeLogRow {
  id: number;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changedByName: string;
  changedAt: string;
}

@Injectable({ providedIn: 'root' })
export class CorrectionsService {
  constructor(private http: HttpClient) {}

  getOrder(id: number) { return this.http.get<PoCorrection>(`${API_URL}/corrections/orders/${id}`); }
  saveOrder(id: number, req: PoCorrectionRequest) { return this.http.put<{ changed: number }>(`${API_URL}/corrections/orders/${id}`, req); }

  getShipment(id: number) { return this.http.get<ShipmentCorrection>(`${API_URL}/corrections/shipments/${id}`); }
  saveShipment(id: number, req: ShipmentCorrectionRequest) { return this.http.put<{ changed: number }>(`${API_URL}/corrections/shipments/${id}`, req); }

  getHistory(entityType: 'orders' | 'shipments', id: number) {
    return this.http.get<ChangeLogRow[]>(`${API_URL}/corrections/history/${entityType}/${id}`);
  }
}
