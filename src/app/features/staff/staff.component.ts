import { Component, signal, computed, HostListener, OnInit, inject, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Components & Services
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { StaffApiService } from '../../data-access/api/staff.api';
import { SpecialtiesModalComponent } from './components/specialties-modal/specialties-modal.component';
import { StaffFormModalComponent } from './components/staff-form-modal/staff-form-modal.component';

// Models, helpers & types
import {
  SpecialtyGroup,
  CatalogItem,
  StaffMember,
  SPEC_GROUP_COLOR,
  PREFIX_OPTIONS,
  specById
} from './models/staff.interfaces';
import { ProfesionalSaludDTO } from '../../data-access/dto/staff.dto';

const PAGE_SIZE = 10;

function toCatalogItem(s: any): CatalogItem {
  return {
    id:    String(s.id),
    name:  s.nombre,
    group: s.nombre.toLowerCase().startsWith('enfermer') ? 'Enfermería' : 'Médica',
    descripcion: s.descripcion,
    requiereCertificacion: s.requiereCertificacion,
    aniosFormacion: s.aniosFormacion,
  };
}

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [
    FormsModule,
    StatusBadgeComponent,
    SpecialtiesModalComponent,
    StaffFormModalComponent
  ],
  templateUrl: './staff.component.html',
  styleUrl: './staff.component.scss'
})
export class StaffComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private staffApi = inject(StaffApiService);
  protected readonly Number = Number;

  // ── Seed / Constants ──
  readonly statusOptions = [
    { value: 'all',      label: 'Todos' },
    { value: 'active',   label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' },
  ];
  readonly habOptions = [
    { value: 'all',         label: 'Todas' },
    { value: 'domiciliary', label: 'Domiciliaria' },
    { value: 'emergency',   label: 'Emergencias' },
  ];

  // ── State ──
  readonly catalog = signal<CatalogItem[]>([]);
  readonly staff = signal<StaffMember[]>([]);
  readonly systemAuthorities = signal<string[]>([]);
  readonly searchQuery = signal('');
  readonly statusFilter = signal('all');
  readonly habFilter = signal('all');
  readonly page = signal(0);
  readonly loadingSpecialties = signal(false);
  
  // Modals Visibility & Edit state
  readonly formOpen = signal(false);
  readonly editingStaff = signal<StaffMember | null>(null);
  readonly specialtiesModalOpen = signal(false);
  
  // Table context menu
  readonly menuOpen = signal<string | null>(null);

  // Two-way search query binding helper
  get searchQueryValue(): string {
    return this.searchQuery();
  }
  set searchQueryValue(v: string) {
    this.searchQuery.set(v);
    this.page.set(0);
  }

  ngOnInit(): void {
    forkJoin({
      catalog: this.staffApi.getSubespecialidadesCatalog(),
      staff:   this.staffApi.getProfesionales(),
      roles:   this.staffApi.getAuthorities(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ catalog, staff, roles }) => {
        this.catalog.set(catalog.map(toCatalogItem));
        this.staff.set(staff.map(this.mapToMember));
        this.systemAuthorities.set(roles);
      }
    });
  }

  loadStaff(): void {
    this.staffApi.getProfesionales().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((list: ProfesionalSaludDTO[]) => {
      this.staff.set(list.map(this.mapToMember));
    });
  }

  refreshCatalog(): void {
    this.loadingSpecialties.set(true);
    this.staffApi.getSubespecialidadesCatalog().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (catalog) => {
        this.catalog.set(catalog.map(toCatalogItem));
        this.loadingSpecialties.set(false);
      },
      error: () => {
        this.loadingSpecialties.set(false);
      }
    });
  }

  private mapToMember = (b: ProfesionalSaludDTO): StaffMember => {
    const specialties: string[] = (b.subespecialidads ?? []).map(s => String(s.id));

    // Derivar prefijo del nombre real del profesional
    const nombre = b.nombre ?? '';
    const prefix = nombre.startsWith('Enf') ? 'Enf.'
      : nombre.startsWith('Lic') ? 'Lic.'
      : nombre.startsWith('Téc') || nombre.startsWith('Tec') ? 'Tec.'
      : nombre.startsWith('Op') ? 'Op.'
      : 'Dr.';

    // Resolver especialidad principal
    const primarySpec = b.especialidad
      ? this.catalog().find(c => c.name.toLowerCase() === b.especialidad!.toLowerCase())
      : undefined;
    const especialidadPrincipalId = primarySpec
      ? Number(primarySpec.id)
      : (specialties[0] ? Number(specialties[0]) : null);

    return {
      id:          String(b.id),
      firstName:   b.nombre,
      lastName:    b.apellido,
      prefix,
      matricula:   b.matricula ?? '',
      phone:       b.telefono ?? '',
      email:       b.email ?? '',
      documento:   b.documento ?? '',
      photoUrl:    b.foto ?? null,
      domiciliary: b.atencionDomiciliaria,
      emergency:   b.atencionEmergencia,
      active:      b.activo,
      linkedUser:  b.user != null,
      specialties,
      role:        'Profesional',
      unit:        '-',
      shift:       '-',
      exp:         0,
      avatar:      (b.nombre[0] ?? '') + (b.apellido[0] ?? ''),
      empresaId:   b.empresa?.id ?? 0,
      userId:      b.user?.id ?? null,
      userLogin:   b.user?.login ?? null,
      createdAt:   b.createdAt,
      especialidadPrincipalId,
    };
  };

  // ── Computed ──
  readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const s = this.statusFilter();
    const h = this.habFilter();
    return this.staff().filter(m =>
      (s === 'all' || (s === 'active' ? m.active : !m.active)) &&
      (h === 'all' || (h === 'domiciliary' ? m.domiciliary : m.emergency)) &&
      (!q ||
        m.firstName.toLowerCase().includes(q) ||
        m.lastName.toLowerCase().includes(q) ||
        m.matricula.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q))
    );
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));

  readonly paged = computed(() => {
    const pg = Math.min(this.page(), this.totalPages() - 1);
    return this.filtered().slice(pg * PAGE_SIZE, (pg + 1) * PAGE_SIZE);
  });

  readonly pageRange = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i));

  readonly counts = computed(() => {
    const list = this.staff();
    return {
      total:       list.length,
      active:      list.filter(m => m.active).length,
      domiciliary: list.filter(m => m.domiciliary && m.active).length,
      emergency:   list.filter(m => m.emergency && m.active).length,
    };
  });

  // ── Helpers ──
  getSpec(id: string): CatalogItem | undefined {
    return specById(this.catalog(), id);
  }

  groupColor(group: string): { bg: string; fg: string; border: string } {
    return SPEC_GROUP_COLOR[group as SpecialtyGroup] ?? { bg: 'rgba(148,163,184,0.1)', fg: 'var(--text-muted)', border: 'rgba(148,163,184,0.2)' };
  }

  // ── Filters ──
  setStatus(v: string): void {
    this.statusFilter.set(v);
    this.page.set(0);
  }

  setHab(v: string): void {
    this.habFilter.set(v);
    this.page.set(0);
  }

  // ── Table Action Menu ──
  toggleMenu(id: string): void {
    this.menuOpen.set(this.menuOpen() === id ? null : id);
  }

  toggleActive(id: string): void {
    const member = this.staff().find(m => m.id === id);
    if (!member) return;
    const numId = Number(id);
    this.staffApi.patch(numId, { id: numId, activo: !member.active }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.loadStaff(),
      error: () => {},
    });
  }

  @HostListener('document:click')
  closeMenuOnOutsideClick(): void {
    this.menuOpen.set(null);
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.menuOpen.set(null);
  }

  // ── Form Modal Triggers ──
  openNewForm(): void {
    this.editingStaff.set(null);
    this.formOpen.set(true);
  }

  openEditForm(m: StaffMember): void {
    this.editingStaff.set(m);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingStaff.set(null);
  }

  // ── Specialties Modal Triggers ──
  openSpecialtiesModal(): void {
    this.specialtiesModalOpen.set(true);
  }

  closeSpecialtiesModal(): void {
    this.specialtiesModalOpen.set(false);
  }
}
