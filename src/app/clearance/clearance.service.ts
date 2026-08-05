import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface ClearanceRoute1Details {
  moveRequestDate: string | null; billAmountSdg: number | null; billSettlementDate: string | null;
  ssmoFileRequestDate: string | null; ssmoInspectionAmountSdg: number | null; ssmoFeesSettlementDate: string | null;
  custExamStartDate: string | null; custExamCompletedDate: string | null;
  customsLabRequired: boolean; customsLabFeesSdg: number | null; labFeesPaymentDate: string | null; labResultIssuanceDate: string | null;
  ssmoExamStartDate: string | null; ssmoCertIssuanceDate: string | null;
  custEvaluationDate: string | null; customsDutySdg: number | null; customsSettlementDate: string | null; releaseExitPassDate: string | null;
  spcBillRequestDate: string | null; spcBillValueSdg: number | null; spcBillSettlementDate: string | null;
  truckPortEntryPermitDate: string | null; containersReturnedDate: string | null;
  shippingLineDepositReturnDate: string | null; depositValue: number | null; clearanceActualCompletedDate: string | null;
}

export interface ClearanceRoute2Details {
  depositRequestDate: string | null; requestApprovalDate: string | null;
  depositRefNo: string | null; fzInvoiceNo: string | null; destinationId: number | null;
  inspectionDate: string | null;
  spcBillRequestDate: string | null; spcBillValueSdg: number | null; spcBillSettlementDate: string | null; policeSecurityAppointedDate: string | null;
  truckPortEntryPermitDate: string | null; containersReceivedAtFzDate: string | null; containersReturnedDate: string | null;
  shippingLineDepositReturnDate: string | null; depositValue: number | null; clearanceActualCompletedDate: string | null;
}

export interface WithdrawalLineInput {
  shipmentLineItemId: number;
  qty: number;
}

export interface ClearanceRoute3Details {
  depositShipmentId: number | null;
  withdrawals: WithdrawalLineInput[] | null;
  certificateEntryDate: string | null; scudaDeclarationNo: string | null;
  ssmoFileRequestDate: string | null; ssmoInspectionAmountSdg: number | null; ssmoFeesSettlementDate: string | null;
  custExamStartDate: string | null; custExamCompletedDate: string | null;
  customsLabRequired: boolean; customsLabFeesSdg: number | null; labFeesPaymentDate: string | null; labResultIssuanceDate: string | null;
  ssmoExamStartDate: string | null; ssmoCertIssuanceDate: string | null;
  custEvaluationDate: string | null; customsDutySdg: number | null; customsSettlementDate: string | null; releaseExitPassDate: string | null;
  truckPortEntryPermitDate: string | null; clearanceActualCompletedDate: string | null;
}

export interface FzDepositOption {
  shipmentId: number;
  blAwbNo: string;
  depositRefNo: string | null;
}

export interface FzBalanceLine {
  shipmentLineItemId: number;
  modelProduct: string;
  deposited: number;
  withdrawn: number;
  balance: number;
}

export interface FzInventoryRow {
  shipmentId: number;
  businessUnit: string;
  blAwbNo: string;
  depositRefNo: string | null;
  dateOfDeposit: string | null;
  division: string | null;
  categories: string[];
  totalQty: number;
  totalWithdrawn: number;
  balance: number;
}

export interface ClearanceDeliveryOrder {
  copyOfDoCollectedDate: string | null; receiveDoDate: string | null; actualArrivalDate: string | null;
  depositRequired: boolean; doActualFeesSdg: number | null; doFeesSettledDate: string | null; doReceivedDate: string | null;
}

export interface ClearanceCostEstimate {
  estimateDate: string | null; notifyBuDate: string | null; amountSettledDate: string | null;
}

export interface CostEstimateResponse {
  estimate: ClearanceCostEstimate | null;
  totalSdg: number;
}

export interface ClearanceEstimateLineItem {
  id: number;
  chargeTypeId: number;
  chargeTypeName: string;
  valueSdg: number;
  dueDate: string | null;
}

export interface ClearanceCertificateEntry {
  certificateEntryDate: string | null; scudaDeclarationNo: string | null;
}

export interface ClearanceShipmentSummary {
  shipmentId: number;
  blAwbNo: string;
  businessUnit: string;
  category: string;
  eta: string | null;
  fclCount: number;
  declarationNo: string | null;
  product: string;
  qty: number;
  unit: string;
  trafficLight: 'Green' | 'Amber' | 'Red' | 'Grey';
  routeStatus: string;
}

export interface ClearanceDetail {
  shipmentId: number;
  blAwbNo: string;
  poNumber: string;
  eta: string | null;
  copyOfBlReceivedDate: string | null;
  originalShipmentSetReceivedDate: string | null;
  lcNo: string | null;
  declarationNo: string | null;
  notes: string | null;
  route: number;
  clearanceCompleteDate: string | null;
  imFormNo: string | null;
  imFormDate: string | null;
  consignee: string;
  category: string;
  fclCount: number;
}

export interface ScheduleItem {
  division: string;
  groupItem: string;
  targetDays: number;
  targetDate: string;
  actualDate: string | null;
  status: string;
  light: 'Green' | 'Amber' | 'Red';
}

export interface ClearanceScheduleResponse {
  estimatedCompletionDate: string | null;
  items: ScheduleItem[];
}

export interface DemurrageStorageResult {
  applicable: boolean;
  anchorDate: string | null;
  storageEndDate: string | null;
  storageEndIsActual: boolean;
  demurrageEndDate: string | null;
  demurrageEndIsActual: boolean;
  storageDays: number;
  demurrageDays: number;
  fcl20Count: number;
  fcl40Count: number;
  storageFreeDays: number;
  storageChargeableDays: number;
  demurrageFreeDays20: number | null;
  demurrageChargeableDays20: number | null;
  demurrageFreeDays40: number | null;
  demurrageChargeableDays40: number | null;
  storageCostEuro: number;
  storageCostSdg: number;
  demurrageCostSdg: number;
  totalStorageDemurrageSdg: number;
  warnings: string[];
}

@Injectable({ providedIn: 'root' })
export class ClearanceService {
  constructor(private http: HttpClient) {}

  getShipmentsForClearance(search?: string) {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.http.get<ClearanceShipmentSummary[]>(`${API_URL}/clearance/shipments${query}`);
  }

  getDetail(shipmentId: number) {
    return this.http.get<ClearanceDetail>(`${API_URL}/clearance/${shipmentId}/detail`);
  }

  saveGeneralInfo(shipmentId: number, req: Partial<ClearanceDetail> & { shipmentEta?: string | null }) {
    return this.http.put(`${API_URL}/clearance/${shipmentId}/general-info`, req);
  }

  setRoute(shipmentId: number, route: number) {
    return this.http.put(`${API_URL}/clearance/${shipmentId}/route`, { route });
  }

  getSchedule(shipmentId: number) {
    return this.http.get<ClearanceScheduleResponse>(`${API_URL}/clearance/${shipmentId}/sla-schedule`);
  }

  getDemurrageStorage(shipmentId: number) {
    return this.http.get<DemurrageStorageResult>(`${API_URL}/clearance/${shipmentId}/demurrage-storage`);
  }

  getDeliveryOrder(shipmentId: number) {
    return this.http.get<ClearanceDeliveryOrder | null>(`${API_URL}/clearance/${shipmentId}/delivery-order`);
  }
  saveDeliveryOrder(shipmentId: number, req: Partial<ClearanceDeliveryOrder>) {
    return this.http.put(`${API_URL}/clearance/${shipmentId}/delivery-order`, req);
  }

  getCostEstimate(shipmentId: number) {
    return this.http.get<CostEstimateResponse>(`${API_URL}/clearance/${shipmentId}/cost-estimate`);
  }
  saveCostEstimate(shipmentId: number, req: Partial<ClearanceCostEstimate>) {
    return this.http.put(`${API_URL}/clearance/${shipmentId}/cost-estimate`, req);
  }

  getEstimateLineItems(shipmentId: number) {
    return this.http.get<ClearanceEstimateLineItem[]>(`${API_URL}/clearance/${shipmentId}/estimate-line-items`);
  }
  addEstimateLineItem(shipmentId: number, req: { chargeTypeId: number; valueSdg: number; dueDate: string | null }) {
    return this.http.post<ClearanceEstimateLineItem>(`${API_URL}/clearance/${shipmentId}/estimate-line-items`, req);
  }
  deleteEstimateLineItem(shipmentId: number, lineItemId: number) {
    return this.http.delete(`${API_URL}/clearance/${shipmentId}/estimate-line-items/${lineItemId}`);
  }

  getCertificateEntry(shipmentId: number) {
    return this.http.get<ClearanceCertificateEntry | null>(`${API_URL}/clearance/${shipmentId}/certificate-entry`);
  }
  saveCertificateEntry(shipmentId: number, req: Partial<ClearanceCertificateEntry>) {
    return this.http.put(`${API_URL}/clearance/${shipmentId}/certificate-entry`, req);
  }

  getRoute1(shipmentId: number) {
    return this.http.get<ClearanceRoute1Details | null>(`${API_URL}/clearance/${shipmentId}/route1`);
  }
  saveRoute1(shipmentId: number, req: Partial<ClearanceRoute1Details>) {
    return this.http.put(`${API_URL}/clearance/${shipmentId}/route1`, req);
  }

  getRoute2(shipmentId: number) {
    return this.http.get<ClearanceRoute2Details | null>(`${API_URL}/clearance/${shipmentId}/route2`);
  }
  saveRoute2(shipmentId: number, req: Partial<ClearanceRoute2Details>) {
    return this.http.put(`${API_URL}/clearance/${shipmentId}/route2`, req);
  }

  getRoute3(shipmentId: number) {
    return this.http.get<ClearanceRoute3Details | null>(`${API_URL}/clearance/${shipmentId}/route3`);
  }
  saveRoute3(shipmentId: number, req: Partial<ClearanceRoute3Details>) {
    return this.http.put(`${API_URL}/clearance/${shipmentId}/route3`, req);
  }
}
