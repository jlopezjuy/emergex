import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  HostListener,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EmpresaApiService } from '../../../data-access/api/empresa.api';
import { AdminUserApiService } from '../../../data-access/api/admin-user.api';
import { UserFeedbackService } from '../../../core/notifications/user-feedback.service';
import {
  AdminUserDTO,
  CreateEmpresaUserRequest,
  RolCentro,
  UsuarioEmpresaItem,
} from '../../../data-access/dto/admin-user.dto';
import {
  EmpresaDTO,
  EstadoEmpresa,
  PlanSuscripcionSaas,
  ALL_PLANES,
  ALL_PROVINCIAS,
} from '../../../data-access/dto/empresa.dto';
import { ModalShellComponent } from '../../../shared/components/modal-shell/modal-shell.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { FeedbackToastsComponent } from '../../../shared/components/feedback-toasts/feedback-toasts.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

const PAGE_SIZE = 10;


const ALL_ROLES: RolCentro[] = [
  'PROPIETARIO',
  'ADMINISTRADOR',
  'DESPACHANTE',
  'OPERADOR',
  'PROFESIONAL',
  'CONTADOR',
];

@Component({
  selector: 'emx-admin-global',
  standalone: true,
  imports: [
    FormsModule,
    ModalShellComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    FeedbackToastsComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './admin-global.component.html',
  styleUrl: './admin-global.component.css',
})
export class AdminGlobalComponent implements OnInit {
  protected readonly PAGE_SIZE = PAGE_SIZE;
  protected readonly ALL_ROLES = ALL_ROLES;

  private readonly empresaApi = inject(EmpresaApiService);
  private readonly adminUserApi = inject(AdminUserApiService);
  private readonly feedback = inject(UserFeedbackService);

  // ── Filtros y Dropdowns Premium ──
  readonly selectedEstadoFilter = signal<'TODOS' | 'ACTIVOS' | 'INACTIVOS'>('TODOS');
  readonly activeDropdownId = signal<number | null>(null);

  readonly userPageRange = computed(() => Array.from({ length: this.totalUserPages() }, (_, i) => i));

  getRolColor(rol: RolCentro): { bg: string; fg: string; border: string } {
    switch (rol) {
      case 'PROPIETARIO':
        return { bg: 'rgba(16, 185, 129, 0.16)', fg: 'var(--accent-emerald)', border: 'rgba(16, 185, 129, 0.30)' };
      case 'ADMINISTRADOR':
        return { bg: 'rgba(59, 130, 246, 0.16)', fg: 'var(--accent-blue)', border: 'rgba(59, 130, 246, 0.30)' };
      case 'DESPACHANTE':
        return { bg: 'rgba(236, 72, 153, 0.16)', fg: '#ec4899', border: 'rgba(236, 72, 153, 0.30)' };
      case 'OPERADOR':
        return { bg: 'rgba(245, 158, 11, 0.16)', fg: '#f59e0b', border: 'rgba(245, 158, 11, 0.30)' };
      case 'PROFESIONAL':
        return { bg: 'rgba(168, 85, 247, 0.16)', fg: '#a855f7', border: 'rgba(168, 85, 247, 0.30)' };
      case 'CONTADOR':
      default:
        return { bg: 'rgba(148, 163, 184, 0.16)', fg: 'var(--text-secondary)', border: 'rgba(148, 163, 184, 0.30)' };
    }
  }

  goToUserPage(page: number): void {
    this.userPage.set(page);
    this.loadUsers();
  }

  readonly filteredUsers = computed(() => {
    const list = this.users();
    const filter = this.selectedEstadoFilter();
    if (filter === 'ACTIVOS') {
      return list.filter(u => u.user.activated);
    }
    if (filter === 'INACTIVOS') {
      return list.filter(u => !u.user.activated);
    }
    return list;
  });

  // ── Empresas state ──
  readonly empresas = signal<EmpresaDTO[]>([]);
  readonly totalEmpresas = signal(0);
  readonly empresaPage = signal(0);
  readonly loadingEmpresas = signal(false);
  readonly errorEmpresas = signal(false);
  readonly totalEmpresaPages = computed(() => Math.max(1, Math.ceil(this.totalEmpresas() / PAGE_SIZE)));

  // ── Modals y formularios de Empresas ──
  readonly showCreateEmpresa = signal(false);
  readonly showEditEmpresa = signal<EmpresaDTO | null>(null);
  readonly showDeleteEmpresa = signal<EmpresaDTO | null>(null);
  readonly ALL_PLANES = ALL_PLANES;
  readonly ALL_PROVINCIAS = ALL_PROVINCIAS;

  createEmpresaForm = this.blankEmpresaForm();
  editEmpresaForm = this.blankEmpresaForm();
  deleteConfirmNombre = '';

  empresaSearchInput = '';
  private empresaSearchTerm = signal('');

  // ── Selected empresa + users state ──
  readonly selectedEmpresa = signal<EmpresaDTO | null>(null);
  readonly users = signal<UsuarioEmpresaItem[]>([]);
  readonly totalUsers = signal(0);
  readonly userPage = signal(0);
  readonly loadingUsers = signal(false);
  readonly errorUsers = signal(false);
  readonly totalUserPages = computed(() => Math.max(1, Math.ceil(this.totalUsers() / PAGE_SIZE)));

  userSearchInput = '';
  private userSearchTerm = signal('');

  // ── Modals ──
  readonly showCreateUser = signal(false);
  readonly showEditUser = signal<UsuarioEmpresaItem | null>(null);
  readonly showChangePassword = signal<UsuarioEmpresaItem | null>(null);
  readonly saving = signal(false);

  createForm: {
    login: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    rolCentro: RolCentro;
  } = this.blankCreateForm();

  editForm: {
    email: string;
    firstName: string;
    lastName: string;
    activated: boolean;
    rol: RolCentro;
  } = this.blankEditForm();


  readonly pwForm = signal({ newPassword: '', confirmPassword: '' });
  readonly pwMismatch = computed(
    () => !!this.pwForm().confirmPassword && this.pwForm().newPassword !== this.pwForm().confirmPassword,
  );

  ngOnInit(): void {
    this.loadEmpresas();
  }

  // ── Empresa CRUD actions ──

  openCreateEmpresa(): void {
    this.createEmpresaForm = this.blankEmpresaForm();
    this.showCreateEmpresa.set(true);
  }

  submitCreateEmpresa(): void {
    this.saving.set(true);
    const payload: EmpresaDTO = {
      ...this.createEmpresaForm,
      id: null as any, // El ID se genera en backend
      cuit: this.createEmpresaForm.cuit.trim()
    };

    this.empresaApi.create(payload).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.showCreateEmpresa.set(false);
        this.empresas.update(list => [res, ...list]);
        this.totalEmpresas.update(t => t + 1);
        this.feedback.push({ type: 'success', title: 'Empresa creada', message: res.nombre });
        this.selectEmpresa(res);
      },
      error: (err) => {
        this.saving.set(false);
        this.feedback.fromHttpError(err);
      }
    });
  }

  openEditEmpresa(empresa: EmpresaDTO): void {
    this.editEmpresaForm = {
      nombre: empresa.nombre || '',
      cuit: empresa.cuit || '',
      razonSocial: empresa.razonSocial || '',
      condicionIva: empresa.condicionIva || 'Responsable Inscripto',
      direccion: empresa.direccion || '',
      ciudad: empresa.ciudad || '',
      provincia: empresa.provincia || 'CAPITAL_FEDERAL',
      telefono: empresa.telefono || '',
      email: empresa.email || '',
      estado: empresa.estado || 'ACTIVA',
      planSuscripcion: empresa.planSuscripcion || 'TRIAL',
      puntoDeVenta: empresa.puntoDeVenta ?? 1,
      zonaHoraria: empresa.zonaHoraria || 'America/Argentina/Buenos_Aires',
    };
    this.showEditEmpresa.set(empresa);
  }

  submitEditEmpresa(): void {
    const original = this.showEditEmpresa();
    if (!original) return;
    this.saving.set(true);

    const payload: EmpresaDTO = {
      ...original,
      ...this.editEmpresaForm,
      cuit: this.editEmpresaForm.cuit.trim()
    };

    this.empresaApi.update(original.id, payload).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.showEditEmpresa.set(null);
        this.empresas.update(list => list.map(e => e.id === original.id ? res : e));
        
        // Si la empresa editada es la seleccionada actualmente, actualizar su info de cabecera
        const current = this.selectedEmpresa();
        if (current && current.id === original.id) {
          this.selectedEmpresa.set(res);
        }

        this.feedback.push({ type: 'success', title: 'Empresa actualizada', message: res.nombre });
      },
      error: (err) => {
        this.saving.set(false);
        this.feedback.fromHttpError(err);
      }
    });
  }

  changeEmpresaEstado(empresa: EmpresaDTO, nuevoEstado: EstadoEmpresa): void {
    this.empresaApi.partialUpdate(empresa.id, { estado: nuevoEstado }).subscribe({
      next: (res) => {
        this.empresas.update(list => list.map(e => e.id === empresa.id ? { ...e, estado: nuevoEstado } : e));
        
        const current = this.selectedEmpresa();
        if (current && current.id === empresa.id) {
          this.selectedEmpresa.set({ ...current, estado: nuevoEstado });
        }

        this.feedback.push({
          type: 'success',
          title: 'Estado de empresa actualizado',
          message: `${empresa.nombre} ahora está ${nuevoEstado}`
        });
      },
      error: (err) => this.feedback.fromHttpError(err)
    });
  }

  openDeleteEmpresa(empresa: EmpresaDTO): void {
    this.deleteConfirmNombre = '';
    this.showDeleteEmpresa.set(empresa);
  }

  submitDeleteEmpresa(): void {
    const target = this.showDeleteEmpresa();
    if (!target) return;
    if (this.deleteConfirmNombre !== target.nombre) {
      this.feedback.push({
        type: 'error',
        title: 'Error de confirmación',
        message: 'El nombre ingresado no coincide con el nombre de la empresa.'
      });
      return;
    }

    this.saving.set(true);
    this.empresaApi.delete(target.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.showDeleteEmpresa.set(null);
        this.empresas.update(list => list.filter(e => e.id !== target.id));
        this.totalEmpresas.update(t => Math.max(0, t - 1));

        // Si la empresa eliminada es la seleccionada, deseleccionarla
        const current = this.selectedEmpresa();
        if (current && current.id === target.id) {
          this.selectedEmpresa.set(null);
          this.users.set([]);
          this.totalUsers.set(0);
        }

        this.feedback.push({ type: 'success', title: 'Empresa eliminada', message: target.nombre });
      },
      error: (err) => {
        this.saving.set(false);
        this.feedback.fromHttpError(err);
      }
    });
  }

  // ── Empresa actions ──

  loadEmpresas(): void {
    this.loadingEmpresas.set(true);
    this.errorEmpresas.set(false);
    this.empresaApi
      .getAll({ page: this.empresaPage(), size: PAGE_SIZE, search: this.empresaSearchTerm() })
      .subscribe({
        next: ({ data, total }) => {
          this.empresas.set(data);
          this.totalEmpresas.set(total);
          this.loadingEmpresas.set(false);
        },
        error: () => {
          this.errorEmpresas.set(true);
          this.loadingEmpresas.set(false);
        },
      });
  }

  selectEmpresa(empresa: EmpresaDTO): void {
    this.selectedEmpresa.set(empresa);
    this.userPage.set(0);
    this.userSearchInput = '';
    this.userSearchTerm.set('');
    this.loadUsers();
  }

  onEmpresaSearchChange(value: string): void {
    this.empresaPage.set(0);
    this.empresaSearchTerm.set(value);
    this.loadEmpresas();
  }

  prevEmpresaPage(): void {
    this.empresaPage.update(p => p - 1);
    this.loadEmpresas();
  }

  nextEmpresaPage(): void {
    this.empresaPage.update(p => p + 1);
    this.loadEmpresas();
  }

  // ── User actions ──

  loadUsers(): void {
    const empresa = this.selectedEmpresa();
    if (!empresa) return;
    this.loadingUsers.set(true);
    this.errorUsers.set(false);
    this.adminUserApi
      .getByEmpresa(empresa.id, { page: this.userPage(), size: PAGE_SIZE, search: this.userSearchTerm() })
      .subscribe({
        next: ({ data, total }) => {
          this.users.set(data);
          this.totalUsers.set(total);
          this.loadingUsers.set(false);
        },
        error: () => {
          this.errorUsers.set(true);
          this.loadingUsers.set(false);
        },
      });
  }

  onUserSearchChange(value: string): void {
    this.userPage.set(0);
    this.userSearchTerm.set(value);
    this.loadUsers();
  }

  prevUserPage(): void {
    this.userPage.update(p => p - 1);
    this.loadUsers();
  }

  nextUserPage(): void {
    this.userPage.update(p => p + 1);
    this.loadUsers();
  }

  toggleActive(item: UsuarioEmpresaItem): void {
    const next = !item.user.activated;
    const updatedUser: AdminUserDTO = { ...item.user, activated: next };
    this.adminUserApi.updateUser(item.user.login, updatedUser).subscribe({
      next: () => {
        this.users.update(list =>
          list.map(u => u.id === item.id ? { ...u, user: { ...u.user, activated: next } } : u),
        );
        this.feedback.push({
          type: 'success',
          title: next ? 'Usuario activado' : 'Usuario desactivado',
          message: item.user.login,
        });
      },
      error: (err) => this.feedback.fromHttpError(err),
    });
  }

  // ── Create user modal ──

  openCreateUser(): void {
    this.createForm = this.blankCreateForm();
    this.showCreateUser.set(true);
  }

  submitCreateUser(): void {
    const empresa = this.selectedEmpresa();
    if (!empresa) return;
    this.saving.set(true);

    const req: CreateEmpresaUserRequest = {
      user: {
        login: this.createForm.login.trim().toLowerCase(),
        email: this.createForm.email.trim().toLowerCase(),
        firstName: this.createForm.firstName.trim() || undefined,
        lastName: this.createForm.lastName.trim() || undefined,
        activated: true,
        langKey: 'es',
        authorities: ['ROLE_USER'],
      },
      password: this.createForm.password,
      rolCentro: this.createForm.rolCentro,
    };

    this.adminUserApi.createInEmpresa(empresa.id, req).subscribe({
      next: (item) => {
        this.saving.set(false);
        this.showCreateUser.set(false);
        this.users.update(list => [item, ...list]);
        this.totalUsers.update(t => t + 1);
        this.feedback.push({ type: 'success', title: 'Usuario creado', message: req.user.login });
      },
      error: (err) => {
        this.saving.set(false);
        this.feedback.fromHttpError(err);
      },
    });
  }

  // ── Edit user modal ──

  openEditUser(item: UsuarioEmpresaItem): void {
    this.editForm = {
      email: item.user.email,
      firstName: item.user.firstName ?? '',
      lastName: item.user.lastName ?? '',
      activated: item.user.activated,
      rol: item.rol,
    };
    this.showEditUser.set(item);
  }

  submitEditUser(): void {
    const item = this.showEditUser();
    const empresa = this.selectedEmpresa();
    if (!item || !empresa) return;
    this.saving.set(true);

    const updatedItem: UsuarioEmpresaItem = {
      ...item,
      rol: this.editForm.rol,
      activo: this.editForm.activated,
      user: {
        ...item.user,
        email: this.editForm.email.trim().toLowerCase(),
        firstName: this.editForm.firstName.trim(),
        lastName: this.editForm.lastName.trim(),
        activated: this.editForm.activated,
      },
    };

    this.adminUserApi.updateUserInEmpresa(empresa.id, item.user.login, updatedItem).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.showEditUser.set(null);
        this.users.update(list =>
          list.map(u => u.id === item.id ? res : u),
        );
        this.feedback.push({ type: 'success', title: 'Usuario actualizado', message: res.user.login });
      },
      error: (err) => {
        this.saving.set(false);
        this.feedback.fromHttpError(err);
      },
    });
  }


  // ── Change password modal ──

  openChangePassword(item: UsuarioEmpresaItem): void {
    this.pwForm.set({ newPassword: '', confirmPassword: '' });
    this.showChangePassword.set(item);
  }

  submitChangePassword(): void {
    const item = this.showChangePassword();
    if (!item || this.pwMismatch()) return;
    this.saving.set(true);

    this.adminUserApi.setPassword(item.user.login, this.pwForm().newPassword).subscribe({
      next: () => {
        this.saving.set(false);
        this.showChangePassword.set(null);
        this.feedback.push({
          type: 'success',
          title: 'Contraseña cambiada',
          message: `Contraseña actualizada para ${item.user.login}`,
        });
      },
      error: (err) => {
        this.saving.set(false);
        this.feedback.fromHttpError(err);
      },
    });
  }

  @HostListener('document:click')
  closeDropdown(): void {
    this.activeDropdownId.set(null);
  }

  toggleDropdown(itemId: number, event: Event): void {
    event.stopPropagation();
    if (this.activeDropdownId() === itemId) {
      this.activeDropdownId.set(null);
    } else {
      this.activeDropdownId.set(itemId);
    }
  }

  getAvatarInitials(firstName?: string, lastName?: string): string {
    const f = firstName?.trim().charAt(0) ?? '';
    const l = lastName?.trim().charAt(0) ?? '';
    const initials = (f + l).toUpperCase();
    return initials.length > 0 ? initials : 'U';
  }

  // ── Helpers ──

  private blankCreateForm() {
    return {
      login: '',
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      rolCentro: 'OPERADOR' as RolCentro,
    };
  }

  private blankEditForm() {
    return { email: '', firstName: '', lastName: '', activated: true, rol: 'OPERADOR' as RolCentro };
  }

  private blankEmpresaForm() {
    return {
      nombre: '',
      cuit: '',
      razonSocial: '',
      condicionIva: 'Responsable Inscripto',
      direccion: '',
      ciudad: '',
      provincia: 'CAPITAL_FEDERAL',
      telefono: '',
      email: '',
      estado: 'ACTIVA' as EstadoEmpresa,
      planSuscripcion: 'TRIAL' as PlanSuscripcionSaas,
      puntoDeVenta: 1,
      zonaHoraria: 'America/Argentina/Buenos_Aires',
    };
  }

}
