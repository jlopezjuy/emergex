import { Component, input, output, signal, inject, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StaffApiService } from '../../../../data-access/api/staff.api';

import { SpecialtyGroup, CatalogItem, SPEC_GROUP_COLOR } from '../../models/staff.interfaces';

@Component({
  selector: 'app-specialties-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './specialties-modal.component.html',
  styleUrl: './specialties-modal.component.scss'
})
export class SpecialtiesModalComponent {
  private staffApi = inject(StaffApiService);
  protected readonly Number = Number;

  // Angular 19 Signal Inputs & Outputs
  isOpen = input(false);
  catalog = input<CatalogItem[]>([]);
  loadingSpecialties = input(false);
  
  close = output<void>();
  catalogChanged = output<void>();

  // Internals
  savingSpecialty = signal(false);
  newSpecialtyForm = signal({
    nombre: '',
    descripcion: '',
    requiereCertificacion: false,
    aniosFormacion: 0 as number | null
  });

  resetNewSpecialtyForm(): void {
    this.newSpecialtyForm.set({
      nombre: '',
      descripcion: '',
      requiereCertificacion: false,
      aniosFormacion: 0
    });
  }

  updateNewSpecialtyForm(patch: Partial<{ nombre: string; descripcion: string; requiereCertificacion: boolean; aniosFormacion: number | null }>): void {
    this.newSpecialtyForm.set({ ...this.newSpecialtyForm(), ...patch });
  }

  groupColor(group: string): { bg: string; fg: string; border: string } {
    return SPEC_GROUP_COLOR[group as SpecialtyGroup] ?? { bg: 'rgba(148,163,184,0.1)', fg: 'var(--text-muted)', border: 'rgba(148,163,184,0.2)' };
  }

  canSaveSpecialty(): boolean {
    const f = this.newSpecialtyForm();
    return f.nombre.trim().length > 0 && !this.savingSpecialty();
  }

  saveSpecialty(): void {
    if (!this.canSaveSpecialty()) return;
    const form = this.newSpecialtyForm();

    this.savingSpecialty.set(true);
    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      aniosFormacion: form.aniosFormacion,
      requiereCertificacion: form.requiereCertificacion
    };

    this.staffApi.createSubespecialidad(payload).subscribe({
      next: () => {
        this.savingSpecialty.set(false);
        this.resetNewSpecialtyForm();
        this.catalogChanged.emit();
      },
      error: () => {
        this.savingSpecialty.set(false);
      }
    });
  }

  deleteSpecialty(id: number): void {
    if (!confirm('¿Está seguro de eliminar esta especialidad del catálogo?')) return;
    this.staffApi.deleteSubespecialidad(id).subscribe({
      next: () => {
        this.catalogChanged.emit();
      },
      error: () => {}
    });
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.isOpen()) {
      this.close.emit();
    }
  }
}
