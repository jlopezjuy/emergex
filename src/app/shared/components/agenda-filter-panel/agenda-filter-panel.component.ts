import { Component, input, signal, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface AgendaFilters {
  professionalId: string | null;
  specialtyId: string | null;
  date: string | null;
  status: string | null;
}

@Component({
  selector: 'emx-agenda-filter-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agenda-filter-panel.component.html',
  styleUrls: ['./agenda-filter-panel.component.css']
})
export class AgendaFilterPanelComponent {
  // Available options passed from parent component
  professionals = input<{ id: string; name: string }[]>([]);
  specialties = input<{ id: string; name: string }[]>([]);
  statuses = input<{ value: string; label: string }[]>([]);

  // Selection signals representing the filter state
  selectedProfessionalId = signal<string | null>(null);
  selectedSpecialtyId = signal<string | null>(null);
  selectedDate = signal<string | null>(null);
  selectedStatus = signal<string | null>(null);

  // Emitters using Angular outputs
  filterChange = output<AgendaFilters>();

  constructor() {
    // Automatically emit filter updates whenever any selection signal changes
    effect(() => {
      this.filterChange.emit({
        professionalId: this.selectedProfessionalId(),
        specialtyId: this.selectedSpecialtyId(),
        date: this.selectedDate(),
        status: this.selectedStatus()
      });
    });
  }

  // Set individual filters
  setProfessional(id: string | null) {
    this.selectedProfessionalId.set(id);
  }

  setSpecialty(id: string | null) {
    this.selectedSpecialtyId.set(id);
  }

  setDate(date: string | null) {
    this.selectedDate.set(date);
  }

  setStatus(status: string | null) {
    this.selectedStatus.set(status);
  }

  // Clear all selections to reset filters
  clearFilters() {
    this.selectedProfessionalId.set(null);
    this.selectedSpecialtyId.set(null);
    this.selectedDate.set(null);
    this.selectedStatus.set(null);
  }
}
