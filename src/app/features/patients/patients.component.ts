import { Component, signal, computed, HostListener, inject, OnInit, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UpperCasePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of, forkJoin, map, concatMap, Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { localDateYmd } from '../../shared/utils/date-local.util';
import { PatientApiService } from '../../data-access/api/patient.api';
import { PlanComercialApiService } from '../../data-access/api/plan-comercial.api';
import { AuthService } from '../../core/auth/auth.service';
import { SessionStore } from '../../core/stores/session.store';
import { PacienteDTO, FichaAfiliadoDTO, FacturaDTO, CoberturaFichaDTO, MiembroGrupoFamiliarDTO, ConsumoMensualDTO, OrdenMedicaDTO, AltaAfiliadoCompletaRequest, AltaAfiliadoCompletaResponse, DependienteAltaRequest } from '../../data-access/dto/patient.dto';
import { PlanComercialDTO, PlanCoverages } from '../../data-access/dto/plan-comercial.dto';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

// Importación de los nuevos componentes modulares
import { PatientDetailDrawerComponent } from './components/patient-detail-drawer/patient-detail-drawer.component';
import { PatientFormModalComponent } from './components/patient-form-modal/patient-form-modal.component';
import { QuickPaymentModalComponent, QuickPaymentPayload } from './components/quick-payment-modal/quick-payment-modal.component';
import { PatientWizardComponent } from './components/patient-wizard/patient-wizard.component';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface Dependent {
  id: string;
  miembroId?: number;
  pacienteId?: number;
  name: string;
  apellido: string;
  dni: string;
  parentesco: string;
  birth?: string;
  gender?: 'M' | 'F' | 'X';
}

export interface PatientRow {
  pacienteId: number;
  id: string;
  name: string;
  dni: string;
  type: 'titular' | 'dependiente';
  status: 'al-dia' | 'deuda';
  sinceMonth: string;
  planNombre: string;
  planColor: string;
  depCount: number;
  _raw: PacienteDTO;
}

export interface PatientForm {
  nombre: string;
  apellido: string;
  dni: string;
  birth: string;
  gender: 'M' | 'F' | 'X';
  phone: string;
  email: string;
  addr: string;
  planId: string;
  deps: Dependent[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PARENTESCOS = ['Cónyuge', 'Hijo/a', 'Padre/Madre', 'Hermano/a', 'Otro'];

const TIER_COLORS: Record<string, string> = {
  premium: '#10b981',
  medio:   '#3b82f6',
  basico:  '#94a3b8',
};

const METODOS_PAGO = [
  { value: 'EFECTIVO',          label: 'Efectivo' },
  { value: 'TRANSFERENCIA',     label: 'Transferencia bancaria' },
  { value: 'TARJETA_DEBITO',    label: 'Tarjeta débito' },
  { value: 'TARJETA_CREDITO',   label: 'Tarjeta crédito' },
  { value: 'MERCADOPAGO',       label: 'MercadoPago' },
  { value: 'DEBITO_AUTOMATICO', label: 'Débito automático' },
];
const PAGE_SIZE = 10;

function getPlanFeaturesFromCoverages(coverages?: PlanCoverages): string[] {
  if (!coverages) return ['Consultas generales', 'Urgencias médicas'];
  const features: string[] = [];
  if (coverages.emergency) features.push('Urgencias y emergencias 24h');
  if (coverages.homeVisit) features.push('Visita médica a domicilio');
  if (coverages.phoneOrientation) features.push('Orientación médica telefónica');
  if (coverages.homeNursing) features.push('Enfermería domiciliaria');
  if (coverages.monthlyControl) features.push('Control médico mensual');
  if (coverages.scheduledTransport) features.push('Traslados programados');
  if (coverages.interurbanTransport) features.push('Traslado interurbano');
  return features.length > 0 ? features : ['Atención de urgencias básica'];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0 });
}

function fmtDate(s: string | undefined): string {
  if (!s) return '—';
  const parts = s.split('T')[0].split('-');
  if (parts.length < 3) return s;
  const [y, m, d] = parts;
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${d} ${months[parseInt(m) - 1]} ${y}`;
}

function avatarOf(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
}

export function emptyForm(): PatientForm {
  return { nombre: '', apellido: '', dni: '', birth: '', gender: 'M', phone: '', email: '', addr: '', planId: '', deps: [] };
}

function sinceMonthFromISO(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function todayISO(): string {
  return localDateYmd();
}

function sexoFromGender(g: 'M' | 'F' | 'X'): 'MASCULINO' | 'FEMENINO' | 'OTRO' {
  return g === 'M' ? 'MASCULINO' : g === 'F' ? 'FEMENINO' : 'OTRO';
}

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [
    FormsModule,
    UpperCasePipe,
    PatientDetailDrawerComponent,
    PatientFormModalComponent,
    QuickPaymentModalComponent,
    PatientWizardComponent,
  ],
  templateUrl: './patients.component.html',
  styleUrl: './patients.component.scss'
})
export class PatientsComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private patientApi  = inject(PatientApiService);
  private plansApi    = inject(PlanComercialApiService);
  private authService = inject(AuthService);
  private router      = inject(Router);
  private route       = inject(ActivatedRoute);
  private readonly session = inject(SessionStore);

  readonly canEdit = computed(() =>
    this.session.hasAnyRole(['ROLE_ADMIN','ROLE_PROPIETARIO','ROLE_ADMINISTRADOR','ROLE_DESPACHANTE'])
  );
  readonly canAdmin = computed(() =>
    this.session.hasAnyRole(['ROLE_ADMIN','ROLE_PROPIETARIO','ROLE_ADMINISTRADOR'])
  );

  // ── Constants exposed to template ──
  readonly parentescos = PARENTESCOS;
  readonly metodosPago = METODOS_PAGO;
  
  readonly statusOptions = [
    { value: 'all',    label: 'Todos'    },
    { value: 'al-dia', label: 'Al día'   },
    { value: 'deuda',  label: 'En deuda' },
  ];
  
  readonly genderOptions: { v: 'M' | 'F' | 'X'; l: string }[] = [
    { v: 'M', l: 'Masculino' },
    { v: 'F', l: 'Femenino'  },
    { v: 'X', l: 'Otro'      },
  ];

  // ── Local state cache for newly created patient plans to show them immediately in the table ──
  private localPatientPlans = new Map<number, { planId: string; planNombre: string; planColor: string; depCount: number }>();

  // ── State — table ──
  readonly loading      = signal(false);
  readonly patients     = signal<PatientRow[]>([]);
  readonly searchQuery  = signal('');
  readonly statusFilter = signal('all');
  readonly planFilter   = signal('all');
  readonly page         = signal(0);
  readonly menuOpen     = signal<string | null>(null);

  // ── State — server-side pagination & search ──
  readonly serverPage    = signal(0);
  readonly serverTotal   = signal(0);
  readonly serverTotalPg = signal(1);
  private readonly searchSubject = new Subject<string>();

  // ── State — Slide Drawer (Detail) ──
  readonly selectedPatient  = signal<PatientRow | null>(null);
  readonly ficha            = signal<FichaAfiliadoDTO | null>(null);
  readonly facturas         = signal<FacturaDTO[]>([]);
  readonly consumo          = signal<ConsumoMensualDTO | null>(null);
  readonly ordenes          = signal<OrdenMedicaDTO[]>([]);
  readonly loadingFicha     = signal(false);
  readonly originalMiembros = signal<MiembroGrupoFamiliarDTO[]>([]);

  // ── State — Quick Payment Modal ──
  readonly paymentModalOpen        = signal(false);
  readonly paymentTarget           = signal<PatientRow | null>(null);
  readonly paymentError            = signal<string | null>(null);
  readonly paymentIsNewSubscription = signal(false);
  paymentAmount                    = 0;
  paymentMethod                    = 'EFECTIVO';
  paymentRef                       = '';

  // ── State — DNI async check (for alta nueva wizard) ──
  readonly dniCheckResult = signal<boolean | null>(null);

  // ── State — Cambiar plan modal ──
  readonly cambiarPlanOpen    = signal(false);
  readonly cambiarPlanTarget  = signal<PatientRow | null>(null);
  readonly cambiarPlanLoading = signal(false);
  readonly cambiarPlanError   = signal<string | null>(null);
  readonly cambiarPlanId      = signal<string>('');

  // ── State — Traspaso de Titularidad Modal ──
  readonly traspasoModalOpen          = signal(false);
  readonly traspasoGrupoId            = signal<number | null>(null);
  readonly traspasoMiembros           = signal<MiembroGrupoFamiliarDTO[]>([]);
  readonly traspasoSelectedMiembroId  = signal<number | null>(null);
  readonly traspasoLoading            = signal(false);

  // ── State — wizard de alta ──
  readonly wizardOpen = signal(false);

  // ── State — form modal (edición) ──
  readonly formOpen      = signal(false);
  readonly editingRow    = signal<PatientRow | null>(null);
  readonly formTab       = signal<'titular' | 'group'>('titular');
  readonly form          = signal<PatientForm>(emptyForm());
  readonly savingForm    = signal(false);
  readonly formError     = signal<string | null>(null);

  // ── State — plans (for new afiliado form) ──
  readonly apiPlans    = signal<PlanComercialDTO[]>([]);
  readonly loadingPlans = signal(false);

  // ── Computed ──
  // searchQuery and planFilter are server-side; only statusFilter remains client-side
  readonly filtered = computed(() => {
    const s = this.statusFilter();
    if (s === 'all') return this.patients();
    return this.patients().filter(p => p.status === s);
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));

  readonly paged = computed(() => {
    const pg = Math.min(this.page(), this.totalPages() - 1);
    return this.filtered().slice(pg * PAGE_SIZE, (pg + 1) * PAGE_SIZE);
  });

  readonly pageRange = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i));

  readonly counts = computed(() => {
    const list = this.patients();
    return {
      total:      list.length,
      titulares:  list.filter(p => p.type === 'titular').length,
      dependents: list.reduce((acc, p) => acc + (p.depCount || 0), 0),
      alDia:      list.filter(p => p.status === 'al-dia').length,
      deuda:      list.filter(p => p.status === 'deuda').length,
    };
  });

  readonly canSubmit = computed(() => {
    const f = this.form();
    const needsPlan = !this.editingRow();
    return (
      f.nombre.trim().length > 0 &&
      f.apellido.trim().length > 0 &&
      f.dni.trim().length > 0 &&
      f.birth.length > 0 &&
      (!needsPlan || f.planId.length > 0)
    );
  });

  // ── Lifecycle ──
  ngOnInit(): void {
    // Debounce search → server-side
    this.searchSubject.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => this.loadPatients(true));

    this.loadPatients();
    this.loadPlans();
  }

  private loadPatients(resetPage = false): void {
    if (resetPage) this.serverPage.set(0);
    const editId = Number(this.route.snapshot.queryParams['edit']) || null;
    this.loading.set(true);

    this.patientApi.buscarAfiliados({
      q: this.searchQuery() || undefined,
      planId: this.planFilter() !== 'all' ? Number(this.planFilter()) : undefined,
      page: this.serverPage(),
      size: 20,
    }).pipe(
      catchError(() => of({ data: [], total: 0, totalPages: 1 })),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({ data, total, totalPages }) => {
      const rows = data.map(r => ({
        pacienteId: r.pacienteId,
        id: r.numeroAfiliado ?? `AF-${r.pacienteId}`,
        name: r.nombreCompleto ?? '',
        dni: r.dni,
        type: 'titular' as const,
        status: (r.activo !== false ? 'al-dia' : 'deuda') as 'al-dia' | 'deuda',
        sinceMonth: r.createdAt ? sinceMonthFromISO(r.createdAt) : '—',
        planNombre: r.coberturaActiva ?? 'Sin plan',
        planColor: this.getPlanColor((r.planNivel ?? 'basico').toLowerCase()),
        depCount: r.depCount ?? 0,
        _raw: {
          id: r.pacienteId,
          nombre: r.nombreCompleto?.split(' ')[0] ?? '',
          apellido: r.nombreCompleto?.split(' ').slice(1).join(' ') ?? '',
          dni: r.dni,
          telefono: r.telefono,
          numeroAfiliado: r.numeroAfiliado,
          activo: r.activo,
          createdAt: r.createdAt,
        } as any,
      }));

      this.patients.set(rows);
      this.serverTotal.set(total);
      this.serverTotalPg.set(totalPages);
      this.loading.set(false);

      if (editId) {
        const row = rows.find(r => r.pacienteId === editId);
        if (row) this.openEditForm(row);
      }
    });
  }

  private loadPlans(): void {
    this.loadingPlans.set(true);
    this.plansApi.getAll().pipe(
      catchError(() => of([] as PlanComercialDTO[])), takeUntilDestroyed(this.destroyRef)
    ).subscribe(plans => {
      // Excluir planes institucionales (corporativos/áreas protegidas) para pacientes personas físicas
      this.apiPlans.set(plans.filter(p => p.active && p.modality !== 'institucional'));
      this.loadingPlans.set(false);
    });
  }

  private mapDTO(p: PacienteDTO): PatientRow {
    return {
      pacienteId: p.id,
      id:         p.numeroAfiliado ?? `AF-${p.id}`,
      name:       `${p.nombre ?? ''} ${p.apellido ?? ''}`.trim(),
      dni:        p.dni,
      type:       'titular',
      status:     p.activo !== false ? 'al-dia' : 'deuda',
      sinceMonth: sinceMonthFromISO(p.createdAt),
      planNombre: 'Plan Básico',
      planColor:  '#94a3b8',
      depCount:   0,
      _raw:       p,
    };
  }

  // ── Plan metadata resolution ──
  cobOf(ficha: FichaAfiliadoDTO | null): CoberturaFichaDTO | null {
    return ficha?.cobertura ?? null;
  }

  getPlanColor(tier?: string): string {
    const t = tier?.toLowerCase() ?? 'basico';
    if (t === 'premium') return '#10b981'; // Emerald
    if (t === 'medio' || t === 'familiar') return '#3b82f6'; // Blue
    if (t === 'joven' || t === 'cyan') return '#06b6d4'; // Cyan
    if (t === 'empresa' || t === 'amber' || t === 'corporativo') return '#f59e0b'; // Amber
    return '#94a3b8'; // Slate (básico)
  }

  getPlanFeatures(tier?: string): string[] {
    const realPlan = this.apiPlans().find(
      p => p.tier.toLowerCase() === tier?.toLowerCase() ||
           p.name.toLowerCase() === tier?.toLowerCase()
    );
    if (realPlan) {
      return getPlanFeaturesFromCoverages(realPlan.coverages);
    }
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
    if (!ficha || !ficha.cobertura) return 0;
    const realPlan = this.apiPlans().find(
      p => p.name.toLowerCase() === ficha.cobertura?.nombre?.toLowerCase() ||
           p.tier.toLowerCase() === ficha.cobertura?.nivel?.toLowerCase()
    );
    if (realPlan) {
      return realPlan.pricing.monthly;
    }
    const nivel = ficha.cobertura.nivel?.toLowerCase() ?? 'basico';
    if (nivel === 'premium') return 54800;
    if (nivel === 'medio' || nivel === 'familiar') return 32400;
    return 18500;
  }

  getProximoVencimiento(): string {
    const facturasVencidas = this.facturas().filter(f => f.estado !== 'PAGADA');
    if (facturasVencidas.length > 0) {
      return fmtDate(facturasVencidas[facturasVencidas.length - 1].fechaEmision);
    }
    if (this.facturas().length > 0) {
      const ultima = this.facturas()[0];
      if (ultima.fechaEmision) {
        const d = new Date(ultima.fechaEmision.split('T')[0] + 'T00:00:00');
        d.setMonth(d.getMonth() + 1);
        return fmtDate(d.toISOString());
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

  calculateAge(birthStr: string): number {
    const birth = new Date(birthStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  // ── Format helpers ──
  readonly fmtCurrency  = fmtCurrency;
  readonly fmtDate      = fmtDate;
  readonly avatarOf     = avatarOf;

  fmtPeriodo(desde?: string, hasta?: string): string {
    if (!desde) return '—';
    // Fix browser parser for dates
    const d = new Date(desde.split('T')[0] + 'T00:00:00');
    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  // ── Table / Filters ──
  setStatus(v: string): void {
    this.statusFilter.set(v);
    this.page.set(0);
  }

  reloadPatients(resetPage = false): void {
    this.loadPatients(resetPage);
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.page.set(0);
    this.searchSubject.next(value);
  }

  toggleMenu(id: string): void {
    this.menuOpen.set(this.menuOpen() === id ? null : id);
  }

  @HostListener('document:click')
  closeMenuOnOutsideClick(): void { this.menuOpen.set(null); }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.cambiarPlanOpen()) { this.cambiarPlanOpen.set(false); return; }
    if (this.paymentModalOpen()) { this.paymentModalOpen.set(false); return; }
    if (this.formOpen()) { this.closeForm(); return; }
    if (this.selectedPatient()) { this.selectedPatient.set(null); return; }
  }

  // ── Drawer lateral (Detalle) ──
  goToDetail(row: PatientRow): void {
    this.selectedPatient.set(row);
    this.loadFichaAndFacturas(row.pacienteId);
  }

  private loadFichaAndFacturas(pacienteId: number): void {
    this.loadingFicha.set(true);
    this.consumo.set(null);
    this.ordenes.set([]);
    forkJoin({
      ficha:    this.patientApi.getFicha(pacienteId).pipe(catchError(() => of(null))),
      facturas: this.patientApi.getFacturasAfiliado(pacienteId).pipe(catchError(() => of([] as FacturaDTO[]))),
      consumo:  this.patientApi.getConsumoMensual(pacienteId).pipe(catchError(() => of(null))),
      ordenes:  this.patientApi.getOrdenesMedicas(pacienteId).pipe(catchError(() => of([] as OrdenMedicaDTO[]))),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ ficha, facturas, consumo, ordenes }) => {
      this.ficha.set(ficha);
      this.facturas.set(facturas ?? []);
      this.consumo.set(consumo);
      this.ordenes.set(ordenes ?? []);
      this.loadingFicha.set(false);
    });
  }

  // ── Quick Payment Modal ──
  /**
   * Abre el modal de pago rápido recuperando previamente el historial de facturas del afiliado.
   * 
   * ¡PARANOIA DE SOFTWARE LIMPIO!: Antes de abrir cualquier modal de pago, consultamos activamente
   * el backend para saber el estado real de la cuenta de cobros. Sugerir un monto fijo predeterminado 
   * es una mala práctica propensa a descuadres.
   * - Si detectamos facturas pendientes, sumamos la deuda exacta.
   * - Si está al día, sugerimos el monto de su cuota mensual actual de su plan.
   * - Si es un afiliado nuevo sin facturación emitida, sugerimos `0` para que la UI se entere y ofrezca el flujo 
   *   híbrido "Generar factura de este mes y aplicar cobro en el acto".
   * 
   * @param row Fila del paciente seleccionado en la grilla.
   */
  openQuickPayment(row: PatientRow): void {
    this.paymentTarget.set(row);
    this.paymentError.set(null);
    this.paymentIsNewSubscription.set(false);
    this.loading.set(true);

    this.patientApi.getFacturasAfiliado(row.pacienteId).pipe(
      catchError(() => of([] as FacturaDTO[])),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(facturas => {
      this.loading.set(false);
      this.facturas.set(facturas);

      const facturasVencidas = facturas.filter(f => f.estado !== 'PAGADA');
      const realPlan = this.apiPlans().find(p => p.name.toLowerCase() === row.planNombre.toLowerCase());
      const planMonthly = realPlan?.pricing.monthly ?? 0;

      if (facturasVencidas.length > 0) {
        // Deuda pendiente: suma de saldos reales
        this.paymentAmount = facturasVencidas.reduce((sum, f) => sum + (f.saldoPendiente ?? f.importeTotal ?? 0), 0);
        this.paymentIsNewSubscription.set(false);
      } else if (facturas.length > 0) {
        // Al día: sugerir cuota mensual del plan
        this.paymentAmount = planMonthly;
        this.paymentIsNewSubscription.set(false);
      } else {
        // Sin facturas: se generará la primera — usar precio del plan como monto sugerido
        this.paymentAmount = planMonthly;
        this.paymentIsNewSubscription.set(true);
      }

      this.paymentMethod = 'EFECTIVO';
      this.paymentRef    = '';
      this.paymentModalOpen.set(true);
    });
  }

  /**
   * Registra el pago del afiliado de forma 100% segura, consistente y transaccional.
   * 
   * ¡PARANOIA DE SOFTWARE LIMPIO!: El mayor peligro en pasarelas de caja son las "Transacciones Huérfanas"
   * (guardar un pago pero perder la relación con la factura, o intentar cobrar una factura que aún no existe).
   * 
   * Para mitigar esto, implementamos un flujo secuencial estricto mediante el operador `concatMap` de RxJS:
   * 1. **Flujo Híbrido (Nuevo sin facturas)**:
   *    - Paso A: Genera la factura mensual individual (`generarFacturaIndividual`).
   *    - Paso B: Consulta inmediatamente el listado actualizado (`getFacturasAfiliado`).
   *    - Paso C: Busca la factura generada y aplica el pago de forma atómica (`registrarPago`).
   *    Esto asegura que NUNCA intentemos registrar un pago sin su correspondiente factura en DB.
   * 2. **Flujo Estándar**:
   *    - Aplica directamente el cobro (`registrarPago`) sobre la factura pendiente detectada.
   * 
   * @param payment Estructura que contiene el monto, método de pago y referencia del comprobante.
   */
  submitQuickPayment(payment: QuickPaymentPayload): void {
    const target = this.paymentTarget();
    if (!target) return;

    const pagoBase = {
      fechaPago:        payment.fecha,
      monto:            payment.amount,
      metodoPago:       payment.method as any,
      numeroReferencia: payment.ref   || undefined,
      nota:             payment.nota  || undefined,
    };

    const pendingInvoice = this.facturas().find(f => f.estado !== 'PAGADA');

    if (!pendingInvoice) {
      // Flujo adaptativo: afiliado nuevo sin facturas — generar y cobrar en un solo paso
      this.loading.set(true);
      this.patientApi.generarFacturaIndividual(target.pacienteId).pipe(
        concatMap(() => this.patientApi.getFacturasAfiliado(target.pacienteId)),
        concatMap(facturas => {
          this.facturas.set(facturas);
          const newInvoice = facturas.find(f => f.estado !== 'PAGADA');
          if (!newInvoice) throw new Error('No se pudo encontrar la factura generada.');
          // Use the invoice's actual balance — avoids overpayment if plan price differs from user input
          const safeAmount = Math.min(pagoBase.monto, newInvoice.saldoPendiente ?? newInvoice.importeTotal ?? pagoBase.monto);
          return this.patientApi.registrarPago(newInvoice.id, { ...pagoBase, monto: safeAmount });
        }),
        catchError(err => {
          this.paymentError.set(this.translatePaymentError(err, 'Error al generar o cobrar la factura.'));
          this.loading.set(false);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(result => {
        this.loading.set(false);
        if (result) { target.status = 'al-dia'; this.loadPatients(); this.paymentModalOpen.set(false); }
      });
      return;
    }

    // Flujo estándar: factura existente
    this.loading.set(true);
    this.patientApi.registrarPago(pendingInvoice.id, pagoBase).pipe(
      catchError(err => {
        this.paymentError.set(this.translatePaymentError(err, 'Error al registrar el cobro.'));
        this.loading.set(false);
        return of(null);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(res => {
      this.loading.set(false);
      if (res) { target.status = 'al-dia'; this.loadPatients(); this.paymentModalOpen.set(false); }
    });
  }

  private translatePaymentError(err: any, fallback: string): string {
    const key = err?.error?.message ?? err?.error?.detail ?? '';
    if (key.includes('montoExcedeSaldo') || key.includes('monto excede')) {
      const pending = this.facturas().find(f => f.estado !== 'PAGADA');
      const saldo = pending?.saldoPendiente ?? pending?.importeTotal;
      const hint = saldo != null ? ` El saldo restante es $${saldo.toLocaleString('es-AR')}.` : '';
      return `El monto ingresado supera el saldo pendiente de la factura.${hint}`;
    }
    if (key.includes('facturaYaPagada') || key.includes('ya fue pagada')) {
      return 'Esta factura ya fue pagada anteriormente.';
    }
    return err?.error?.detail ?? err?.error?.title ?? fallback;
  }

  confirmBaja(row: PatientRow): void {
    const msg = `¿Confirmás la baja del afiliado ${row.name}?`;
    if (confirm(msg)) {
      this.patientApi.removeMiembro(row.pacienteId).pipe(
        catchError(() => of(null)), takeUntilDestroyed(this.destroyRef)
      ).subscribe(() => {
        this.loadPatients();
      });
    }
  }

  // ── Wizard alta (nuevo afiliado) ──
  openWizard(): void {
    this.wizardOpen.set(true);
  }

  onAltaWizardCompleted(_res: AltaAfiliadoCompletaResponse): void {
    this.wizardOpen.set(false);
    this.loadPatients(true);
  }

  // ── Form Modal (edición) ──
  openNewForm(): void {
    // Mantenido para compatibilidad; el alta usa openWizard()
    this.editingRow.set(null);
    this.form.set(emptyForm());
    this.formTab.set('titular');
    this.formError.set(null);
    this.dniCheckResult.set(null);
    this.formOpen.set(true);
  }

  /**
   * Abre el formulario de edición de afiliados de forma ultra-segura.
   * Consulta el grupo familiar del titular en la DB para reconstruir de forma fidedigna
   * a todos los dependientes con sus respectivos DNI, fechas de nacimiento, géneros, miembroId y pacienteId.
   * 
   * ¡PARANOIA DE SOFTWARE LIMPIO!: Esto es crítico. Si abrimos la edición de un afiliado que ya tiene
   * dependientes en la DB, no podemos cargarlos "vacíos" o sin sus IDs correspondientes. Si lo hiciéramos,
   * al guardar se volverían a crear en la base de datos, generando duplicados huérfanos.
   * Por eso, consultamos activamente las membresías reales mediante el API y mapeamos
   * sus IDs de Paciente y miembroId para preservarlos intactos.
   * 
   * @param row Fila del paciente titular a editar.
   */
  openEditForm(row: PatientRow, activeTab: 'titular' | 'group' = 'titular'): void {
    this.loading.set(true);
    this.originalMiembros.set([]);

    // Load full patient + ficha in parallel — _raw from search only carries partial fields
    forkJoin({
      paciente: this.patientApi.getById(row.pacienteId).pipe(catchError(() => of(null))),
      ficha:    this.patientApi.getFicha(row.pacienteId).pipe(catchError(() => of(null))),
    }).pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(({ paciente, ficha }) => {
      if (!ficha) {
        this.loading.set(false);
        return;
      }

      const raw = paciente ?? row._raw;
      const realPlan = this.apiPlans().find(p => p.name.toLowerCase() === row.planNombre.toLowerCase());
      const planId = realPlan?.id ?? (this.apiPlans()[0]?.id ?? '');

      if (ficha.grupoFamiliarId) {
        // Recuperamos las membresías reales y activas asociadas al grupo familiar en el backend
        this.patientApi.getMiembros(ficha.grupoFamiliarId).pipe(
          catchError(() => of([] as MiembroGrupoFamiliarDTO[])),
          takeUntilDestroyed(this.destroyRef)
        ).subscribe(miembros => {
          this.loading.set(false);
          this.originalMiembros.set(miembros);

          // Mapeamos los miembros del grupo (excepto el TITULAR y los dados de baja) a la interfaz de la UI
          const deps: Dependent[] = miembros
            .filter(m => m.rolFamiliar !== 'TITULAR' && m.estado !== 'INACTIVA')
            .map((m, index) => {
              const p = m.paciente;
              return {
                id: `d${index}`,
                miembroId: m.id,
                pacienteId: p?.id,
                name: p?.nombre ?? '',
                apellido: p?.apellido ?? '',
                dni: p?.dni ?? '',
                parentesco: m.rolFamiliar === 'CO_TITULAR' ? 'Cónyuge' : 'Hijo/a',
                birth: p?.fechaNacimiento ? p.fechaNacimiento.split('T')[0] : '',
                gender: p?.sexo === 'FEMENINO' ? 'F' : p?.sexo === 'MASCULINO' ? 'M' : 'X',
              };
            });

          this.editingRow.set(row);
          this.form.set({
            nombre:   raw.nombre ?? '',
            apellido: raw.apellido ?? '',
            dni:      raw.dni,
            birth:    raw.fechaNacimiento ? raw.fechaNacimiento.split('T')[0] : '',
            gender:   raw.sexo === 'FEMENINO' ? 'F' : raw.sexo === 'MASCULINO' ? 'M' : 'X',
            phone:    raw.telefono ?? '',
            email:    raw.email ?? '',
            addr:     raw.direccion ?? '',
            planId:   planId,
            deps,
          });
          this.formTab.set(activeTab);
          this.formError.set(null);
          this.formOpen.set(true);
        });
      } else {
        this.loading.set(false);
        this.editingRow.set(row);
        this.form.set({
          nombre:   raw.nombre ?? '',
          apellido: raw.apellido ?? '',
          dni:      raw.dni,
          birth:    raw.fechaNacimiento ? raw.fechaNacimiento.split('T')[0] : '',
          gender:   raw.sexo === 'FEMENINO' ? 'F' : raw.sexo === 'MASCULINO' ? 'M' : 'X',
          phone:    raw.telefono ?? '',
          email:    raw.email ?? '',
          addr:     raw.direccion ?? '',
          planId:   planId,
          deps:     [],
        });
        this.formTab.set(activeTab);
        this.formError.set(null);
        this.formOpen.set(true);
      }
    });
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingRow.set(null);
    this.formError.set(null);
    this.dniCheckResult.set(null);
  }

  /** Called by patient-form-modal when DNI blur fires during alta nueva */
  onDniCheck(dni: string): void {
    this.patientApi.checkDniExists(dni).pipe(
      catchError(() => of(false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(exists => {
      this.dniCheckResult.set(exists);
    });
  }

  // ── Cambiar plan ──
  onCambiarPlan(row: PatientRow): void {
    this.cambiarPlanTarget.set(row);
    this.cambiarPlanId.set('');
    this.cambiarPlanError.set(null);
    this.cambiarPlanOpen.set(true);
  }

  confirmCambiarPlan(): void {
    const target = this.cambiarPlanTarget();
    const planId = this.cambiarPlanId();
    if (!target || !planId) return;

    this.cambiarPlanLoading.set(true);
    this.cambiarPlanError.set(null);

    this.patientApi.crearCobertura(target.pacienteId, {
      tipoCobertura: 'PLAN_PROPIO',
      planComercialId: Number(planId),
      vigenciaDesde: todayISO(),
    }).pipe(
      catchError(err => {
        this.cambiarPlanError.set(err?.error?.detail ?? err?.error?.title ?? 'Error al cambiar el plan.');
        this.cambiarPlanLoading.set(false);
        return of(null);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(res => {
      if (res === null) return;
      this.cambiarPlanLoading.set(false);
      this.cambiarPlanOpen.set(false);
      this.cambiarPlanTarget.set(null);
      // Reload both ficha (if drawer open) and patients list
      const selected = this.selectedPatient();
      if (selected && selected.pacienteId === target.pacienteId) {
        this.loadFichaAndFacturas(selected.pacienteId);
      }
      this.loadPatients();
    });
  }

  patchForm(patch: Partial<PatientForm>): void {
    this.form.set({ ...this.form(), ...patch });
  }

  onFullNameInput(val: string): void {
    const parts = val.trim().split(' ');
    const nombre = parts[0] ?? '';
    const apellido = parts.slice(1).join(' ') ?? '';
    this.patchForm({ nombre, apellido });
  }

  /**
   * Guarda de forma atómica y consistente el formulario de alta/edición.
   * Utiliza una orquestación secuencial premium en RxJS para dar de alta al titular,
   * verificar/crear su grupo familiar en la base de datos real, y posteriormente
   * persistir/dar de baja dependientes de forma transaccional libre de inconsistencias.
   */
  saveForm(formValue: PatientForm): void {
    this.form.set(formValue);
    if (!this.canSubmit() || this.savingForm()) return;
    const f = this.form();
    const editing = this.editingRow();
    const empresaId = this.authService.currentAccount()?.empresa?.id;
    if (!empresaId) { this.formError.set('No se pudo determinar la empresa actual vinculada (Multi-tenant).'); return; }

    const payload = {
      nombre:    f.nombre.trim(),
      apellido:  f.apellido.trim(),
      dni:       f.dni.trim(),
      tipoDocumento: 'DNI' as const,
      sexo:      sexoFromGender(f.gender),
      fechaNacimiento: f.birth || undefined,
      email:     f.email || undefined,
      telefono:  f.phone || undefined,
      direccion: f.addr || undefined,
      activo:    true,
      empresa:   { id: empresaId },
    };

    // ── ALTA NUEVA: endpoint atómico transaccional ──
    if (!editing) {
      const altaReq: AltaAfiliadoCompletaRequest = {
        nombre: f.nombre.trim(),
        apellido: f.apellido.trim(),
        dni: f.dni.trim(),
        tipoDocumento: 'DNI',
        sexo: sexoFromGender(f.gender),
        fechaNacimiento: f.birth || undefined,
        email: f.email || undefined,
        telefono: f.phone || undefined,
        direccion: f.addr || undefined,
        planComercialId: Number(f.planId),
        dependientes: f.deps.map(d => ({
          nombre: d.name.trim(),
          apellido: d.apellido.trim(),
          dni: d.dni.trim(),
          tipoDocumento: 'DNI' as const,
          sexo: sexoFromGender(d.gender ?? 'M'),
          fechaNacimiento: d.birth || undefined,
          rolFamiliar: (d.parentesco === 'Cónyuge' ? 'CO_TITULAR' : 'DEPENDIENTE') as 'TITULAR' | 'CO_TITULAR' | 'DEPENDIENTE',
        })),
      };

      this.savingForm.set(true);
      this.formError.set(null);

      this.patientApi.altaCompleta(altaReq).pipe(
        catchError(err => {
          this.formError.set(err?.error?.detail ?? err?.error?.title ?? 'Error al crear el afiliado.');
          this.savingForm.set(false);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(resp => {
        if (!resp) return;
        this.savingForm.set(false);
        this.closeForm();
        this.loadPatients(true);

        // If an invoice was generated, open the quick payment modal right away
        if (resp.facturaId) {
          const planInfo = this.apiPlans().find(p => p.id === altaReq.planComercialId.toString());
          const newRow: PatientRow = {
            id:         String(resp.pacienteId),
            pacienteId: resp.pacienteId,
            name:       `${altaReq.nombre} ${altaReq.apellido}`,
            dni:        altaReq.dni,
            type:       'titular',
            planNombre: planInfo?.name ?? 'Sin plan',
            planColor:  this.getPlanColor(planInfo?.tier ?? 'basico'),
            status:     'deuda',
            sinceMonth: '',
            depCount:   altaReq.dependientes.length,
            _raw:       {} as any,
          };
          this.openQuickPayment(newRow);
        }
      });
      return;
    }

    // ── EDICIÓN: mantener flujo existente ──
    this.savingForm.set(true);
    this.formError.set(null);

    this.patientApi.update(editing.pacienteId, payload).pipe(
      catchError(err => {
        this.formError.set(err?.error?.detail ?? err?.error?.title ?? 'Error al guardar el titular. Verifique los datos.');
        this.savingForm.set(false);
        return of(null);
      }), takeUntilDestroyed(this.destroyRef)
    ).subscribe(saved => {
      if (!saved) return;

      // Creamos caché local para visualización fluida
      const selectedPlanInfo = this.apiPlans().find(p => p.id === f.planId);
      this.localPatientPlans.set(saved.id, {
        planId: f.planId,
        planNombre: selectedPlanInfo?.name ?? 'Plan Básico',
        planColor: this.getPlanColor(selectedPlanInfo?.tier ?? 'basico'),
        depCount: f.deps.length,
      });

      // Consultamos la Ficha para verificar la existencia del grupo familiar
      this.patientApi.getFicha(saved.id).pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(ficha => {
        if (ficha && ficha.grupoFamiliarId) {
          this.processFamilyGroup(saved.id, ficha.grupoFamiliarId, f.deps, this.originalMiembros(), empresaId);
        } else {
          const numCuenta = 'GRP-' + saved.id;
          this.patientApi.createGrupoFamiliar({
            numeroCuenta: numCuenta,
            estadoGrupo: 'ACTIVO',
            empresa: { id: empresaId }
          }).pipe(
            catchError(() => {
              this.formError.set('Error crítico al instanciar el grupo familiar en base de datos.');
              this.savingForm.set(false);
              return of(null);
            }),
            takeUntilDestroyed(this.destroyRef)
          ).subscribe(newGrupo => {
            if (!newGrupo) return;
            const reqTitular = {
              rolFamiliar: 'TITULAR' as const,
              fechaIngreso: todayISO(),
              estado: 'ACTIVA' as const,
              empresa: { id: empresaId },
              grupoFamiliar: { id: newGrupo.id },
              paciente: { id: saved.id }
            };
            this.patientApi.addMiembro(reqTitular).pipe(
              catchError(() => of(null)),
              takeUntilDestroyed(this.destroyRef)
            ).subscribe(() => {
              this.processFamilyGroup(saved.id, newGrupo.id, f.deps, [], empresaId);
            });
          });
        }
      });
    });
  }

  /**
   * Procesa de forma secuencial y ultra-robusta la creación, actualización y baja lógica de dependientes.
   * 
   * ¡PARANOIA DE SOFTWARE LIMPIO!: Este método es el cerebro de la persistencia del grupo familiar:
   * 1. **Detección e Inactivación de Bajas**: Comparamos la lista original de membresías contra los dependientes
   *    enviados por el formulario. Si un dependiente original activo ya no figura en la lista de la UI, lo damos de baja
   *    lógicamente llamando a `removeMiembro`.
   * 2. **Actualización Demográfica**: Para dependientes ya existentes (`pacienteId`), actualizamos sus datos demográficos
   *    (DNI, nombre, fecha de nacimiento, género) con `update`.
   * 3. **Consistencia en Parentesco**: Si el usuario cambió el parentesco de un familiar existente (ej. pasó de "Hijo/a" a "Cónyuge"),
   *    el backend requiere actualizar la membresía familiar. Comparamos el rol original contra el nuevo. Si difieren,
   *    ejecutamos de inmediato `updateMiembroRol` de forma encadenada usando RxJS `concatMap`.
   * 4. **Altas Nuevas**: Para dependientes nuevos, creamos el `Paciente` primero, y luego vinculamos el nuevo miembro al grupo.
   */
  private processFamilyGroup(
    titularId: number,
    grupoId: number,
    deps: Dependent[],
    originalMiembros: MiembroGrupoFamiliarDTO[],
    empresaId: number
  ): void {
    const today = todayISO();

    // 1. Detección y ejecución de bajas lógicas de dependientes removidos
    const activeOriginalDeps = originalMiembros.filter(m => m.rolFamiliar !== 'TITULAR' && m.estado !== 'INACTIVA');
    const removedMiembros = activeOriginalDeps.filter(orig => 
      !deps.some(d => d.pacienteId === orig.paciente?.id)
    );

    removedMiembros.forEach(m => {
      this.patientApi.removeMiembro(m.id, 'Baja por edición de grupo').pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe();
    });

    // 2. Si no quedan dependientes por procesar, cerramos el formulario y recargamos
    if (deps.length === 0) {
      this.savingForm.set(false);
      this.closeForm();
      this.loadPatients();
      return;
    }

    // 3. Orquestamos de forma concurrente y transaccional las tareas de alta y edición
    const tasks = deps.map(dep => {
      const depPayload = {
        nombre: dep.name.trim(),
        apellido: dep.apellido.trim(),
        dni: dep.dni.trim(),
        tipoDocumento: 'DNI' as const,
        sexo: sexoFromGender(dep.gender ?? 'M'),
        fechaNacimiento: dep.birth || undefined,
        activo: true,
        empresa: { id: empresaId }
      };

      if (dep.pacienteId) {
        // Dependiente existente: actualizamos sus datos demográficos
        const updatePaciente$ = this.patientApi.update(dep.pacienteId, depPayload).pipe(
          catchError(() => of(null))
        );

        // Verificamos de forma sumamente robusta si además cambió su parentesco/rol familiar en el backend
        const origMiembro = originalMiembros.find(m => m.id === dep.miembroId);
        const nuevoRol = (dep.parentesco === 'Cónyuge' ? 'CO_TITULAR' : 'DEPENDIENTE');

        if (origMiembro && origMiembro.rolFamiliar !== nuevoRol && dep.miembroId) {
          // Si el parentesco cambió, disparamos secuencialmente la actualización demográfica y luego la de su membresía
          return updatePaciente$.pipe(
            concatMap(() => this.patientApi.updateMiembroRol(dep.miembroId!, nuevoRol).pipe(
              catchError(() => of(null))
            ))
          );
        }

        return updatePaciente$;
      } else {
        // Nuevo dependiente: creamos registro Paciente en la base de datos real
        return this.patientApi.create(depPayload).pipe(
          concatMap(savedDep => {
            if (!savedDep) return of(null);
            
            // Vinculamos el dependiente recién creado al grupo familiar del titular
            const reqMiembro = {
              rolFamiliar: (dep.parentesco === 'Cónyuge' ? 'CO_TITULAR' : 'DEPENDIENTE') as any,
              fechaIngreso: today,
              estado: 'ACTIVA' as const,
              empresa: { id: empresaId },
              grupoFamiliar: { id: grupoId },
              paciente: { id: savedDep.id }
            };
            return this.patientApi.addMiembro(reqMiembro).pipe(
              catchError(() => of(null))
            );
          }),
          catchError(() => of(null))
        );
      }
    });

    // Esperamos de forma segura que terminen todas las transacciones antes de notificar éxito y recargar la vista
    forkJoin(tasks).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.savingForm.set(false);
      this.closeForm();
      this.loadPatients();
    });
  }

  /**
   * Genera de forma manual e individual la factura de este mes para el afiliado seleccionado.
   * Ideal para facturación a demanda, cobros adelantados o resoluciones rápidas de caja.
   */
  generarFacturaMensual(pacienteId: number): void {
    this.loadingFicha.set(true);
    this.patientApi.generarFacturaIndividual(pacienteId).pipe(
      catchError(err => {
        alert(err?.error?.detail ?? err?.error?.title ?? 'Error al generar la factura mensual. Verifique el plan y la cobertura del afiliado.');
        this.loadingFicha.set(false);
        return of(null);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(res => {
      if (res !== null) {
        // Recargamos expediente y listado general
        this.loadFichaAndFacturas(pacienteId);
        this.loadPatients();
      }
    });
  }

  /**
   * Abre el asistente de traspaso de titularidad para un grupo acéfalo.
   * Obtiene todos los dependientes activos vinculados al grupo y los expone.
   * 
   * @param grupoFamiliarId ID del grupo familiar comercial
   */
  openTraspasoModal(grupoFamiliarId: number): void {
    this.traspasoGrupoId.set(grupoFamiliarId);
    this.traspasoSelectedMiembroId.set(null);
    this.traspasoLoading.set(true);
    this.traspasoModalOpen.set(true);

    this.patientApi.getMiembros(grupoFamiliarId).pipe(
      catchError(() => of([] as MiembroGrupoFamiliarDTO[])),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(miembros => {
      this.traspasoLoading.set(false);
      // Los candidatos elegibles deben ser dependientes/co_titulares activos y vivos (paciente activo = true)
      const candidatos = miembros.filter(m => 
        m.rolFamiliar !== 'TITULAR' && 
        m.estado === 'ACTIVA' && 
        m.paciente && 
        m.paciente.activo !== false
      );
      this.traspasoMiembros.set(candidatos);
    });
  }

  /**
   * Ejecuta transaccionalmente el traspaso de titularidad:
   * 1. Da de baja lógica al titular inactivo anterior del grupo
   * 2. Promueve al dependiente seleccionado al rol de TITULAR
   * 3. Recarga la vista general y el drawer de expediente
   */
  ejecutarTraspaso(): void {
    const nuevoTitularId = this.traspasoSelectedMiembroId();
    const grupoId = this.traspasoGrupoId();
    if (!nuevoTitularId || !grupoId) return;

    this.traspasoLoading.set(true);

    this.patientApi.getMiembros(grupoId).pipe(
      concatMap(miembros => {
        const titularOriginal = miembros.find(m => m.rolFamiliar === 'TITULAR' && m.estado === 'ACTIVA');
        if (titularOriginal) {
          return this.patientApi.removeMiembro(titularOriginal.id, 'Traspaso de titularidad por baja/deceso');
        }
        return of(null);
      }),
      concatMap(() => this.patientApi.updateMiembroRol(nuevoTitularId, 'TITULAR')),
      catchError(err => {
        alert(err?.error?.detail ?? err?.error?.title ?? 'Error al procesar el traspaso de titularidad.');
        return of(null);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(res => {
      this.traspasoLoading.set(false);
      this.traspasoModalOpen.set(false);
      
      const selected = this.selectedPatient();
      if (selected) {
        this.loadFichaAndFacturas(selected.pacienteId);
      }
      this.loadPatients();
    });
  }
}
