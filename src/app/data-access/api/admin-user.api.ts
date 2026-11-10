import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminUserDTO, CreateEmpresaUserRequest, UsuarioEmpresaItem } from '../dto/admin-user.dto';
import { PagedResult } from './empresa.api';

@Injectable({ providedIn: 'root' })
export class AdminUserApiService {
  private http = inject(HttpClient);
  private adminBase = `${environment.apiUrl}/api/admin`;

  getByEmpresa(
    empresaId: number,
    opts: { page: number; size: number; search?: string },
  ): Observable<PagedResult<UsuarioEmpresaItem>> {
    let params = new HttpParams()
      .set('page', opts.page)
      .set('size', opts.size)
      .set('sort', 'id,asc');

    if (opts.search?.trim()) {
      params = params.set('search', opts.search.trim());
    }

    return this.http
      .get<UsuarioEmpresaItem[]>(`${this.adminBase}/empresas/${empresaId}/users`, {
        params,
        observe: 'response',
      })
      .pipe(
        map((res: HttpResponse<UsuarioEmpresaItem[]>) => ({
          data: res.body ?? [],
          total: Number(res.headers.get('X-Total-Count') ?? 0),
        })),
      );
  }

  createInEmpresa(empresaId: number, req: CreateEmpresaUserRequest): Observable<UsuarioEmpresaItem> {
    return this.http.post<UsuarioEmpresaItem>(`${this.adminBase}/empresas/${empresaId}/users`, req);
  }

  updateUser(login: string, dto: AdminUserDTO): Observable<AdminUserDTO> {
    return this.http.put<AdminUserDTO>(`${this.adminBase}/users/${login}`, dto);
  }

  updateUserInEmpresa(empresaId: number, login: string, item: UsuarioEmpresaItem): Observable<UsuarioEmpresaItem> {
    return this.http.put<UsuarioEmpresaItem>(`${this.adminBase}/empresas/${empresaId}/users/${login}`, item);
  }

  setPassword(login: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.adminBase}/users/${login}/password`, { newPassword });
  }
}

