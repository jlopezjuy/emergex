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

export interface MenuSection {
  id: string;
  label: string;
  icon: string;
  itemIds: string[];
}

export const DEFAULT_MENU_SECTIONS: MenuSection[] = [
  {
    id: 'sec-operacion',
    label: 'Operación',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    itemIds: [
      'dashboard',
      'operations',
      'emergency-dispatch',
      'incidentes',
      'events',
      'fleet',
      'ambulancias',
      'tripulacion',
      'turnos'
    ]
  },
  {
    id: 'sec-clinica',
    label: 'Clínica',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
    itemIds: [
      'clinico',
      'internacion',
      'auditoria-medica',
      'encuestas'
    ]
  },
  {
    id: 'sec-administracion',
    label: 'Administración',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>',
    itemIds: [
      'patients',
      'grupos-familiares',
      'institutions',
      'obras-sociales',
      'plans',
      'facturacion',
      'prefacturacion',
      'cuentas-corrientes',
      'compras',
      'tesoreria',
      'inventario',
      'management',
      'administracion',
      'proveedores'
    ]
  },
  {
    id: 'sec-configuracion',
    label: 'Configuración',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    itemIds: [
      'staff',
      'zonas-tarifas',
      'admin-global',
      'settings'
    ]
  }
];

@Injectable({ providedIn: 'root' })
export class MenuService {
  private http = inject(HttpClient);

  getMenu(): Observable<IMenuItem[]> {
    return this.http.get<IMenuItem[]>(`${environment.apiUrl}/api/account/menu`);
  }

  groupMenuItems(items: IMenuItem[]): IMenuItem[] {
    const sectionMap = new Map<string, IMenuItem[]>();

    DEFAULT_MENU_SECTIONS.forEach((sec) => {
      sectionMap.set(sec.id, []);
    });

    const unmapped: IMenuItem[] = [];

    items.forEach((item) => {
      let matchedSecId: string | null = null;
      for (const sec of DEFAULT_MENU_SECTIONS) {
        if (sec.itemIds.includes(item.id)) {
          matchedSecId = sec.id;
          break;
        }
      }

      if (matchedSecId) {
        sectionMap.get(matchedSecId)!.push(item);
      } else {
        unmapped.push(item);
      }
    });

    const result: IMenuItem[] = [];

    DEFAULT_MENU_SECTIONS.forEach((sec, idx) => {
      const children = sectionMap.get(sec.id) || [];
      if (children.length > 0) {
        result.push({
          id: sec.id,
          label: sec.label,
          title: sec.label,
          icon: sec.icon,
          order: (idx + 1) * 10,
          children
        });
      }
    });

    if (unmapped.length > 0) {
      result.push({
        id: 'sec-otros',
        label: 'Otros',
        title: 'Otros',
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>',
        order: 999,
        children: unmapped
      });
    }

    return result;
  }
}
