import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface IMenuItem {
  id: string;
  label: string;
  title: string;
  icon: string;
  route?: string | null;
  order?: number | null;
  children?: IMenuItem[];
}

@Injectable({ providedIn: 'root' })
export class MenuService {
  private http = inject(HttpClient);

  getMenu(): Observable<IMenuItem[]> {
    return this.http.get<IMenuItem[]>(`${environment.apiUrl}/api/account/menu`);
  }
}
