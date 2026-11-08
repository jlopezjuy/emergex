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
      'zonas-tarifas',
      'cuentas-corrientes',
      'compras',
      'tesoreria',
      'inventario',
      'management',
      'administracion',
      'proveedores',
      'reportes-admin'
    ]
  },
  {
    id: 'sec-configuracion',
    label: 'Configuración',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    itemIds: [
      'staff',
      'admin-global',
      'settings'
    ]
  }
];

/** Ícono de trazo de 24x24, la misma familia que usan las secciones y los ítems agregados en el cliente. */
function trazo(contenido: string): string {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${contenido}</svg>`;
}

/**
 * El backend (`/api/account/menu`) manda emoji como ícono. Se reemplazan en el cliente por SVG de
 * trazo para que todo el menú use una sola familia de íconos (H-17).
 */
const ICONOS_MENU: Record<string, string> = {
  'dashboard': trazo('<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'),
  'turnos': trazo('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
  'events': trazo('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01"/>'),
  'map': trazo('<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>'),
  'historial': trazo('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
  'fleet': trazo('<path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>'),
  'tripulacion': trazo('<path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>'),
  'staff': trazo('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'),
  'patients': trazo('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
  'institutions': trazo('<path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M9 21v-4h6v4M10 9h4M12 7v4"/>'),
  'hospitals': trazo('<path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><path d="M12 7v6M9 10h6"/>'),
  'plans': trazo('<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/>'),
  'facturacion': trazo('<path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 1 .67V2l-1 .67L16 2l-3 2-3-2-3 2z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/>'),
  'compras': trazo('<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>'),
  'cuentas-corrientes': trazo('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="14" y2="11"/>'),
  'obras-sociales': trazo('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v6M9 11h6"/>'),
  'internacion': trazo('<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20"/><path d="M6 8v9"/>'),
  'management': trazo('<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>'),
  'analytics': trazo('<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>'),
  'encuestas': trazo('<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'),
  'encuestas-mis-llamadas': trazo('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>'),
  'communications': trazo('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
  'admin-global': trazo('<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>'),
};

const ICONO_GENERICO = trazo('<circle cx="12" cy="12" r="3"/>');

function iconoDeFamilia(item: IMenuItem): string {
  if (item.icon?.trim().startsWith('<svg')) {
    return item.icon;
  }
  return ICONOS_MENU[item.id] ?? ICONO_GENERICO;
}

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

    items.forEach((original) => {
      const item: IMenuItem = { ...original, icon: iconoDeFamilia(original) };
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
