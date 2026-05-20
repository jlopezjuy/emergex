import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Account } from './models/account.model';
import { LoginCredentials } from './models/login.model';

import { JWT_STORAGE_KEY } from './auth.constants';

interface JwtResponse {
  id_token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _account = signal<Account | null>(null);
  private _isAuthenticated = signal<boolean>(!!localStorage.getItem(JWT_STORAGE_KEY));

  readonly currentAccount = this._account.asReadonly();
  readonly isAuthenticated = this._isAuthenticated.asReadonly();

  constructor() {
    window.addEventListener('storage', (event) => {
      if (event.key === JWT_STORAGE_KEY && !event.newValue) {
        this._account.set(null);
        this._isAuthenticated.set(false);
        this.router.navigate(['/login']);
      }
    });
  }

  login(credentials: LoginCredentials): Observable<Account> {
    return this.http
      .post<JwtResponse>(`${environment.apiUrl}/api/authenticate`, {
        username: credentials.username,
        password: credentials.password,
        rememberMe: credentials.rememberMe,
      })
      .pipe(
        tap((res) => {
          localStorage.setItem(JWT_STORAGE_KEY, res.id_token);
          this._isAuthenticated.set(true);
        }),
        switchMap(() => this.fetchAccount()),
      );
  }

  fetchAccount(): Observable<Account> {
    return this.http.get<Account>(`${environment.apiUrl}/api/account`).pipe(
      tap((account) => this._account.set(account)),
    );
  }

  logout(): void {
    localStorage.removeItem(JWT_STORAGE_KEY);
    this._account.set(null);
    this._isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(JWT_STORAGE_KEY);
  }

  refreshToken(): Observable<{ id_token: string }> {
    const token = this.getToken();
    return this.http.post<{ id_token: string }>(
      `${environment.apiUrl}/api/refresh`,
      { token }
    ).pipe(
      tap(res => {
        localStorage.setItem(JWT_STORAGE_KEY, res.id_token);
      })
    );
  }
}
