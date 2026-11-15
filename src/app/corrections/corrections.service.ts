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

export interface PoIdentity {
  id: number;
  poNumber: string;
  businessUnit: LookupRef;
  division: LookupRef;
  supplier: LookupRef;
  consignee: LookupRef;
  shipmentCount: number;
  shipmentBlNumbers: string[];
  poPaymentCount: number;
  lineItemCount: number;
}

export interface PoIdentityRequest {
  poNumber: string;
  businessUnitId: number;
  divisionId: number;
  supplierId: number;
  consigneeId: number;
  reason: string;
}

export interface LineCorrectionRow {
  lineId: number; category: string; model: string; qty: number; uom: LookupRef; unitPrice: number; currency: LookupRef;
  total: number; totalUsd: number; shippedQty: number; shipmentCount: number;
}
export interface LinesCorrection {
  id: number; poNumber: string; status: string; moneyLocked: boolean; lockReason: string | null; poPaymentCount: number;
  lines: LineCorrectionRow[];
}
export interface LineCorrectionInput { lineId: number; qty: number; unitPrice: number; currencyId: number; unitOfMeasureId: number; }

export interface ShipLineRow {
  lineId: number; purchaseOrderLineItemId: number; poNumber: string; category: string; model: string; uom: string; orderedQty: number;
  qtyInBl: number; otherShipmentsQty: number; minQty: number; maxQty: number; unitPrice: number; currency: string; itemSubtotal: number; hsCode: string | null;
}
export interface ShipAvailableLine {
  purchaseOrderLineItemId: number; poNumber: string; category: string; model: string; uom: string; orderedQty: number; remainingQty: number;
  unitPrice: number; currency: string;
}
export interface ShipmentLines {
  id: number; blAwbNo: string; status: string; locked: boolean; lockReason: string | null; confirmedSections: string[];
  lines: ShipLineRow[]; available: ShipAvailableLine[];
}

export interface ChainRow { id: number; sequenceOrder: number; partner: LookupRef; }
export interface ChainInfo {
  id: number; poNumber: string; chain: ChainRow[]; tpEntryCount: number; erpInfoCount: number; shipmentCount: number; sharedWithOtherPos: boolean;
}
export interface ChainSaveResult { changed: number; needsConfirm: boolean; tpRows: number; erpRows: number; }

export interface ForecastRecalcRow { blAwbNo: string; oldDemurrageSdg: number | null; newDemurrageSdg: number | null; oldStorageSdg: number | null; newStorageSdg: number | null; }
export interface ForecastRecalcResult { updated: number; unchanged: number; skippedLocked: number; notApplicable: number; changes: ForecastRecalcRow[]; }

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

  // Phase 2 - SuperUser only
  getOrderIdentity(id: number) { return this.http.get<PoIdentity>(`${API_URL}/corrections/orders/${id}/identity`); }
  saveOrderIdentity(id: number, req: PoIdentityRequest) {
    return this.http.put<{ changed: number }>(`${API_URL}/corrections/orders/${id}/identity`, req);
  }
  saveBlNumber(id: number, blAwbNo: string, reason: string) {
    return this.http.put<{ changed: number }>(`${API_URL}/corrections/shipments/${id}/bl-number`, { blAwbNo, reason });
  }

  // Phase 3 - SuperUser only
  getLines(id: number) { return this.http.get<LinesCorrection>(`${API_URL}/corrections/orders/${id}/lines`); }
  saveLines(id: number, lines: LineCorrectionInput[], reason: string) {
    return this.http.put<{ changed: number }>(`${API_URL}/corrections/orders/${id}/lines`, { lines, reason });
  }
  getShipmentLines(id: number) { return this.http.get<ShipmentLines>(`${API_URL}/corrections/shipments/${id}/lines`); }
  saveShipmentLines(id: number, updates: { lineId: number; qtyInBl: number }[], additions: { purchaseOrderLineItemId: number; qtyInBl: number; hsCode: string | null }[], reason: string) {
    return this.http.put<{ changed: number }>(`${API_URL}/corrections/shipments/${id}/lines`, { updates, additions, reason });
  }
  getChain(id: number) { return this.http.get<ChainInfo>(`${API_URL}/corrections/orders/${id}/chain`); }
  saveChain(id: number, partnerIds: number[], reason: string, confirm: boolean) {
    return this.http.put<ChainSaveResult>(`${API_URL}/corrections/orders/${id}/chain`, { partnerIds, reason, confirm });
  }

  getHistory(entityType: 'orders' | 'shipments', id: number) {
    return this.http.get<ChangeLogRow[]>(`${API_URL}/corrections/history/${entityType}/${id}`);
  }
}
