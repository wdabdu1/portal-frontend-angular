import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_URL } from '../api-config';

export interface LoginResponse {
  token: string;
  displayName: string;
  roles: string[];
}

const TOKEN_KEY = 'shipping_portal_token';
const DISPLAY_NAME_KEY = 'shipping_portal_display_name';
const ROLES_KEY = 'shipping_portal_roles';

@Injectable({ providedIn: 'root' })
export class AuthService {
  isLoggedIn = signal<boolean>(!!localStorage.getItem(TOKEN_KEY));

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_URL}/auth/login`, { email, password }).pipe(
      tap((res) => {
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(DISPLAY_NAME_KEY, res.displayName);
        localStorage.setItem(ROLES_KEY, JSON.stringify(res.roles));
        this.isLoggedIn.set(true);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(DISPLAY_NAME_KEY);
    localStorage.removeItem(ROLES_KEY);
    this.isLoggedIn.set(false);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getDisplayName(): string | null {
    return localStorage.getItem(DISPLAY_NAME_KEY);
  }

  getRoles(): string[] {
    const raw = localStorage.getItem(ROLES_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  hasRole(role: string): boolean {
    return this.getRoles().includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    return this.getRoles().some((r) => roles.includes(r));
  }

  // Nav visibility groups, matching the access matrix. Kept centralized
  // here so every page (nav bar, home redirect, etc.) agrees on who sees what.
  canSeeOrders(): boolean {
    return this.hasAnyRole(['IP_User', 'IP_Supervisor', 'SuperUser', 'BU', 'Treasury', 'Manager']);
  }

  canCreateOrders(): boolean {
    return this.hasAnyRole(['IP_User', 'IP_Supervisor', 'SuperUser']);
  }

  canSeeShipments(): boolean {
    return this.hasAnyRole(['IP_User', 'IP_Supervisor', 'SuperUser', 'BU', 'Treasury', 'Manager', 'CLR_Usr', 'CLR_Supervisor']);
  }

  canSeeSupplierDues(): boolean {
    return this.hasAnyRole(['IP_User', 'IP_Supervisor', 'SuperUser', 'BU', 'Treasury', 'CorpFinance', 'Manager']);
  }

  canSeeBankDues(): boolean {
    return this.hasAnyRole(['IP_User', 'IP_Supervisor', 'SuperUser', 'Treasury', 'CorpFinance', 'Manager']);
  }

  canSeeSettings(): boolean {
    return this.hasAnyRole(['Manager', 'SuperUser']);
  }
}
