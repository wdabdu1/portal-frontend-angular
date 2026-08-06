import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from '../api-config';

export interface TableSortPreference {
  sortColumn: string;
  sortAsc: boolean;
}

@Injectable({ providedIn: 'root' })
export class TablePreferencesService {
  constructor(private http: HttpClient) {}

  get(tableKey: string) {
    return this.http.get<TableSortPreference | null>(`${API_URL}/table-preferences/${tableKey}`);
  }

  save(tableKey: string, sortColumn: string, sortAsc: boolean) {
    return this.http.put(`${API_URL}/table-preferences/${tableKey}`, { sortColumn, sortAsc });
  }

  getColumnOrder(tableKey: string) {
    return this.http.get<string[] | null>(`${API_URL}/table-preferences/${tableKey}/column-order`);
  }

  saveColumnOrder(tableKey: string, columnOrder: string[]) {
    return this.http.put(`${API_URL}/table-preferences/${tableKey}/column-order`, { columnOrder });
  }
}
