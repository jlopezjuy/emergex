import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
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
import { EmpresaDTO } from '../../../data-access/dto/empresa.dto';
import { ModalShellComponent } from '../../../shared/components/modal-shell/modal-shell.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { FeedbackToastsComponent } from '../../../shared/components/feedback-toasts/feedback-toasts.component';

const PAGE_SIZE = 10;

const ALL_ROLES: RolCentro[] = [
  'PROPIETARIO',
  'ADMINISTRADOR',
  'DESPACHANTE',
  'OPERADOR',
  'PROFESIONAL',
  'CONTADOR',
];

const ASSIGNABLE_AUTHORITIES = [
  'ROLE_PROPIETARIO',
  'ROLE_ADMINISTRADOR',
  'ROLE_DESPACHANTE',
  'ROLE_OPERADOR',
  'ROLE_PROFESIONAL',
  'ROLE_CHOFER',
  'ROLE_MEDICO_CAMPO',
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
  ],
  template: `
    <emx-feedback-toasts />

    <div class="admin-layout">

      <!-- ── LEFT: Empresas ── -->
      <aside class="panel panel-left">
        <div class="panel-header">
          <h2 class="panel-title">Empresas</h2>
        </div>

        <div class="px-3 pb-2">
          <input
            class="search-input"
            type="search"
            placeholder="Buscar empresa…"
            [(ngModel)]="empresaSearchInput"
            (ngModelChange)="onEmpresaSearchChange($event)"
          />
        </div>

        @if (loadingEmpresas()) {
          <emx-loading-state />
        } @else if (errorEmpresas()) {
          <div class="error-inline">
            Error al cargar. <button class="link-btn" (click)="loadEmpresas()">Reintentar</button>
          </div>
        } @else if (empresas().length === 0) {
          <emx-empty-state message="Sin empresas" />
        } @else {
          <ul class="empresa-list">
            @for (e of empresas(); track e.id) {
              <li
                class="empresa-item"
                [class.empresa-item--active]="selectedEmpresa()?.id === e.id"
                (click)="selectEmpresa(e)"
              >
                <span class="empresa-nombre">{{ e.nombre }}</span>
                <span class="empresa-cuit">{{ e.cuit }}</span>
                <span class="badge" [attr.data-estado]="e.estado">{{ e.estado }}</span>
              </li>
            }
          </ul>

          @if (totalEmpresas() > PAGE_SIZE) {
            <div class="pagination">
              <button class="page-btn" [disabled]="empresaPage() === 0" (click)="prevEmpresaPage()">‹</button>
              <span class="page-info">{{ empresaPage() + 1 }} / {{ totalEmpresaPages() }}</span>
              <button class="page-btn" [disabled]="empresaPage() + 1 >= totalEmpresaPages()" (click)="nextEmpresaPage()">›</button>
            </div>
          }
        }
      </aside>

      <!-- ── RIGHT: Usuarios de la empresa ── -->
      <section class="panel panel-right">
        @if (!selectedEmpresa()) {
          <div class="no-selection">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.2">
              <rect x="6" y="10" width="36" height="28" rx="3"/>
              <path d="M16 10V6M32 10V6M6 22h36"/>
            </svg>
            <p>Seleccioná una empresa para ver sus usuarios</p>
          </div>
        } @else {
          <div class="panel-header">
            <div>
              <h2 class="panel-title">{{ selectedEmpresa()!.nombre }}</h2>
              <p class="panel-subtitle">{{ selectedEmpresa()!.cuit }} · {{ selectedEmpresa()!.ciudad }}</p>
            </div>
            <button class="btn-primary" (click)="openCreateUser()">+ Nuevo usuario</button>
          </div>

          <div class="px-4 pb-3">
            <input
              class="search-input"
              type="search"
              placeholder="Buscar usuario…"
              [(ngModel)]="userSearchInput"
              (ngModelChange)="onUserSearchChange($event)"
            />
          </div>

          @if (loadingUsers()) {
            <emx-loading-state />
          } @else if (errorUsers()) {
            <div class="error-inline">
              Error al cargar. <button class="link-btn" (click)="loadUsers()">Reintentar</button>
            </div>
          } @else if (users().length === 0) {
            <emx-empty-state message="Sin usuarios en esta empresa" />
          } @else {
            <div class="table-wrap">
              <table class="users-table">
                <thead>
                  <tr>
                    <th>Login</th>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol empresa</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of users(); track item.id) {
                    <tr>
                      <td class="cell-login">{{ item.user.login }}</td>
                      <td>{{ item.user.firstName }} {{ item.user.lastName }}</td>
                      <td class="cell-email">{{ item.user.email }}</td>
                      <td>
                        <span class="badge badge-rol">{{ item.rol }}</span>
                      </td>
                      <td>
                        <span class="badge" [attr.data-estado]="item.user.activated ? 'ACTIVA' : 'SUSPENDIDA'">
                          {{ item.user.activated ? 'Activo' : 'Inactivo' }}
                        </span>
                      </td>
                      <td class="cell-actions">
                        <button class="action-btn" title="Editar" (click)="openEditUser(item)">✏️</button>
                        <button class="action-btn" title="Cambiar contraseña" (click)="openChangePassword(item)">🔑</button>
                        <button
                          class="action-btn"
                          [title]="item.user.activated ? 'Desactivar' : 'Activar'"
                          (click)="toggleActive(item)"
                        >{{ item.user.activated ? '🚫' : '✅' }}</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            @if (totalUsers() > PAGE_SIZE) {
              <div class="pagination">
                <button class="page-btn" [disabled]="userPage() === 0" (click)="prevUserPage()">‹</button>
                <span class="page-info">{{ userPage() + 1 }} / {{ totalUserPages() }}</span>
                <button class="page-btn" [disabled]="userPage() + 1 >= totalUserPages()" (click)="nextUserPage()">›</button>
              </div>
            }
          }
        }
      </section>
    </div>

    <!-- ── MODAL: Crear usuario ── -->
    @if (showCreateUser()) {
      <emx-modal-shell title="Nuevo usuario" (closed)="showCreateUser.set(false)">
        <form (ngSubmit)="submitCreateUser()">
          <div class="form-grid">
            <label class="field">
              <span>Login *</span>
              <input type="text" [(ngModel)]="createForm.login" name="login" required autocomplete="off" />
            </label>
            <label class="field">
              <span>Email *</span>
              <input type="email" [(ngModel)]="createForm.email" name="email" required />
            </label>
            <label class="field">
              <span>Nombre</span>
              <input type="text" [(ngModel)]="createForm.firstName" name="firstName" />
            </label>
            <label class="field">
              <span>Apellido</span>
              <input type="text" [(ngModel)]="createForm.lastName" name="lastName" />
            </label>
            <label class="field">
              <span>Contraseña *</span>
              <input type="password" [(ngModel)]="createForm.password" name="password" required minlength="4" autocomplete="new-password" />
            </label>
            <label class="field">
              <span>Rol en empresa *</span>
              <select [(ngModel)]="createForm.rolCentro" name="rolCentro" required>
                @for (r of ALL_ROLES; track r) {
                  <option [value]="r">{{ r }}</option>
                }
              </select>
            </label>
          </div>

          <div class="field mt-3">
            <span>Authorities</span>
            <div class="checkbox-group">
              @for (auth of ASSIGNABLE_AUTHORITIES; track auth) {
                <label class="checkbox-item">
                  <input
                    type="checkbox"
                    [checked]="createForm.authorities.includes(auth)"
                    (change)="toggleAuthority(createForm.authorities, auth, $event)"
                  />
                  {{ auth }}
                </label>
              }
            </div>
          </div>
        </form>

        <div footer class="flex gap-2">
          <button class="btn-ghost" (click)="showCreateUser.set(false)">Cancelar</button>
          <button class="btn-primary" [disabled]="saving()" (click)="submitCreateUser()">
            {{ saving() ? 'Guardando…' : 'Crear usuario' }}
          </button>
        </div>
      </emx-modal-shell>
    }

    <!-- ── MODAL: Editar usuario ── -->
    @if (showEditUser()) {
      <emx-modal-shell title="Editar usuario" (closed)="showEditUser.set(null)">
        <form>
          <div class="form-grid">
            <label class="field">
              <span>Login</span>
              <input type="text" [value]="showEditUser()!.user.login" disabled />
            </label>
            <label class="field">
              <span>Email *</span>
              <input type="email" [(ngModel)]="editForm.email" name="email" required />
            </label>
            <label class="field">
              <span>Nombre</span>
              <input type="text" [(ngModel)]="editForm.firstName" name="firstName" />
            </label>
            <label class="field">
              <span>Apellido</span>
              <input type="text" [(ngModel)]="editForm.lastName" name="lastName" />
            </label>
            <label class="field field--inline">
              <input type="checkbox" [(ngModel)]="editForm.activated" name="activated" />
              <span>Usuario activo</span>
            </label>
          </div>

          <div class="field mt-3">
            <span>Authorities</span>
            <div class="checkbox-group">
              @for (auth of ASSIGNABLE_AUTHORITIES; track auth) {
                <label class="checkbox-item">
                  <input
                    type="checkbox"
                    [checked]="editForm.authorities.includes(auth)"
                    (change)="toggleAuthority(editForm.authorities, auth, $event)"
                  />
                  {{ auth }}
                </label>
              }
            </div>
          </div>
        </form>

        <div footer class="flex gap-2">
          <button class="btn-ghost" (click)="showEditUser.set(null)">Cancelar</button>
          <button class="btn-primary" [disabled]="saving()" (click)="submitEditUser()">
            {{ saving() ? 'Guardando…' : 'Guardar cambios' }}
          </button>
        </div>
      </emx-modal-shell>
    }

    <!-- ── MODAL: Cambiar contraseña ── -->
    @if (showChangePassword()) {
      <emx-modal-shell
        [title]="'Cambiar contraseña — ' + showChangePassword()!.user.login"
        (closed)="showChangePassword.set(null)"
      >
        <div class="form-grid">
          <label class="field">
            <span>Nueva contraseña *</span>
            <input
              type="password"
              [ngModel]="pwForm().newPassword"
              (ngModelChange)="pwForm.update(f => ({ ...f, newPassword: $event }))"
              name="newPassword"
              minlength="4"
              autocomplete="new-password"
            />
          </label>
          <label class="field">
            <span>Confirmar contraseña *</span>
            <input
              type="password"
              [ngModel]="pwForm().confirmPassword"
              (ngModelChange)="pwForm.update(f => ({ ...f, confirmPassword: $event }))"
              name="confirmPassword"
              autocomplete="new-password"
            />
          </label>
        </div>
        @if (pwMismatch()) {
          <p class="field-error">Las contraseñas no coinciden.</p>
        }

        <div footer class="flex gap-2">
          <button class="btn-ghost" (click)="showChangePassword.set(null)">Cancelar</button>
          <button class="btn-primary" [disabled]="saving() || pwMismatch()" (click)="submitChangePassword()">
            {{ saving() ? 'Guardando…' : 'Cambiar contraseña' }}
          </button>
        </div>
      </emx-modal-shell>
    }
  `,
  styles: [`
    .admin-layout {
      display: flex;
      height: 100%;
      min-height: 0;
      overflow: hidden;
    }

    /* ── Panels ── */
    .panel {
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
      border-right: 1px solid var(--border-glass);
    }
    .panel-left  { width: 280px; flex-shrink: 0; background: var(--bg-elevated); }
    .panel-right { flex: 1; background: var(--bg-base); }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid var(--border-glass);
      flex-shrink: 0;
    }
    .panel-title    { font-size: 13px; font-weight: 600; color: var(--text-primary); }
    .panel-subtitle { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

    /* ── Search ── */
    .search-input {
      width: 100%;
      padding: 7px 10px;
      border-radius: 8px;
      border: 1px solid var(--border-glass);
      background: var(--surface-glass);
      color: var(--text-primary);
      font-size: 12px;
      outline: none;
    }
    .search-input:focus { border-color: var(--accent-blue); }

    /* ── Empresa list ── */
    .empresa-list { list-style: none; padding: 4px 8px; overflow-y: auto; flex: 1; }
    .empresa-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 10px 10px;
      border-radius: 8px;
      cursor: pointer;
      border: 1px solid transparent;
    }
    .empresa-item:hover { background: var(--surface-glass); }
    .empresa-item--active {
      background: rgba(59,130,246,.1);
      border-color: rgba(59,130,246,.3);
    }
    .empresa-nombre { font-size: 12px; font-weight: 600; color: var(--text-primary); }
    .empresa-cuit   { font-size: 11px; color: var(--text-muted); }

    /* ── Badges ── */
    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 99px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .4px;
    }
    .badge[data-estado='ACTIVA']    { background: rgba(16,185,129,.15); color: #10b981; }
    .badge[data-estado='SUSPENDIDA']{ background: rgba(245,158,11,.15);  color: #f59e0b; }
    .badge[data-estado='INACTIVA']  { background: rgba(239,68,68,.15);   color: #ef4444; }
    .badge-rol { background: rgba(99,102,241,.12); color: #818cf8; font-size: 11px; }

    /* ── No selection ── */
    .no-selection {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: var(--text-muted);
      font-size: 13px;
    }

    /* ── Table ── */
    .table-wrap { overflow-x: auto; flex: 1; }
    .users-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .users-table th {
      text-align: left;
      padding: 8px 12px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .5px;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-glass);
      position: sticky; top: 0;
      background: var(--bg-base);
    }
    .users-table td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border-glass);
      color: var(--text-primary);
      vertical-align: middle;
    }
    .users-table tr:hover td { background: var(--surface-glass); }
    .cell-login { font-family: monospace; font-size: 11px; }
    .cell-email { color: var(--text-muted); }
    .cell-actions { white-space: nowrap; text-align: right; }

    /* ── Action buttons ── */
    .action-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 6px;
      font-size: 14px;
      line-height: 1;
    }
    .action-btn:hover { background: var(--surface-glass); }

    /* ── Pagination ── */
    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 10px;
      border-top: 1px solid var(--border-glass);
      flex-shrink: 0;
    }
    .page-btn {
      width: 28px; height: 28px;
      border-radius: 6px;
      border: 1px solid var(--border-glass);
      background: var(--surface-glass);
      color: var(--text-primary);
      cursor: pointer;
      font-size: 14px;
    }
    .page-btn:disabled { opacity: .35; cursor: default; }
    .page-info { font-size: 11px; color: var(--text-muted); }

    /* ── Buttons ── */
    .btn-primary {
      padding: 7px 14px;
      border-radius: 8px;
      border: none;
      background: var(--accent-blue);
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-primary:disabled { opacity: .5; cursor: default; }
    .btn-ghost {
      padding: 7px 14px;
      border-radius: 8px;
      border: 1px solid var(--border-glass);
      background: transparent;
      color: var(--text-primary);
      font-size: 12px;
      cursor: pointer;
    }
    .link-btn {
      background: none; border: none; cursor: pointer;
      color: var(--accent-blue); font-size: 12px; text-decoration: underline;
    }

    /* ── Forms ── */
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .field { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--text-muted); }
    .field input, .field select {
      padding: 7px 10px;
      border-radius: 8px;
      border: 1px solid var(--border-glass);
      background: var(--surface-glass);
      color: var(--text-primary);
      font-size: 12px;
      outline: none;
    }
    .field input:focus, .field select:focus { border-color: var(--accent-blue); }
    .field--inline { flex-direction: row; align-items: center; gap: 8px; }
    .field-error { font-size: 11px; color: #ef4444; margin-top: 4px; }

    .checkbox-group { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
    .checkbox-item {
      display: flex; align-items: center; gap: 5px;
      font-size: 11px; color: var(--text-secondary);
      cursor: pointer;
    }

    .error-inline {
      padding: 12px 16px;
      font-size: 12px;
      color: var(--text-muted);
    }

    /* ── Responsive: mobile stack ── */
    @media (max-width: 767px) {
      .admin-layout { flex-direction: column; overflow: auto; }
      .panel-left  { width: 100%; border-right: none; border-bottom: 1px solid var(--border-glass); max-height: 40vh; overflow-y: auto; }
      .panel-right { min-height: 60vh; }
      .form-grid   { grid-template-columns: 1fr; }
    }
  `],
})
export class AdminGlobalComponent implements OnInit {
  protected readonly PAGE_SIZE = PAGE_SIZE;
  protected readonly ALL_ROLES = ALL_ROLES;
  protected readonly ASSIGNABLE_AUTHORITIES = ASSIGNABLE_AUTHORITIES;

  private readonly empresaApi = inject(EmpresaApiService);
  private readonly adminUserApi = inject(AdminUserApiService);
  private readonly feedback = inject(UserFeedbackService);

  // ── Empresas state ──
  readonly empresas = signal<EmpresaDTO[]>([]);
  readonly totalEmpresas = signal(0);
  readonly empresaPage = signal(0);
  readonly loadingEmpresas = signal(false);
  readonly errorEmpresas = signal(false);
  readonly totalEmpresaPages = computed(() => Math.max(1, Math.ceil(this.totalEmpresas() / PAGE_SIZE)));

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
    authorities: string[];
  } = this.blankCreateForm();

  editForm: {
    email: string;
    firstName: string;
    lastName: string;
    activated: boolean;
    authorities: string[];
  } = this.blankEditForm();

  readonly pwForm = signal({ newPassword: '', confirmPassword: '' });
  readonly pwMismatch = computed(
    () => !!this.pwForm().confirmPassword && this.pwForm().newPassword !== this.pwForm().confirmPassword,
  );

  ngOnInit(): void {
    this.loadEmpresas();
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
        authorities: this.createForm.authorities,
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
      authorities: [...(item.user.authorities ?? [])],
    };
    this.showEditUser.set(item);
  }

  submitEditUser(): void {
    const item = this.showEditUser();
    if (!item) return;
    this.saving.set(true);

    const updated: AdminUserDTO = {
      ...item.user,
      email: this.editForm.email.trim().toLowerCase(),
      firstName: this.editForm.firstName.trim(),
      lastName: this.editForm.lastName.trim(),
      activated: this.editForm.activated,
      authorities: this.editForm.authorities,
    };

    this.adminUserApi.updateUser(item.user.login, updated).subscribe({
      next: (dto) => {
        this.saving.set(false);
        this.showEditUser.set(null);
        this.users.update(list =>
          list.map(u => u.id === item.id ? { ...u, user: dto } : u),
        );
        this.feedback.push({ type: 'success', title: 'Usuario actualizado', message: dto.login });
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

  // ── Helpers ──

  toggleAuthority(list: string[], auth: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked && !list.includes(auth)) {
      list.push(auth);
    } else if (!checked) {
      const idx = list.indexOf(auth);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  private blankCreateForm() {
    return {
      login: '',
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      rolCentro: 'OPERADOR' as RolCentro,
      authorities: ['ROLE_USER'],
    };
  }

  private blankEditForm() {
    return { email: '', firstName: '', lastName: '', activated: true, authorities: [] as string[] };
  }
}
