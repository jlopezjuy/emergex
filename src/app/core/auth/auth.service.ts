import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Account } from './models/account.model';
import { LoginCredentials } from './models/login.model';

const JWT_KEY = 'emergex_jwt';

interface JwtResponse {
  id_token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _account = signal<Account | null>(null);
  private _isAuthenticated = signal<boolean>(!!localStorage.getItem(JWT_KEY));

  readonly currentAccount = this._account.asReadonly();
  readonly isAuthenticated = this._isAuthenticated.asReadonly();

  login(credentials: LoginCredentials): Observable<Account> {
    return this.http
      .post<JwtResponse>(`${environment.apiUrl}/api/authenticate`, {
        username: credentials.username,
        password: credentials.password,
        rememberMe: credentials.rememberMe,
      })
      .pipe(
        tap((res) => {
          localStorage.setItem(JWT_KEY, res.id_token);
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
    localStorage.removeItem(JWT_KEY);
    this._account.set(null);
    this._isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(JWT_KEY);
  }
}
