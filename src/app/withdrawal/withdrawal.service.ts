import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface WithdrawalSummary {
  id: number;
  depositShipmentId: number;
  depositBlAwbNo: string;
  withdrawalRequestDate: string | null;
  withdrawalRequestRefNo: string | null;
}

export interface WithdrawalDetail {
  id: number;
  depositShipmentId: number;
  depositBlAwbNo: string;
  withdrawalRequestDate: string | null;
  withdrawalRequestRefNo: string | null;
  certificateEntryDate: string | null;
  scudaDeclarationNo: string | null;
  ssmoFileRequestDate: string | null;
  ssmoInspectionAmountSdg: number | null;
  ssmoFeesSettlementDate: string | null;
  custExamStartDate: string | null;
  custExamCompletedDate: string | null;
  customsLabRequired: boolean;
  customsLabFeesSdg: number | null;
  labFeesPaymentDate: string | null;
  labResultIssuanceDate: string | null;
  ssmoExamStartDate: string | null;
  ssmoCertIssuanceDate: string | null;
  custEvaluationDate: string | null;
  customsDutySdg: number | null;
  customsSettlementDate: string | null;
  releaseExitPassDate: string | null;
  truckPortEntryPermitDate: string | null;
  clearanceActualCompletedDate: string | null;
}

export interface WithdrawalCostEstimate {
  estimateDate: string | null;
  notifyBuDate: string | null;
  amountSettledDate: string | null;
}

export interface EstimateLineItem {
  id: number;
  chargeTypeId: number;
  chargeTypeName: string;
  valueSdg: number;
  dueDate: string | null;
}

export interface FzBalanceLine {
  shipmentLineItemId: number;
  modelProduct: string;
  deposited: number;
  withdrawn: number;
  underClearance: number;
  available: number;
}

export interface FzDepositOption {
  shipmentId: number;
  blAwbNo: string;
  depositRefNo: string | null;
}

@Injectable({ providedIn: 'root' })
export class WithdrawalService {
  constructor(private http: HttpClient) {}

  getDepositOptions() {
    return this.http.get<FzDepositOption[]>(`${API_URL}/fz-inventory/options`);
  }

  create(depositShipmentId: number) {
    return this.http.post<WithdrawalSummary>(`${API_URL}/withdrawals`, { depositShipmentId });
  }

  getAll(depositShipmentId?: number) {
    const query = depositShipmentId ? `?depositShipmentId=${depositShipmentId}` : '';
    return this.http.get<WithdrawalSummary[]>(`${API_URL}/withdrawals${query}`);
  }

  getDetail(id: number) {
    return this.http.get<WithdrawalDetail>(`${API_URL}/withdrawals/${id}`);
  }

  saveGeneralInfo(id: number, req: { withdrawalRequestDate: string | null; withdrawalRequestRefNo: string | null }) {
    return this.http.put(`${API_URL}/withdrawals/${id}/general-info`, req);
  }

  saveProcessing(id: number, req: Partial<WithdrawalDetail>) {
    return this.http.put(`${API_URL}/withdrawals/${id}/processing`, req);
  }

  getCostEstimate(id: number) {
    return this.http.get<{ estimate: WithdrawalCostEstimate | null; totalSdg: number; lineItems: EstimateLineItem[] }>(`${API_URL}/withdrawals/${id}/cost-estimate`);
  }

  saveCostEstimate(id: number, req: WithdrawalCostEstimate) {
    return this.http.put(`${API_URL}/withdrawals/${id}/cost-estimate`, req);
  }

  addEstimateLineItem(id: number, req: { chargeTypeId: number; valueSdg: number; dueDate: string | null }) {
    return this.http.post<EstimateLineItem>(`${API_URL}/withdrawals/${id}/estimate-line-items`, req);
  }

  deleteEstimateLineItem(id: number, lineItemId: number) {
    return this.http.delete(`${API_URL}/withdrawals/${id}/estimate-line-items/${lineItemId}`);
  }

  getLineItems(id: number) {
    return this.http.get<FzBalanceLine[]>(`${API_URL}/withdrawals/${id}/line-items`);
  }

  saveLineItems(id: number, lines: { shipmentLineItemId: number; qty: number }[]) {
    return this.http.put(`${API_URL}/withdrawals/${id}/line-items`, { lines });
  }
}
