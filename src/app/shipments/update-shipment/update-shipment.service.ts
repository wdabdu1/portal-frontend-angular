import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../../api-config';

export interface ShipmentForwarder {
  forwarderId: number | null;
  actualShippingCost: number | null;
  currencyId: number | null;
  actualShippingCostUsd: number | null;
  amountSaved: number | null;
  marineInsurance: boolean;
}

export interface ShipmentAcd {
  processDate: string | null;
  costUsd: number | null;
  costSettledDate: string | null;
  refNumber: string | null;
}

export interface ShipmentDraftDocuments {
  initialDraftReceivedDate: string | null;
  finalDraftReceivedDate: string | null;
  finalDraftConfirmedDate: string | null;
}

export interface ShipmentSsmo {
  applicationDate: string | null;
  cost: number | null;
  costSettledDate: string | null;
  refNumber: string | null;
  approvalDate: string | null;
}

export interface ShipmentMot {
  processDate: string | null;
  cost: number | null;
  costSettledDate: string | null;
  refNumber: string | null;
  approvalDate: string | null;
  offshoreApprovedPiNumber: string | null;
}

export interface ShipmentSupplierFullSet {
  supplierInvoiceNo: string | null;
  supplierInvoiceDate: string | null;
  fsDispatchDate: string | null;
  fsDispatchedViaId: number | null;
  fsTrackingNumber: string | null;
  fsReceivedDate: string | null;
}

export interface ShipmentBanking {
  senderBankId: number | null;
  osDocDispatchDate: string | null;
  osDocDispatchedViaId: number | null;
  osDocTrackingNumber: string | null;
  senderBankCharges: number | null;
  receivingBankId: number | null;
  necessaryGoodType: boolean;
  collectionRefNo: string | null;
  collectionValue: number | null;
  collectionCurrencyId: number | null;
  tenorId: number | null;
  receiverBankCharges: number | null;
}
export interface ErpColumn {
  purchaseOrderOffshorePartnerId: number;
  companyName: string;
  sequenceOrder: number;
  prNo: string | null;
  poNo: string | null;
  sa: string | null;
  billReg: string | null;
  grn: string | null;
  invoiceNo: string | null;
  inspectionNo: string | null;
  remarks: string | null;
}

export interface ShipmentLineItemHsCode {
  lineItemId: number;
  modelProduct: string;
  hsCode: string | null;
}

export interface ShipmentDetail {
  id: number;
  blAwbNo: string;
  poNumber: string;
  status: string;
  forwarder: ShipmentForwarder | null;
  acd: ShipmentAcd | null;
  draftDocuments: ShipmentDraftDocuments | null;
  ssmo: ShipmentSsmo | null;
  mot: ShipmentMot | null;
  supplierFullSet: ShipmentSupplierFullSet | null;
  banking: ShipmentBanking | null;
  offshorePartnerNames: string[];
  businessUnit: string;
  supplier: string;
  category: string;
  sobActualDate: string | null;
  lineItemHsCodes: ShipmentLineItemHsCode[];
}

@Injectable({ providedIn: 'root' })
export class UpdateShipmentService {
  constructor(private http: HttpClient) {}

  getDetail(shipmentId: number) {
    return this.http.get<ShipmentDetail>(`${API_URL}/shipments/${shipmentId}/detail`);
  }

  saveForwarder(shipmentId: number, req: Partial<ShipmentForwarder>) {
    return this.http.put(`${API_URL}/shipments/${shipmentId}/forwarder`, req);
  }

  saveAcd(shipmentId: number, req: Partial<ShipmentAcd>) {
    return this.http.put(`${API_URL}/shipments/${shipmentId}/acd`, req);
  }

  saveHsCodes(shipmentId: number, lineItemHsCodes: ShipmentLineItemHsCode[]) {
    return this.http.put(`${API_URL}/shipments/${shipmentId}/hs-codes`, { lineItemHsCodes });
  }

  saveDraftDocuments(shipmentId: number, req: Partial<ShipmentDraftDocuments>) {
    return this.http.put(`${API_URL}/shipments/${shipmentId}/draft-documents`, req);
  }

  saveSsmo(shipmentId: number, req: Partial<ShipmentSsmo>) {
    return this.http.put(`${API_URL}/shipments/${shipmentId}/ssmo`, req);
  }

  saveMot(shipmentId: number, req: Partial<ShipmentMot>) {
    return this.http.put(`${API_URL}/shipments/${shipmentId}/mot`, req);
  }

  saveSupplierFullSet(shipmentId: number, req: Partial<ShipmentSupplierFullSet>) {
    return this.http.put(`${API_URL}/shipments/${shipmentId}/supplier-full-set`, req);
  }


  saveBanking(shipmentId: number, req: Partial<ShipmentBanking>) {
    return this.http.put(`${API_URL}/shipments/${shipmentId}/banking`, req);
  }

  confirmShipment(shipmentId: number) {
    return this.http.post(`${API_URL}/shipments/${shipmentId}/confirm`, {});
  }

  saveShipOnBoard(shipmentId: number, req: { sobActualDate: string | null }) {
    return this.http.put(`${API_URL}/shipments/${shipmentId}/ship-on-board`, req);
  }

  getErpColumns(shipmentId: number) {
    return this.http.get<ErpColumn[]>(`${API_URL}/shipments/${shipmentId}/erp-info`);
  }

  saveErpColumn(shipmentId: number, offshorePartnerId: number, req: Partial<ErpColumn>) {
    return this.http.put<ErpColumn>(`${API_URL}/shipments/${shipmentId}/erp-info/${offshorePartnerId}`, req);
  }
}
