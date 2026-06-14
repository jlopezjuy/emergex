import { Component, input, output, signal, computed, effect, inject, DestroyRef, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StaffApiService, IProfesionalOnboardingRequest } from '../../../../data-access/api/staff.api';
import { CatalogItem, StaffMember, StaffForm, SpecialtyGroup, PREFIX_OPTIONS, SPEC_GROUP_COLOR, emptyForm, specById } from '../../models/staff.interfaces';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
  protected readonly Number = Number;

  // Signal Inputs (Angular 19)
  isOpen = input<boolean>(false);
  member = input<StaffMember | null>(null);
  catalog = input<CatalogItem[]>([]);
  systemAuthorities = input<string[]>([]);

  // Outputs (Angular 19)
  close = output<void>();
  saved = output<void>();

  // State
  form = signal<StaffForm>(emptyForm());
  specQuery = signal('');
  specDropOpen = signal(false);
  saving = signal(false);

  // Constants
  readonly prefixOptions = PREFIX_OPTIONS;
  readonly specGroups: SpecialtyGroup[] = ['Médica', 'Enfermería'];

  constructor() {
    effect(() => {
      const m = this.member();
      const open = this.isOpen();
      if (open) {
        if (m) {
          this.form.set({
            prefix:                  m.prefix,
            firstName:               m.firstName,
            lastName:                m.lastName,
            matricula:               m.matricula,
            documento:               m.documento ?? '',
            phone:                   m.phone,
            email:                   m.email,
            linkedUser:              m.linkedUser,
            specialties:             [...m.specialties],
            domiciliary:             m.domiciliary,
            emergency:               m.emergency,
            active:                  m.active,
            username:                m.userLogin ?? (m.email ? m.email.split('@')[0] : ''),
            passwordTemporal:        '',
            authorities:             ['ROLE_USER'],
            especialidadPrincipalId: m.especialidadPrincipalId ?? null,
          });

          if (m.linkedUser) {
            this.staffApi.getAuthoritiesByProfesional(Number(m.id)).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
              next: (auths) => {
                this.patchForm({ authorities: auths });
              }
            });
          }
        } else {
          this.form.set(emptyForm());
        }
        this.specQuery.set('');
        this.specDropOpen.set(false);
      }
    });
  }

  // Computed
  readonly canSubmit = computed(() => {
    const f = this.form();
    return !this.saving() &&
      f.firstName.trim().length > 0 &&
      f.lastName.trim().length > 0 &&
      f.matricula.trim().length > 0 &&
      f.specialties.length > 0 &&
      f.especialidadPrincipalId != null;
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

  // Form actions
  closeForm(): void {
    this.close.emit();
  }

  patchForm(patch: Partial<StaffForm>): void {
    this.form.set({ ...this.form(), ...patch });
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
        username:         f.linkedUser ? (f.username.trim() || null) : null,
        email:            f.linkedUser ? (f.email.trim() || null) : null,
        passwordTemporal: f.linkedUser ? (f.passwordTemporal.trim() || null) : null,
        authorities:      f.linkedUser ? f.authorities : ['ROLE_USER'],
      }
    };

    if (editing) {
      const numId = Number(editing.id);
      this.staffApi.onboardingUpdate(numId, payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => { this.saved.emit(); this.closeForm(); this.saving.set(false); },
        error: () => this.saving.set(false),
      });
    } else {
      this.staffApi.onboardingCreate(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => { this.saved.emit(); this.closeForm(); this.saving.set(false); },
        error: () => this.saving.set(false),
      });
    }
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
