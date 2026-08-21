import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface PayableDueRow {
  shipmentId: number;
  blAwbNo: string;
  category: string;
  invoiceNo: string | null;
  collectionRefNo: string | null;
  receiverBankName: string;
  receiverBankId: number;
  senderBankName: string | null;
  senderBankId: number | null;
  dueDate: string | null;
  cbosDueDate: string | null;
  necessaryGoodType: boolean;
  valueAed: number;
  paidAed: number;
  remainingAed: number;
}

export interface SenderBankOption {
  id: number;
  name: string;
}

export interface ConfirmLine {
  shipmentId: number;
  paymentAmountAed: number;
}

@Injectable({ providedIn: 'root' })
export class PayBankDuesService {
  constructor(private http: HttpClient) {}

  getAllDues(includeSettled: boolean) {
    return this.http.get<PayableDueRow[]>(`${API_URL}/pay-bank-dues/all`, { params: { includeSettled } });
  }

  getSenderBanks(receiverBankId: number) {
    return this.http.get<SenderBankOption[]>(`${API_URL}/pay-bank-dues/sender-banks`, { params: { receiverBankId } });
  }

  getDues(receiverBankId: number, senderBankId: number, includeSettled: boolean) {
    return this.http.get<PayableDueRow[]>(`${API_URL}/pay-bank-dues/dues`, { params: { receiverBankId, senderBankId, includeSettled } });
  }

  confirm(receiverBankId: number, senderBankId: number, accountId: number, lines: ConfirmLine[]) {
    return this.http.post(`${API_URL}/pay-bank-dues/confirm`,
      { receiverBankId, senderBankId, accountId, lines },
      { responseType: 'blob', observe: 'response' });
  }
}
