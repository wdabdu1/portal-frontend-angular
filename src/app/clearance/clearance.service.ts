import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

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
  trafficLight: 'Green' | 'Amber' | 'Red' | 'Grey';
  routeStatus: string;
}

export interface ClearanceRoute1Details {
  moveRequestDate: string | null; billAmountSdg: number | null; billSettlementDate: string | null;
  ssmoFileRequestDate: string | null; ssmoInspectionAmountSdg: number | null; ssmoFeesSettlementDate: string | null;
  custExamStartDate: string | null; custExamCompletedDate: string | null;
  customsLabRequired: boolean; customsLabFeesSdg: number | null; labFeesPaymentDate: string | null; labResultIssuanceDate: string | null;
  ssmoExamStartDate: string | null; ssmoCertIssuanceDate: string | null;
  custEvaluationDate: string | null; customsDutySdg: number | null; customsSettlementDate: string | null; releaseExitPassDate: string | null;
  spcBillRequestDate: string | null; spcBillValueSdg: number | null; spcBillSettlementDate: string | null;
  truckPortEntryPermitDate: string | null; containersReturnedDate: string | null; clearanceActualCompletedDate: string | null;
}

export interface ClearanceRoute2Details {
  depositRequestDate: string | null; requestApprovalDate: string | null;
  inspectionDate: string | null;
  spcBillRequestDate: string | null; spcBillValueSdg: number | null; spcBillSettlementDate: string | null; policeSecurityAppointedDate: string | null;
  truckPortEntryPermitDate: string | null; containersReceivedAtFzDate: string | null; containersReturnedDate: string | null; clearanceActualCompletedDate: string | null;
}

export interface ClearanceRoute3Details {
  certificateEntryDate: string | null; scudaDeclarationNo: string | null;
  ssmoFileRequestDate: string | null; ssmoInspectionAmountSdg: number | null; ssmoFeesSettlementDate: string | null;
  custExamStartDate: string | null; custExamCompletedDate: string | null;
  customsLabRequired: boolean; customsLabFeesSdg: number | null; labFeesPaymentDate: string | null; labResultIssuanceDate: string | null;
  ssmoExamStartDate: string | null; ssmoCertIssuanceDate: string | null;
  custEvaluationDate: string | null; customsDutySdg: number | null; customsSettlementDate: string | null; releaseExitPassDate: string | null;
  truckPortEntryPermitDate: string | null; clearanceActualCompletedDate: string | null;
}

export interface ClearanceDetail {
  shipmentId: number;
  blAwbNo: string;
  poNumber: string;
  copyOfBlReceivedDate: string | null;
  originalShipmentSetReceivedDate: string | null;
  lcNo: string | null;
  declarationNo: string | null;
  notes: string | null;
  route: number;
  clearanceCompleteDate: string | null;
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

  saveGeneralInfo(shipmentId: number, req: Partial<ClearanceDetail>) {
    return this.http.put(`${API_URL}/clearance/${shipmentId}/general-info`, req);
  }

  setRoute(shipmentId: number, route: number) {
    return this.http.put(`${API_URL}/clearance/${shipmentId}/route`, { route });
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
}
