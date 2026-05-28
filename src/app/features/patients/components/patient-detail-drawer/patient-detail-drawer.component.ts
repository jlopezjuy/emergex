import { Component, input, output } from '@angular/core';
import { PatientRow } from '../../patients.component';
import { FichaAfiliadoDTO, FacturaDTO, CoberturaFichaDTO, ConsumoMensualDTO, OrdenMedicaDTO } from '../../../../data-access/dto/patient.dto';

@Component({
  selector: 'app-patient-detail-drawer',
  standalone: true,
  templateUrl: './patient-detail-drawer.component.html',
  styleUrl: './patient-detail-drawer.component.scss',
})
export class PatientDetailDrawerComponent {
  // ── Inputs (Signals) ──
  readonly patient  = input.required<PatientRow>();
  readonly ficha    = input<FichaAfiliadoDTO | null>(null);
  readonly facturas = input<FacturaDTO[]>([]);
  readonly consumo  = input<ConsumoMensualDTO | null>(null);
  readonly ordenes  = input<OrdenMedicaDTO[]>([]);
  readonly loading  = input<boolean>(false);

  // ── Outputs ──
  readonly close                = output<void>();
  readonly edit                 = output<PatientRow>();
  readonly editFamily           = output<PatientRow>();
  readonly registerPago         = output<PatientRow>();
  readonly generarFactura       = output<number>();
  readonly traspasarTitularidad = output<number>();
  readonly cambiarPlan          = output<PatientRow>();

  // ── Helper methods ──
  onClose(): void {
    this.close.emit();
  }

  onEdit(): void {
    this.edit.emit(this.patient());
  }

  onEditFamily(): void {
    this.editFamily.emit(this.patient());
  }

  onRegisterPago(): void {
    this.registerPago.emit(this.patient());
  }

  /**
   * Propaga el evento para generar de forma manual la factura del mes corriente
   * para el afiliado seleccionado en detalle.
   */
  onGenerarFactura(): void {
    this.generarFactura.emit(this.patient().pacienteId);
  }

  onCambiarPlan(): void {
    this.cambiarPlan.emit(this.patient());
  }

  onTraspasarTitularidad(): void {
    const f = this.ficha();
    if (f && f.grupoFamiliarId) {
      this.traspasarTitularidad.emit(f.grupoFamiliarId);
    }
  }

  hasActiveTitular(): boolean {
    const f = this.ficha();
    if (!f || !f.grupoFamiliarId) return true;
    if (!f.miembrosGrupo || f.miembrosGrupo.length === 0) return false;
    return f.miembrosGrupo.some(m => m.rol === 'TITULAR' && m.estado === 'ACTIVA');
  }

  avatarOf(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
  }

  fmtCurrency(n: number): string {
    return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0 });
  }

  fmtDate(s: string | undefined): string {
    if (!s) return '—';
    const parts = s.split('T')[0].split('-');
    if (parts.length < 3) return s;
    const [y, m, d] = parts;
    const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${d} ${months[parseInt(m) - 1]} ${y}`;
  }

  consumoPct(consumido: number, maximo: number): number {
    if (!maximo || maximo <= 0) return 0;
    return Math.min(100, Math.round((consumido / maximo) * 100));
  }

  cobOf(ficha: FichaAfiliadoDTO | null): CoberturaFichaDTO | null {
    return ficha?.cobertura ?? null;
  }

  getPlanFeatures(tier?: string): string[] {
    const t = tier?.toLowerCase() ?? 'basico';
    if (t === 'premium') {
      return ['Hasta 6 dependientes', 'Urgencias premium ALS', 'Ambulancias ilimitadas', 'Internación cubierta', 'Telemedicina 24/7'];
    }
    if (t === 'medio' || t === 'familiar') {
      return ['Hasta 4 dependientes', 'Urgencias 24/7', '3 ambulancias/mes', 'Consultas especialistas'];
    }
    return ['Consultas generales', 'Urgencias básicas', '1 ambulancia/mes'];
  }

  getMontoCuota(ficha: FichaAfiliadoDTO | null): number {
    if (!ficha?.cobertura) return 0;
    // Use the real agreed price when the backend provides it
    if (ficha.cobertura.precioMensualAcordado) {
      return ficha.cobertura.precioMensualAcordado;
    }
    // Fallback to tier-based approximation until backend wires up precioMensualAcordado
    const nivel = ficha.cobertura.nivel?.toLowerCase() ?? 'basico';
    if (nivel === 'premium') return 54800;
    if (nivel === 'medio' || nivel === 'familiar') return 32400;
    return 18500;
  }

  getProximoVencimiento(): string {
    const facturasVencidas = this.facturas().filter(f => f.estado !== 'PAGADA');
    if (facturasVencidas.length > 0) {
      return this.fmtDate(facturasVencidas[facturasVencidas.length - 1].fechaEmision);
    }
    if (this.facturas().length > 0) {
      const ultima = this.facturas()[0];
      if (ultima.fechaEmision) {
        const d = new Date(ultima.fechaEmision.split('T')[0] + 'T00:00:00');
        d.setMonth(d.getMonth() + 1);
        return this.fmtDate(d.toISOString());
      }
    }
    return '—';
  }

  getProximoVencimientoDetalle(status: 'al-dia' | 'deuda'): string {
    const facturasVencidas = this.facturas().filter(f => f.estado !== 'PAGADA');
    if (status === 'deuda' && facturasVencidas.length > 0) {
      return '⚠ Vencido';
    }
    if (this.facturas().length > 0) {
      return 'al día';
    }
    return 'sin facturas';
  }

  fmtPeriodo(desde?: string, hasta?: string): string {
    if (!desde) return '—';
    const d = new Date(desde.split('T')[0] + 'T00:00:00');
    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  }
}
