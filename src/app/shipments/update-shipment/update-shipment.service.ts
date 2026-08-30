import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../../api-config';

export interface SupplierInvoiceSummary {
  supplierInvoiceNo: string | null;
  invoiceValue: number;
  invoiceCurrency: string;
  invoiceValueUsd: number;
  totalPaidUsd: number;
  balanceUsd: number;
}

export interface PaymentDue {
  id: number;
  dueDate: string;
  amount: number;
  currencyId: number;
  currencyCode: string;
  label: string | null;
  paidUsd: number;
  amountUsd: number;
}

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
  cocRequired: boolean | null;
  cocAvailable: boolean | null;
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
  addCbosAllowanceId: number | null;
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
  isLast: boolean;
}

export interface LastOffshoreItem {
  shipmentLineItemId: number;
  businessUnit: string;
  category: string;
  modelProduct: string;
  hsCode: string | null;
  description: string | null;
  unitPrice: number | null;
  qty: number;
  total: number | null;
}

export interface LastOffshoreDetails {
  piNo: string | null;
  inspectionNo: string | null;
  grn: string | null;
  invoiceNo: string | null;
  remarks: string | null;
  currencyId: number | null;
  currencyCode: string | null;
  items: LastOffshoreItem[];
  grandTotal: number;
}

export interface ShipmentLineItemHsCode {
  lineItemId: number;
  modelProduct: string;
  hsCode: string | null;
}

// Direct Sales only — "Customer Agreed Payment" schedule.
export interface CustomerDue {
  id: number;
  dueDate: string;
  currencyId: number;
  currencyCode: string;
  value: number;
}

// Direct Sales only — "Customer Collected Payment" (reuses the same
// backend table Bank Dues collections use, under its own route).
export interface CustomerCollection {
  id: number;
  paymentDate: string;
  currencyId: number;
  currencyCode: string;
  value: number;
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
  buShippingBudget: number | null;
  offshorePoNo: string | null;
  fcl20Count: number;
  fcl40Count: number;
  receivedSignedPiDate: string | null;
  orderExecutionDate: string | null;
  latestShippingDate: string | null;
  isDirectSales: boolean;
  consigneeName: string | null;
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

  getLastOffshoreDetails(shipmentId: number) {
    return this.http.get<LastOffshoreDetails>(`${API_URL}/shipments/${shipmentId}/last-offshore`);
  }

  saveLastOffshoreDetails(shipmentId: number, req: {
    inspectionNo: string | null; grn: string | null; invoiceNo: string | null; remarks: string | null; currencyId: number | null;
    items: { shipmentLineItemId: number; hsCode: string | null; description: string | null; unitPrice: number | null }[];
  }) {
    return this.http.put(`${API_URL}/shipments/${shipmentId}/last-offshore`, req);
  }
  
  getSupplierInvoiceSummary(shipmentId: number) {
    return this.http.get<SupplierInvoiceSummary>(`${API_URL}/shipments/${shipmentId}/supplier-invoice-summary`);
  }

  getPaymentDues(shipmentId: number) {
    return this.http.get<PaymentDue[]>(`${API_URL}/shipments/${shipmentId}/supplier-payment/dues`);
  }

  addPaymentDue(shipmentId: number, req: { dueDate: string; amount: number; currencyId: number; label: string | null }) {
    return this.http.post<PaymentDue>(`${API_URL}/shipments/${shipmentId}/supplier-payment/dues`, req);
  }

  updatePaymentDue(shipmentId: number, dueId: number, req: { dueDate: string; amount: number; currencyId: number; label: string | null }) {
    return this.http.put<PaymentDue>(`${API_URL}/shipments/${shipmentId}/supplier-payment/dues/${dueId}`, req);
  }

  deletePaymentDue(shipmentId: number, dueId: number) {
    return this.http.delete(`${API_URL}/shipments/${shipmentId}/supplier-payment/dues/${dueId}`);
  }

  // --- Direct Sales: Customer Agreed Payment / Customer Collected Payment ---

  getCustomerDues(shipmentId: number) {
    return this.http.get<CustomerDue[]>(`${API_URL}/direct-sales/${shipmentId}/dues`);
  }

  addCustomerDue(shipmentId: number, req: { dueDate: string; currencyId: number; value: number }) {
    return this.http.post<CustomerDue>(`${API_URL}/direct-sales/${shipmentId}/dues`, req);
  }

  deleteCustomerDue(shipmentId: number, dueId: number) {
    return this.http.delete(`${API_URL}/direct-sales/${shipmentId}/dues/${dueId}`);
  }

  getCustomerCollections(shipmentId: number) {
    return this.http.get<CustomerCollection[]>(`${API_URL}/direct-sales/${shipmentId}/collections`);
  }

  addCustomerCollection(shipmentId: number, req: { paymentDate: string; currencyId: number; value: number }) {
    return this.http.post<CustomerCollection>(`${API_URL}/direct-sales/${shipmentId}/collections`, req);
  }

  deleteCustomerCollection(shipmentId: number, recordId: number) {
    return this.http.delete(`${API_URL}/direct-sales/${shipmentId}/collections/${recordId}`);
  }
}
