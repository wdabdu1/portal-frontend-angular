import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_URL } from './api-config';

export interface Favorite {
  id: number;
  label: string;
  route: string;
  sortOrder: number;
}

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<Favorite[]>(`${API_URL}/favorites`);
  }

  add(label: string, route: string) {
    return this.http.post<Favorite>(`${API_URL}/favorites`, { label, route });
  }

  remove(id: number) {
    return this.http.delete(`${API_URL}/favorites/${id}`);
  }
}
