import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface ReceiverBankAccount {
  id: number;
  receiverBankId: number;
  accountNo: string;
  accountName: string;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class ReceiverBankAccountsService {
  constructor(private http: HttpClient) {}

  getAll(bankId: number) {
    return this.http.get<ReceiverBankAccount[]>(`${API_URL}/settings/receiver-banks/${bankId}/accounts`);
  }

  create(bankId: number, account: { accountNo: string; accountName: string; isActive: boolean }) {
    return this.http.post<ReceiverBankAccount>(`${API_URL}/settings/receiver-banks/${bankId}/accounts`, account);
  }

  update(bankId: number, id: number, account: { accountNo: string; accountName: string; isActive: boolean }) {
    return this.http.put<ReceiverBankAccount>(`${API_URL}/settings/receiver-banks/${bankId}/accounts/${id}`, account);
  }

  delete(bankId: number, id: number) {
    return this.http.delete(`${API_URL}/settings/receiver-banks/${bankId}/accounts/${id}`);
  }
}
