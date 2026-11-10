import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, mapTo, of, tap, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Account } from './models/account.model';
import { LoginCredentials } from './models/login.model';

import {
  clearLegacyStoredTokens,
} from './auth.storage';

interface JwtResponse {
  id_token: string;
  refresh_token?: string;
}

interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _account = signal<Account | null>(null);
  private _accessToken = signal<string | null>(null);
  private _isAuthenticated = signal<boolean>(false);

  readonly currentAccount = this._account.asReadonly();
  readonly isAuthenticated = this._isAuthenticated.asReadonly();

  constructor() {
    clearLegacyStoredTokens();
  }

  login(credentials: LoginCredentials): Observable<Account> {
    return this.http
      .post<JwtResponse>(`${environment.apiUrl}/api/authenticate`, {
        username: credentials.username,
        password: credentials.password,
        rememberMe: credentials.rememberMe,
      }, { withCredentials: true })
      .pipe(
        tap((res) => {
          this.persistSession(res);
        }),
        switchMap(() => this.fetchAccount()),
      );
  }

  switchEnterprise(empresaId: number): Observable<Account> {
    return this.http
      .post<JwtResponse>(`${environment.apiUrl}/api/account/switch-enterprise/${empresaId}`, {}, { withCredentials: true })
      .pipe(
        tap((res) => {
          this.persistSession(res);
        }),
        switchMap(() => this.fetchAccount()),
      );
  }

  fetchAccount(): Observable<Account> {
    return this.http.get<Account>(`${environment.apiUrl}/api/account/me`).pipe(
      tap((account) => this._account.set(account)),
    );
  }

  updateAccount(payload: {
    firstName?: string;
    lastName?: string;
    email?: string;
    langKey?: string;
    imageUrl?: string;
  }): Observable<Account> {
    const current = this._account();
    return this.http
      .post<void>(`${environment.apiUrl}/api/account`, {
        id: current?.id,
        login: current?.login,
        email: payload.email ?? current?.email,
        firstName: payload.firstName ?? current?.firstName,
        lastName: payload.lastName ?? current?.lastName,
        langKey: payload.langKey ?? current?.langKey ?? 'es',
        imageUrl: payload.imageUrl ?? current?.imageUrl,
      })
      .pipe(switchMap(() => this.fetchAccount()));
  }

  updateCurrentProfessional(payload: {
    nombre?: string;
    apellido?: string;
    telefono?: string;
    email?: string;
    foto?: string;
    tipoMatricula?: string;
    matriculaJurisdiccion?: string;
    fechaVencimientoHabilitacion?: string;
    atencionDomiciliaria?: boolean;
    atencionEmergencia?: boolean;
  }): Observable<Account> {
    return this.http
      .patch<Account>(`${environment.apiUrl}/api/account/me/profesional`, payload)
      .pipe(tap((account) => this._account.set(account)));
  }

  logout(): void {
    this.http.post(`${environment.apiUrl}/api/logout`, {}, { withCredentials: true }).subscribe({
      complete: () => this.resetSession(),
      error: () => this.resetSession(),
    });
  }

  getToken(): string | null {
    return this._accessToken();
  }

  refreshToken(): Observable<RefreshTokenResponse> {
    return this.http
      .post<RefreshTokenResponse>(`${environment.apiUrl}/api/auth/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((res) => {
          this._accessToken.set(res.accessToken);
          this._isAuthenticated.set(true);
        }),
      );
  }

  ensureAuthenticated(): Observable<boolean> {
    if (this._accessToken()) {
      return of(true);
    }

    return this.refreshToken().pipe(
      mapTo(true),
      catchError(() => of(false)),
    );
  }

  private persistSession(res: JwtResponse): void {
    this._accessToken.set(res.id_token);
    this._isAuthenticated.set(true);
  }

  private resetSession(): void {
    this._accessToken.set(null);
    this._account.set(null);
    this._isAuthenticated.set(false);
    clearLegacyStoredTokens();
    this.router.navigate(['/login']);
  }
}
