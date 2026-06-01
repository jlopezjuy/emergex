import {
  Component, input, output, signal, inject, DestroyRef, OnChanges, SimpleChanges
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { InstitutionsApiService } from '../../../../data-access/api/institutions.api';
import { ContratoCoberturaPlanDTO, EstadoInstitucion, FacturacionContratoDTO, GenerarFacturaContratoRequest, InstitucionEstadoCuentaDTO, InstitucionMiembroItem, InstitutionType } from '../../../../data-access/dto/institution.dto';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

export interface DrawerInstitution {
  id: string;
  name: string;
  razonSocial: string;
  cuit: string;
  type: InstitutionType;
  status: EstadoInstitucion;
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
  imports: [StatusBadgeComponent, DecimalPipe, FormsModule],
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
  readonly planes = signal<ContratoCoberturaPlanDTO[]>([]);
  readonly loadingPlanes = signal(false);
  readonly facturasContrato = signal<FacturacionContratoDTO[]>([]);
  readonly loadingFacturas = signal(false);
  readonly estadoCuenta = signal<InstitucionEstadoCuentaDTO | null>(null);
  readonly loadingEstadoCuenta = signal(false);
  readonly savingEstado = signal(false);
  readonly estadoError = signal<string | null>(null);
  readonly showFacturaForm = signal(false);
  readonly savingFactura = signal(false);

  readonly importandoPadron = signal(false);
  readonly padronError = signal<string | null>(null);
  readonly padronSuccess = signal<string | null>(null);

  readonly estadoOpciones: { value: EstadoInstitucion; label: string }[] = [
    { value: 'ACTIVA',               label: 'Activa' },
    { value: 'PENDIENTE_ACTIVACION', label: 'Pendiente activación' },
    { value: 'SUSPENDIDA',           label: 'Suspendida' },
    { value: 'BAJA',                 label: 'Baja' },
  ];

  facturaForm: GenerarFacturaContratoRequest = {
    contratoId: 0, periodoDesde: '', periodoHasta: '', observaciones: '',
  };

  readonly statusChanged = output<{ id: string; nuevoEstado: EstadoInstitucion }>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['institution']) {
      this.activeTab.set('general');
      this.miembros.set([]);
      this.planes.set([]);
      this.facturasContrato.set([]);
      this.estadoCuenta.set(null);
    }
  }

  onTabChange(tab: 'general' | 'contrato' | 'miembros'): void {
    this.activeTab.set(tab);
    if (tab === 'miembros' && this.miembros().length === 0) {
      this.loadMiembros();
    }
    if (tab === 'contrato') {
      const contratoId = this.institution().contract?.id;
      if (contratoId && this.planes().length === 0) {
        this.loadPlanes(contratoId);
      }
      if (contratoId && this.facturasContrato().length === 0) {
        this.loadFacturasContrato(contratoId);
      }
      if (!this.estadoCuenta()) {
        this.loadEstadoCuenta();
      }
    }
  }

  private loadEstadoCuenta(): void {
    const id = Number(this.institution().id);
    if (!id) return;
    this.loadingEstadoCuenta.set(true);
    this.api.getEstadoCuentaInstitucion(id).pipe(
      catchError(() => of(null)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(dto => {
      this.estadoCuenta.set(dto);
      this.loadingEstadoCuenta.set(false);
    });
  }

  private loadPlanes(contratoId: number): void {
    this.loadingPlanes.set(true);
    this.api.getPlanesByContrato(contratoId).pipe(
      catchError(() => of([])),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(list => {
      this.planes.set(list);
      this.loadingPlanes.set(false);
    });
  }

  private loadFacturasContrato(contratoId: number): void {
    this.loadingFacturas.set(true);
    this.api.getFacturasByContrato(contratoId).pipe(
      catchError(() => of([])),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(list => {
      this.facturasContrato.set(list);
      this.loadingFacturas.set(false);
    });
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

  onCambiarEstado(nuevoEstado: EstadoInstitucion): void {
    const id = Number(this.institution().id);
    if (!id || this.savingEstado()) return;
    this.estadoError.set(null);
    this.savingEstado.set(true);
    this.api.cambiarEstadoInstitucion(id, nuevoEstado).pipe(
      catchError((err) => {
        const msg = err?.error?.detail ?? err?.error?.title ?? 'No se pudo cambiar el estado.';
        this.estadoError.set(msg);
        this.savingEstado.set(false);
        return of(null);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(res => {
      if (res === null && this.estadoError()) return; // catchError already handled
      this.savingEstado.set(false);
      this.statusChanged.emit({ id: this.institution().id, nuevoEstado: res?.status ?? nuevoEstado });
    });
  }

  abrirFormFactura(): void {
    const contratoId = this.institution().contract?.id;
    if (!contratoId) return;
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0];
    this.facturaForm = { contratoId, periodoDesde: primerDia, periodoHasta: ultimoDia, observaciones: '' };
    this.showFacturaForm.set(true);
  }

  confirmarFactura(): void {
    if (this.savingFactura() || !this.facturaForm.periodoDesde || !this.facturaForm.periodoHasta) return;
    this.savingFactura.set(true);
    this.api.generarFacturaInstitucional(this.facturaForm).pipe(
      catchError(() => of(null)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(result => {
      this.savingFactura.set(false);
      if (result) {
        this.facturasContrato.update(list => [result, ...list]);
        this.loadEstadoCuenta();
        this.showFacturaForm.set(false);
      }
    });
  }

  onPadronFileSelected(event: any): void {
    const files = event.target?.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    this.importarPadron(file);
  }

  importarPadron(file: File): void {
    const contratoId = this.institution().contract?.id;
    if (!contratoId || this.importandoPadron()) return;

    this.importandoPadron.set(true);
    this.padronError.set(null);
    this.padronSuccess.set(null);

    this.api.importarPadron(contratoId, file).pipe(
      catchError(err => {
        this.padronError.set(err?.error?.detail ?? err?.error?.title ?? 'Error al importar el padrón de beneficiarios B2B.');
        this.importandoPadron.set(false);
        return of(null);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(res => {
      this.importandoPadron.set(false);
      if (res === null) return;
      this.padronSuccess.set('Padrón de beneficiarios importado y procesado exitosamente.');
      this.loadMiembros(); // Recargar miembros del padrón corporativo
    });
  }

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
