import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EmpresaDTO } from '../dto/empresa.dto';

export interface PagedResult<T> {
  data: T[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class EmpresaApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/empresas`;

  getAll(opts: { page: number; size: number; search?: string }): Observable<PagedResult<EmpresaDTO>> {
    let params = new HttpParams()
      .set('page', opts.page)
      .set('size', opts.size)
      .set('sort', 'nombre,asc');

    if (opts.search?.trim()) {
      params = params.set('nombre.contains', opts.search.trim());
    }

    return this.http
      .get<EmpresaDTO[]>(this.base, { params, observe: 'response' })
      .pipe(
        map((res: HttpResponse<EmpresaDTO[]>) => ({
          data: res.body ?? [],
          total: Number(res.headers.get('X-Total-Count') ?? 0),
        })),
      );
  }

  getById(id: number): Observable<EmpresaDTO> {
    return this.http.get<EmpresaDTO>(`${this.base}/${id}`);
  }

  create(empresa: EmpresaDTO): Observable<EmpresaDTO> {
    return this.http.post<EmpresaDTO>(this.base, empresa);
  }

  update(id: number, empresa: EmpresaDTO): Observable<EmpresaDTO> {
    return this.http.put<EmpresaDTO>(`${this.base}/${id}`, empresa);
  }

  partialUpdate(id: number, empresa: Partial<EmpresaDTO>): Observable<EmpresaDTO> {
    return this.http.patch<EmpresaDTO>(`${this.base}/${id}`, empresa);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
