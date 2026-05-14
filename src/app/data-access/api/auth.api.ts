import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, JwtToken, AccountDTO } from '../dto/account.dto';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  login(req: LoginRequest): Observable<JwtToken> {
    return this.http.post<JwtToken>(`${this.base}/api/authenticate`, req);
  }

  getAccount(): Observable<AccountDTO> {
    return this.http.get<AccountDTO>(`${this.base}/api/account`);
  }
}
