import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Account } from './models/account.model';
import { LoginCredentials } from './models/login.model';

import { getSecureToken, saveSecureToken, removeSecureToken } from './auth.storage';
import { JWT_STORAGE_KEY } from './auth.constants';

interface JwtResponse {
  id_token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _account = signal<Account | null>(null);
  private _isAuthenticated = signal<boolean>(!!getSecureToken());

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
          saveSecureToken(res.id_token);
          this._isAuthenticated.set(true);
        }),
        switchMap(() => this.fetchAccount()),
      );
  }

  switchEnterprise(empresaId: number): Observable<Account> {
    return this.http
      .post<JwtResponse>(`${environment.apiUrl}/api/account/switch-enterprise/${empresaId}`, {})
      .pipe(
        tap((res) => {
          saveSecureToken(res.id_token);
          this._isAuthenticated.set(true);
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
    removeSecureToken();
    this._account.set(null);
    this._isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return getSecureToken();
  }

  refreshToken(): Observable<{ id_token: string }> {
    const token = this.getToken();
    return this.http.post<{ id_token: string }>(
      `${environment.apiUrl}/api/refresh`,
      { token }
    ).pipe(
      tap(res => {
        saveSecureToken(res.id_token);
      })
    );
  }
}
