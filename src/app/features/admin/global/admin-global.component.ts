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
        <div class="screen-head flex-shrink-0" style="padding: 12px 14px; border-bottom: 1px solid var(--border-hairline);">
          <div class="screen-head__title">
            <div class="screen-head__icon" style="width: 28px; height: 28px; border-radius: 6px; color: var(--accent-cyan);">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 style="font-size: 13px; font-weight: 600; color: var(--text-primary); letter-spacing: -0.01em; margin: 0;">Empresas</h2>
            </div>
          </div>
        </div>

        <div class="px-3 py-2" style="border-bottom: 1px solid var(--border-hairline);">
          <input
            class="qc-input"
            type="search"
            placeholder="Buscar empresa…"
            [(ngModel)]="empresaSearchInput"
            (ngModelChange)="onEmpresaSearchChange($event)"
            style="height: 32px; font-size: 12px;"
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
                <span
                  class="badge mt-1"
                  [class.badge--stable]="e.estado === 'ACTIVA'"
                  [class.badge--urgent]="e.estado === 'SUSPENDIDA'"
                  [class.badge--critical]="e.estado === 'INACTIVA'"
                  style="font-size: 9px; padding: 1px 6px;"
                >
                  {{ e.estado }}
                </span>
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
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.2" style="color: var(--text-muted);">
              <rect x="6" y="10" width="36" height="28" rx="3"/>
              <path d="M16 10V6M32 10V6M6 22h36"/>
            </svg>
            <p style="color: var(--text-secondary);">Seleccioná una empresa para ver sus usuarios</p>
          </div>
        } @else {
          <div class="screen-head flex-shrink-0" style="padding: 14px 18px; border-bottom: 1px solid var(--border-hairline);">
            <div class="screen-head__title">
              <div class="screen-head__icon" style="color: var(--accent-blue);">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h2 style="font-size: 16px; font-weight: 600; color: var(--text-primary); margin: 0;">{{ selectedEmpresa()!.nombre }}</h2>
                <p class="eyebrow" style="color: var(--text-secondary); margin-top: 2px; font-size: 10px;">
                  {{ selectedEmpresa()!.cuit }} · {{ selectedEmpresa()!.ciudad }}
                </p>
              </div>
            </div>
            <div class="screen-head__actions">
              <button class="btn btn--primary btn--sm" (click)="openCreateUser()">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Nuevo usuario
              </button>
            </div>
          </div>

          <div class="px-4 py-3" style="border-bottom: 1px solid var(--border-hairline);">
            <input
              class="qc-input"
              type="search"
              placeholder="Buscar usuario por login, nombre o email…"
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
            <div class="data-table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Login</th>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol empresa</th>
                    <th>Estado</th>
                    <th style="text-align: right;">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of users(); track item.id) {
                    <tr>
                      <td class="cell-login" style="font-family: var(--font-mono); color: var(--accent-cyan); font-weight: 500;">
                        {{ item.user.login }}
                      </td>
                      <td style="font-weight: 500;">{{ item.user.firstName }} {{ item.user.lastName }}</td>
                      <td style="color: var(--text-secondary);">{{ item.user.email }}</td>
                      <td>
                        <span class="badge badge--info">{{ item.rol }}</span>
                      </td>
                      <td>
                        <span
                          class="badge"
                          [class.badge--stable]="item.user.activated"
                          [class.badge--critical]="!item.user.activated"
                        >
                          {{ item.user.activated ? 'Activo' : 'Inactivo' }}
                        </span>
                      </td>
                      <td style="text-align: right; white-space: nowrap;">
                        <button class="action-icon" title="Editar" (click)="openEditUser(item)" style="margin-right: 6px;">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 20h9"/>
                            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                          </svg>
                        </button>
                        <button class="action-icon" title="Cambiar contraseña" (click)="openChangePassword(item)" style="margin-right: 6px;">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                          </svg>
                        </button>
                        @if (item.user.activated) {
                          <button
                            class="action-icon"
                            data-variant="danger"
                            title="Desactivar"
                            (click)="toggleActive(item)"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                              <circle cx="9" cy="7" r="4"/>
                              <line x1="17" y1="8" x2="22" y2="13"/>
                              <line x1="22" y1="8" x2="17" y2="13"/>
                            </svg>
                          </button>
                        } @else {
                          <button
                            class="action-icon"
                            data-variant="success"
                            title="Activar"
                            (click)="toggleActive(item)"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                              <circle cx="9" cy="7" r="4"/>
                              <polyline points="16 11 18 13 22 9"/>
                            </svg>
                          </button>
                        }
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
        <form (ngSubmit)="submitCreateUser()" #createFormRef="ngForm" class="flex flex-col gap-4">
          <div class="form-grid">
            <div class="flex flex-col gap-1">
              <label class="modal-label">Login *</label>
              <input type="text" [(ngModel)]="createForm.login" name="login" required autocomplete="off" class="qc-input" placeholder="Nombre de usuario" />
            </div>
            
            <div class="flex flex-col gap-1">
              <label class="modal-label">Email *</label>
              <input type="email" [(ngModel)]="createForm.email" name="email" required class="qc-input" placeholder="usuario@empresa.com" />
            </div>
            
            <div class="flex flex-col gap-1">
              <label class="modal-label">Nombre</label>
              <input type="text" [(ngModel)]="createForm.firstName" name="firstName" class="qc-input" placeholder="Nombre" />
            </div>
            
            <div class="flex flex-col gap-1">
              <label class="modal-label">Apellido</label>
              <input type="text" [(ngModel)]="createForm.lastName" name="lastName" class="qc-input" placeholder="Apellido" />
            </div>
            
            <div class="flex flex-col gap-1">
              <label class="modal-label">Contraseña *</label>
              <input type="password" [(ngModel)]="createForm.password" name="password" required minlength="4" autocomplete="new-password" class="qc-input" placeholder="Min. 4 caracteres" />
            </div>
            
            <div class="flex flex-col gap-1">
              <label class="modal-label">Rol en empresa *</label>
              <select [(ngModel)]="createForm.rolCentro" name="rolCentro" required class="qc-input">
                @for (r of ALL_ROLES; track r) {
                  <option [value]="r">{{ r }}</option>
                }
              </select>
            </div>
          </div>

          <div class="flex flex-col gap-1.5 mt-2">
            <label class="modal-label">Permisos en la plataforma (Authorities)</label>
            <div class="authorities-grid">
              @for (auth of ASSIGNABLE_AUTHORITIES; track auth) {
                <label class="authority-label">
                  <input
                    type="checkbox"
                    class="authority-checkbox"
                    [checked]="createForm.authorities.includes(auth)"
                    (change)="toggleAuthority(createForm.authorities, auth, $event)"
                  />
                  <span>{{ auth.replace('ROLE_', '') }}</span>
                </label>
              }
            </div>
          </div>
        </form>

        <div footer class="flex gap-2">
          <button class="btn btn--ghost btn--sm" (click)="showCreateUser.set(false)">Cancelar</button>
          <button class="btn btn--primary btn--sm" [disabled]="saving() || createFormRef.invalid" (click)="submitCreateUser()">
            {{ saving() ? 'Guardando…' : 'Crear usuario' }}
          </button>
        </div>
      </emx-modal-shell>
    }

    <!-- ── MODAL: Editar usuario ── -->
    @if (showEditUser()) {
      <emx-modal-shell title="Editar usuario" (closed)="showEditUser.set(null)">
        <form #editFormRef="ngForm" class="flex flex-col gap-4">
          <div class="form-grid">
            <div class="flex flex-col gap-1">
              <label class="modal-label">Login (Deshabilitado)</label>
              <input type="text" [value]="showEditUser()!.user.login" disabled class="qc-input" style="opacity: 0.5; cursor: not-allowed;" />
            </div>
            
            <div class="flex flex-col gap-1">
              <label class="modal-label">Email *</label>
              <input type="email" [(ngModel)]="editForm.email" name="email" required class="qc-input" placeholder="usuario@empresa.com" />
            </div>
            
            <div class="flex flex-col gap-1">
              <label class="modal-label">Nombre</label>
              <input type="text" [(ngModel)]="editForm.firstName" name="firstName" class="qc-input" placeholder="Nombre" />
            </div>
            
            <div class="flex flex-col gap-1">
              <label class="modal-label">Apellido</label>
              <input type="text" [(ngModel)]="editForm.lastName" name="lastName" class="qc-input" placeholder="Apellido" />
            </div>

            <div class="col-span-2 py-1 mt-1">
              <label class="authority-label">
                <input
                  type="checkbox"
                  [(ngModel)]="editForm.activated"
                  name="activated"
                  id="editActivatedCheckbox"
                  class="authority-checkbox"
                />
                <span>Usuario activo (Habilitado para ingresar a la plataforma)</span>
              </label>
            </div>
          </div>

          <div class="flex flex-col gap-1.5 mt-2">
            <label class="modal-label">Permisos en la plataforma (Authorities)</label>
            <div class="authorities-grid">
              @for (auth of ASSIGNABLE_AUTHORITIES; track auth) {
                <label class="authority-label">
                  <input
                    type="checkbox"
                    class="authority-checkbox"
                    [checked]="editForm.authorities.includes(auth)"
                    (change)="toggleAuthority(editForm.authorities, auth, $event)"
                  />
                  <span>{{ auth.replace('ROLE_', '') }}</span>
                </label>
              }
            </div>
          </div>
        </form>

        <div footer class="flex gap-2">
          <button class="btn btn--ghost btn--sm" (click)="showEditUser.set(null)">Cancelar</button>
          <button class="btn btn--primary btn--sm" [disabled]="saving() || editFormRef.invalid" (click)="submitEditUser()">
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
          <div class="flex flex-col gap-1">
            <label class="modal-label">Nueva contraseña *</label>
            <input
              type="password"
              [ngModel]="pwForm().newPassword"
              (ngModelChange)="pwForm.update(f => ({ ...f, newPassword: $event }))"
              name="newPassword"
              minlength="4"
              autocomplete="new-password"
              class="qc-input"
              placeholder="Min. 4 caracteres"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="modal-label">Confirmar contraseña *</label>
            <input
              type="password"
              [ngModel]="pwForm().confirmPassword"
              (ngModelChange)="pwForm.update(f => ({ ...f, confirmPassword: $event }))"
              name="confirmPassword"
              autocomplete="new-password"
              class="qc-input"
              placeholder="Confirmar contraseña"
            />
          </div>
        </div>
        @if (pwMismatch()) {
          <p class="text-xs mt-2" style="color: var(--accent-red); font-weight: 500;">Las contraseñas no coinciden.</p>
        }

        <div footer class="flex gap-2">
          <button class="btn btn--ghost btn--sm" (click)="showChangePassword.set(null)">Cancelar</button>
          <button
            class="btn btn--primary btn--sm"
            [disabled]="saving() || pwMismatch() || !pwForm().newPassword"
            (click)="submitChangePassword()"
          >
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
      background-color: var(--bg-deep);
    }

    /* ── Panels ── */
    .panel {
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }
    .panel-left  {
      width: 280px;
      flex-shrink: 0;
      background: var(--bg-elevated);
      border-right: 1px solid var(--border-glass);
    }
    .panel-right {
      flex: 1;
      background: transparent;
    }

    /* ── Empresa list ── */
    .empresa-list {
      list-style: none;
      padding: 8px;
      overflow-y: auto;
      flex: 1;
    }
    .empresa-item {
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding: 10px 12px;
      border-radius: 8px;
      cursor: pointer;
      border-left: 2px solid transparent;
      transition: all 0.15s ease;
      margin-bottom: 4px;
    }
    .empresa-item:hover {
      background: rgba(255, 255, 255, 0.03);
    }
    .empresa-item--active {
      background: rgba(59, 130, 246, 0.08);
      border-left-color: var(--accent-blue);
    }
    .empresa-nombre {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-primary);
    }
    .empresa-cuit {
      font-size: 11px;
      color: var(--text-secondary);
      font-family: var(--font-mono);
    }

    /* ── No selection ── */
    .no-selection {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: var(--text-secondary);
      font-size: 13.5px;
    }

    /* ── Table cell details ── */
    .cell-login {
      font-family: var(--font-mono);
      font-size: 11.5px;
    }

    /* ── Pagination ── */
    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 10px;
      border-top: 1px solid var(--border-hairline);
      flex-shrink: 0;
    }
    .page-btn {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: 1px solid var(--border-glass);
      background: var(--surface-glass);
      color: var(--text-primary);
      cursor: pointer;
      font-size: 14px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    .page-btn:hover:not(:disabled) {
      border-color: var(--border-strong);
      background: rgba(255, 255, 255, 0.06);
    }
    .page-btn:disabled {
      opacity: .35;
      cursor: not-allowed;
    }
    .page-info {
      font-size: 11px;
      color: var(--text-secondary);
      font-family: var(--font-mono);
    }

    /* ── Link button ── */
    .link-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--accent-blue);
      font-size: 12px;
      text-decoration: underline;
    }

    /* ── Forms Grid ── */
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .error-inline {
      padding: 12px 16px;
      font-size: 12px;
      color: var(--text-secondary);
    }

    /* ── Labels & Checkboxes (Refined emergency style) ── */
    .modal-label {
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--text-secondary);
      margin-bottom: 6px;
      display: block;
    }
    .authorities-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 16px;
      margin-top: 4px;
    }
    .authority-label {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--text-primary);
      font-size: 13px;
      font-weight: 500;
      transition: color 0.15s ease;
      cursor: pointer;
      user-select: none;
    }
    .authority-label:hover {
      color: var(--text-strong);
    }
    .authority-checkbox {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      background: var(--bg-deep) !important;
      border: 1px solid var(--border-glass) !important;
      cursor: pointer;
      accent-color: var(--accent-blue);
      outline: none;
      transition: all 0.15s ease;
    }
    .authority-checkbox:hover {
      border-color: var(--accent-blue) !important;
    }

    /* ── Light Theme Overrides ── */
    :host-context([data-theme="light"]) .qc-input {
      background: #f8fafc !important;
      border-color: rgba(148, 163, 184, 0.35) !important;
      color: #0f172a !important;
    }
    :host-context([data-theme="light"]) .qc-input:focus {
      background: #ffffff !important;
      border-color: var(--accent-blue) !important;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
    }
    :host-context([data-theme="light"]) .qc-input::placeholder {
      color: #94a3b8 !important;
    }
    :host-context([data-theme="light"]) .empresa-item:hover {
      background: rgba(15, 23, 42, 0.03);
    }
    :host-context([data-theme="light"]) .data-table thead th {
      background: var(--surface-inset) !important;
      color: var(--text-secondary) !important;
    }
    :host-context([data-theme="light"]) .authority-checkbox {
      background: #ffffff !important;
      border-color: rgba(148, 163, 184, 0.45) !important;
    }
    :host-context([data-theme="light"]) .authority-label {
      color: #334155;
    }
    :host-context([data-theme="light"]) .authority-label:hover {
      color: #0f172a;
    }
    :host-context([data-theme="light"]) .page-btn:hover:not(:disabled) {
      background: rgba(15, 23, 42, 0.04) !important;
    }

    /* ── Responsive ── */
    @media (max-width: 767px) {
      .admin-layout { flex-direction: column; overflow: auto; }
      .panel-left  {
        width: 100%;
        border-right: none;
        border-bottom: 1px solid var(--border-glass);
        max-height: 45vh;
        overflow-y: auto;
      }
      .panel-right { min-height: 55vh; }
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
