import { Component, input, output, signal, computed, effect, inject, DestroyRef, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StaffApiService, IProfesionalOnboardingRequest } from '../../../../data-access/api/staff.api';
import { OnboardingEmailEstado, OnboardingEmailStatusDTO, ProfesionalAccesoDTO, ProfesionalOnboardingResultDTO } from '../../../../data-access/dto/staff.dto';
import { CatalogItem, StaffMember, StaffForm, SpecialtyGroup, PREFIX_OPTIONS, SPEC_GROUP_COLOR, emptyForm, specById } from '../../models/staff.interfaces';
import { AuthService } from '../../../../core/auth/auth.service';
import { UserFeedbackService } from '../../../../core/notifications/user-feedback.service';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_LABELS: Record<string, string> = {
  ROLE_PROFESIONAL: 'Profesional de salud',
  ROLE_MEDICO_CAMPO: 'Médico de campo',
  ROLE_CHOFER: 'Chofer',
  ROLE_OPERADOR: 'Operador',
  ROLE_DESPACHANTE: 'Despachante',
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  ROLE_PROFESIONAL: 'Atiende pacientes: consultas, visitas domiciliarias y guardias.',
  ROLE_MEDICO_CAMPO: 'Atención médica en terreno y emergencias.',
  ROLE_CHOFER: 'Conduce la ambulancia o el móvil asignado.',
  ROLE_OPERADOR: 'Coordina despachos y seguimiento desde la central.',
  ROLE_DESPACHANTE: 'Asigna móviles y gestiona el ingreso de casos.',
};

type ResultMode = 'created' | 'invited';
type WizardStep = 1 | 2 | 3;

@Component({
  selector: 'app-staff-form-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './staff-form-modal.component.html',
  styleUrl: './staff-form-modal.component.scss'
})
export class StaffFormModalComponent {
  private destroyRef = inject(DestroyRef);
  private staffApi = inject(StaffApiService);
  private auth = inject(AuthService);
  private feedback = inject(UserFeedbackService);
  protected readonly Number = Number;

  // Signal Inputs (Angular 21)
  isOpen = input<boolean>(false);
  member = input<StaffMember | null>(null);
  catalog = input<CatalogItem[]>([]);
  systemAuthorities = input<string[]>([]);

  // Outputs
  close = output<void>();
  saved = output<void>();

  // Form state
  form = signal<StaffForm>(emptyForm());
  specQuery = signal('');
  specDropOpen = signal(false);
  saving = signal(false);

  // Wizard (solo alta nueva; edición se muestra en una sola pantalla)
  wizardStep = signal<WizardStep>(1);
  readonly stepLabels: Record<WizardStep, string> = {
    1: 'Datos del profesional',
    2: 'Acceso al sistema',
    3: 'Perfil médico y operativo',
  };

  // Email / acceso validation (create mode)
  emailStatus = signal<'idle' | 'checking' | OnboardingEmailEstado>('idle');
  emailStatusInfo = signal<OnboardingEmailStatusDTO | null>(null);
  private emailInput$ = new Subject<string>();

  // Acceso existente (edit mode)
  accesoInfo = signal<ProfesionalAccesoDTO | null>(null);
  loadingAcceso = signal(false);
  resendingInvite = signal(false);

  // Result screen (post-creation / post-reenvío)
  result = signal<ProfesionalOnboardingResultDTO | null>(null);
  resultMode = signal<ResultMode>('created');
  sendingEmail = signal(false);
  copied = signal<string | null>(null);

  // Constants
  readonly prefixOptions = PREFIX_OPTIONS;
  readonly specGroups: SpecialtyGroup[] = ['Médica', 'Enfermería', 'Operativo'];

  readonly empresaNombre = computed(() => this.auth.currentAccount()?.empresa?.nombre ?? '');

  constructor() {
    effect(() => {
      const m = this.member();
      const open = this.isOpen();
      if (open) {
        this.result.set(null);
        this.accesoInfo.set(null);
        this.emailStatus.set('idle');
        this.emailStatusInfo.set(null);
        this.wizardStep.set(1);

        if (m) {
          this.form.set({
            prefix:                  m.prefix,
            firstName:               m.firstName,
            lastName:                m.lastName,
            matricula:               m.matricula,
            documento:               m.documento ?? '',
            phone:                   m.phone,
            email:                   m.email,
            specialties:             [...m.specialties],
            domiciliary:             m.domiciliary,
            emergency:               m.emergency,
            active:                  m.active,
            username:                m.userLogin ?? '',
            authorities:             ['ROLE_USER'],
            especialidadPrincipalId: m.especialidadPrincipalId ?? null,
            existingUserId:          m.userId ?? null,
            confirmarVinculoOtraEmpresa: false,
          });

          this.staffApi.getAuthoritiesByProfesional(Number(m.id)).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (auths) => this.patchForm({ authorities: auths }),
          });
          this.loadAcceso(Number(m.id));
        } else {
          this.form.set(emptyForm());
        }
        this.specQuery.set('');
        this.specDropOpen.set(false);
      }
    });

    this.emailInput$
      .pipe(
        debounceTime(450),
        distinctUntilChanged(),
        switchMap((email) => {
          if (!EMAIL_RE.test(email)) {
            this.emailStatus.set('idle');
            this.emailStatusInfo.set(null);
            return of(null);
          }
          this.emailStatus.set('checking');
          const f = this.form();
          return this.staffApi.checkEmail(email, f.firstName, f.lastName).pipe(
            catchError(() => {
              // La validación final siempre se re-verifica en backend al guardar;
              // si el pre-check falla (red/servidor) no bloqueamos el flujo.
              this.emailStatus.set('idle');
              this.emailStatusInfo.set(null);
              return of(null);
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((status) => {
        if (!status) return;
        this.emailStatusInfo.set(status);
        this.emailStatus.set(status.estado);
        if (status.estado === 'DISPONIBLE') {
          this.patchForm({ existingUserId: null, username: status.loginSugerido ?? this.form().username });
        } else {
          this.patchForm({ existingUserId: status.userId ?? null, confirmarVinculoOtraEmpresa: false });
        }
      });
  }

  private loadAcceso(profesionalId: number): void {
    this.loadingAcceso.set(true);
    this.staffApi.getAcceso(profesionalId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (acceso) => { this.accesoInfo.set(acceso); this.loadingAcceso.set(false); },
      error: () => this.loadingAcceso.set(false),
    });
  }

  // Computed
  readonly isEditing = computed(() => this.member() !== null);

  // Paso 1 (Datos del profesional + email): también aplica como validación de
  // edición, donde no hay wizard pero el correo no se re-exige por ser un campo fijo.
  readonly step1Valid = computed(() => {
    const f = this.form();
    if (!f.firstName.trim() || !f.lastName.trim() || !f.matricula.trim()) return false;
    if (this.isEditing()) return true;
    if (!EMAIL_RE.test(f.email.trim())) return false;
    const status = this.emailStatus();
    if (status === 'idle' || status === 'checking') return false;
    if (status === 'USUARIO_YA_PROFESIONAL') return false;
    return true;
  });

  // Paso 2 (Acceso al sistema): solo exige la confirmación explícita de vínculo
  // cruzado de empresa; en edición no hay nada que validar acá.
  readonly step2Valid = computed(() => {
    if (this.isEditing()) return true;
    const status = this.emailStatus();
    if (status === 'USUARIO_EN_OTRA_EMPRESA' && !this.form().confirmarVinculoOtraEmpresa) return false;
    return true;
  });

  // Paso 3 (Perfil médico y operativo)
  readonly step3Valid = computed(() => {
    const f = this.form();
    return f.specialties.length > 0 && f.especialidadPrincipalId != null;
  });

  readonly canAdvance = computed(() => {
    if (this.wizardStep() === 1) return this.step1Valid();
    if (this.wizardStep() === 2) return this.step2Valid();
    return true;
  });

  readonly canSubmit = computed(() => {
    if (this.saving()) return false;
    return this.step1Valid() && this.step2Valid() && this.step3Valid();
  });

  readonly filteredSpecs = computed(() => {
    const q = this.specQuery().toLowerCase();
    return this.catalog().filter(s =>
      !q || s.name.toLowerCase().includes(q) || s.group.toLowerCase().includes(q)
    );
  });

  // Helpers
  getSpec(id: string): CatalogItem | undefined {
    return specById(this.catalog(), id);
  }

  groupColor(group: string): { bg: string; fg: string; border: string } {
    return SPEC_GROUP_COLOR[group as SpecialtyGroup] ?? { bg: 'rgba(148,163,184,0.1)', fg: 'var(--text-muted)', border: 'rgba(148,163,184,0.2)' };
  }

  filteredSpecsByGroup(group: SpecialtyGroup): CatalogItem[] {
    return this.filteredSpecs().filter(s => s.group === group);
  }

  roleLabel(role: string): string {
    return ROLE_LABELS[role] ?? this.humanizeRole(role);
  }

  roleDescription(role: string): string {
    return ROLE_DESCRIPTIONS[role] ?? '';
  }

  private humanizeRole(role: string): string {
    const raw = role.replace('ROLE_', '').toLowerCase().replace(/_/g, ' ');
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  // Form actions
  closeForm(): void {
    if (this.result()) {
      // El profesional ya fue creado: cerrar equivale a finalizar, refrescamos el listado.
      this.finalizeResult();
      return;
    }
    this.close.emit();
  }

  patchForm(patch: Partial<StaffForm>): void {
    this.form.set({ ...this.form(), ...patch });
  }

  goNext(): void {
    if (!this.canAdvance()) return;
    if (this.wizardStep() < 3) this.wizardStep.set((this.wizardStep() + 1) as WizardStep);
  }

  goBack(): void {
    if (this.wizardStep() > 1) this.wizardStep.set((this.wizardStep() - 1) as WizardStep);
  }

  onEmailChange(value: string): void {
    this.patchForm({ email: value });
    if (!this.isEditing()) {
      this.emailInput$.next(value.trim().toLowerCase());
    }
  }

  toggleAuthority(role: string): void {
    const current = this.form().authorities;
    if (current.includes(role)) {
      this.patchForm({ authorities: current.filter(r => r !== role) });
    } else {
      this.patchForm({ authorities: [...current, role] });
    }
  }

  toggleSpecialty(id: string): void {
    const current = this.form().specialties;
    let nextSpecialties = [...current];
    if (current.includes(id)) {
      nextSpecialties = current.filter(s => s !== id);
    } else {
      nextSpecialties.push(id);
    }

    let principalId = this.form().especialidadPrincipalId;
    if (nextSpecialties.length === 0) {
      principalId = null;
    } else if (principalId === null || !nextSpecialties.includes(String(principalId))) {
      principalId = Number(nextSpecialties[0]);
    }

    this.patchForm({
      specialties: nextSpecialties,
      especialidadPrincipalId: principalId
    });
  }

  removeSpecialty(id: string): void {
    const nextSpecialties = this.form().specialties.filter(s => s !== id);
    let principalId = this.form().especialidadPrincipalId;
    if (nextSpecialties.length === 0) {
      principalId = null;
    } else if (principalId === null || !nextSpecialties.includes(String(principalId))) {
      principalId = Number(nextSpecialties[0]);
    }

    this.patchForm({
      specialties: nextSpecialties,
      especialidadPrincipalId: principalId
    });
  }

  setPrincipalSpecialty(id: string): void {
    this.patchForm({ especialidadPrincipalId: Number(id) });
  }

  saveForm(): void {
    if (!this.canSubmit()) return;
    const f = this.form();
    const editing = this.member();
    this.saving.set(true);

    const payload: IProfesionalOnboardingRequest = {
      profesional: {
        nombre:               f.firstName.trim(),
        apellido:             f.lastName.trim(),
        matricula:            f.matricula.trim(),
        documento:            f.documento.trim() || null,
        telefono:             f.phone.trim() || null,
        email:                f.email.trim() || null,
        atencionDomiciliaria: f.domiciliary,
        atencionEmergencia:   f.emergency,
        activo:               f.active,
      },
      especialidades: {
        especialidadPrincipalId: Number(f.especialidadPrincipalId),
        subespecialidadIds:      f.specialties.map(id => Number(id)),
      },
      usuario: {
        username:                    f.username.trim() || null,
        email:                       f.email.trim() || null,
        existingUserId:              f.existingUserId,
        confirmarVinculoOtraEmpresa: f.confirmarVinculoOtraEmpresa,
        authorities:                 f.authorities,
      }
    };

    if (editing) {
      this.staffApi.onboardingUpdate(Number(editing.id), payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => { this.saved.emit(); this.closeAndReset(); },
        error: () => this.saving.set(false),
      });
    } else {
      this.staffApi.onboardingCreate(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (res) => {
          this.saving.set(false);
          this.resultMode.set('created');
          this.result.set(res);
          // El listado se refresca recién al finalizar la pantalla de resultado,
          // para no cerrar el modal antes de que el admin copie/envíe las credenciales.
        },
        error: () => this.saving.set(false),
      });
    }
  }

  // Reenvío de invitación desde edición (cuenta pendiente de activación)
  reenviarInvitacion(): void {
    const editing = this.member();
    if (!editing) return;
    this.resendingInvite.set(true);
    this.staffApi.reenviarInvitacion(Number(editing.id)).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.resendingInvite.set(false);
        this.resultMode.set('invited');
        this.result.set(res);
      },
      error: () => this.resendingInvite.set(false),
    });
  }

  // Reintentar / enviar el correo de invitación desde la pantalla de resultado
  enviarPorCorreo(): void {
    const r = this.result();
    if (!r) return;
    this.sendingEmail.set(true);
    this.staffApi.enviarInvitacion(r.userId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ emailEnviado }) => {
        this.sendingEmail.set(false);
        this.result.set({ ...r, emailEnviado });
        this.feedback.push({
          type: emailEnviado ? 'success' : 'warning',
          title: emailEnviado ? 'Correo enviado' : 'No se pudo enviar',
          message: emailEnviado
            ? `Invitación reenviada a ${r.email}.`
            : 'No se pudo enviar el correo. Podés copiar el enlace y enviarlo manualmente.',
        });
      },
      error: () => this.sendingEmail.set(false),
    });
  }

  buildInvitationMessage(r: ProfesionalOnboardingResultDTO): string {
    return (
      `Hola, ${r.nombreCompleto}.\n\n` +
      `Se creó tu acceso al sistema Emergex para ${r.empresaNombre}.\n\n` +
      `Usuario: ${r.login}\n` +
      `Correo: ${r.email}\n\n` +
      `Para activar tu cuenta y definir tu contraseña ingresá al siguiente enlace:\n${r.activationLink}\n\n` +
      `Por seguridad, este enlace es personal y tiene una duración limitada.\n\n` +
      `Ante cualquier inconveniente, comunicate con la administración.`
    );
  }

  copyToClipboard(text: string, key: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.copied.set(key);
      window.setTimeout(() => {
        if (this.copied() === key) this.copied.set(null);
      }, 1500);
    });
  }

  finalizeResult(): void {
    this.result.set(null);
    this.saved.emit();
    this.close.emit();
  }

  private closeAndReset(): void {
    this.saving.set(false);
    this.close.emit();
  }

  @HostListener('document:click')
  closeDropdownOnOutsideClick(): void {
    this.specDropOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.specDropOpen()) { this.specDropOpen.set(false); return; }
    if (this.isOpen()) { this.closeForm(); }
  }
}
