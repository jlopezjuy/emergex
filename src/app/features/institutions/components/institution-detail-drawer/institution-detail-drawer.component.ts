import {
  Component, input, output, signal, inject, DestroyRef, OnChanges, SimpleChanges
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { InstitutionsApiService } from '../../../../data-access/api/institutions.api';
import { InstitucionMiembroItem } from '../../../../data-access/dto/institution.dto';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

export interface DrawerInstitution {
  id: string;
  name: string;
  razonSocial: string;
  cuit: string;
  type: string;
  status: 'activa' | 'inactiva';
  plan: string;
  email: string;
  phone: string;
  adminContact: string;
  opsContact: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  members: number;
  sinceMonth: string;
  contract: {
    id?: number;
    code: string;
    plan: string;
    from: string;
    to: string;
    status: 'active' | 'suspended' | 'ended' | 'draft';
    monthlyPrice: number;
    monthlyCap: number;
    kpiMinutes: number;
    conditions: string;
  };
}

@Component({
  selector: 'app-institution-detail-drawer',
  standalone: true,
  imports: [StatusBadgeComponent],
  templateUrl: './institution-detail-drawer.component.html',
})
export class InstitutionDetailDrawerComponent implements OnChanges {
  private readonly api = inject(InstitutionsApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly institution = input.required<DrawerInstitution>();
  readonly planName = input<string>('');
  readonly planColor = input<string>('var(--text-muted)');

  readonly close = output<void>();
  readonly edit = output<DrawerInstitution>();
  readonly openContract = output<DrawerInstitution>();

  readonly activeTab = signal<'general' | 'contrato' | 'miembros'>('general');
  readonly miembros = signal<InstitucionMiembroItem[]>([]);
  readonly loadingMiembros = signal(false);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['institution']) {
      this.activeTab.set('general');
      this.miembros.set([]);
    }
  }

  onTabChange(tab: 'general' | 'contrato' | 'miembros'): void {
    this.activeTab.set(tab);
    if (tab === 'miembros' && this.miembros().length === 0) {
      this.loadMiembros();
    }
  }

  private loadMiembros(): void {
    const id = Number(this.institution().id);
    if (!id) return;
    this.loadingMiembros.set(true);
    this.api.getMiembros(id).pipe(
      catchError(() => of([])),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(list => {
      this.miembros.set(list);
      this.loadingMiembros.set(false);
    });
  }

  onClose(): void { this.close.emit(); }
  onEdit(): void { this.edit.emit(this.institution()); }
  onOpenContract(): void { this.openContract.emit(this.institution()); }

  contractStatusLabel(s: string): string {
    const map: Record<string, string> = {
      active: 'Activo', suspended: 'Suspendido', ended: 'Finalizado', draft: 'Borrador',
    };
    return map[s] ?? s;
  }

  contractStatusColor(s: string): string {
    const map: Record<string, string> = {
      active: 'var(--accent-emerald)',
      suspended: 'var(--accent-amber)',
      ended: 'var(--text-muted)',
      draft: 'var(--accent-blue)',
    };
    return map[s] ?? 'var(--text-muted)';
  }

  fmtCurrency(n: number): string {
    return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0 });
  }

  fmtDate(s?: string): string {
    if (!s) return '—';
    const parts = s.split('T')[0].split('-');
    if (parts.length < 3) return s;
    const [y, m, d] = parts;
    const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${d} ${months[parseInt(m) - 1]} ${y}`;
  }

  avatarOf(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
  }

  typeLabel(type: string): string {
    const map: Record<string, string> = {
      colegio: 'Colegio', universidad: 'Universidad', empresa: 'Empresa',
      club: 'Club', hospital: 'Hospital', gobierno: 'Gobierno', ong: 'ONG', otro: 'Otro',
    };
    return map[type] ?? type;
  }
}
