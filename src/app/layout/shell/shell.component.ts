import { Component, inject, signal, computed, HostListener, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { EmergencyQuickCreateModalComponent } from '../../shared/components/emergency/emergency-quick-create-modal/emergency-quick-create-modal.component';
import { InstitutionalModalComponent } from '../../shared/components/emergency/institutional-modal/institutional-modal.component';
import { EmergencyApiService } from '../../data-access/api/emergency.api';
import { EmergencyStore } from '../../core/stores/emergency.store';
import { FleetStore } from '../../core/stores/fleet.store';
import { AuthService } from '../../core/auth/auth.service';
import { CrearTicketRequest } from '../../data-access/dto/ticket.dto';

@Component({
  selector: 'emx-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    SidebarComponent,
    HeaderComponent,
    EmergencyQuickCreateModalComponent,
    InstitutionalModalComponent,
  ],
  template: `
    <div class="flex h-screen overflow-hidden" style="background: var(--bg-deep);">
      <emx-sidebar />
      <div class="flex-1 flex flex-col overflow-hidden">
        <emx-header
          [activeCount]="emergencyStore.emergencies().length"
          [criticalCount]="criticalCount()"
          [availableCount]="availableCount()"
          (createEmergency)="showCreateModal.set(true)"
          (createInstitutional)="showInstitutionalModal.set(true)"
        />
        <main class="flex-1 overflow-auto" style="background: var(--bg-deep);">
          <router-outlet />
        </main>
      </div>
    </div>

    @if (showCreateModal()) {
      <emx-emergency-quick-create-modal
        (created)="onEmergencyCreated($event)"
        (closed)="showCreateModal.set(false)"
      />
    }

    @if (showInstitutionalModal()) {
      <emx-institutional-modal
        (closed)="showInstitutionalModal.set(false)"
        (submitted)="showInstitutionalModal.set(false)"
      />
    }
  `,
})
export class ShellComponent implements OnInit {
  readonly emergencyStore = inject(EmergencyStore);
  private readonly fleetStore = inject(FleetStore);
  private emergencyApi = inject(EmergencyApiService);
  private auth = inject(AuthService);

  readonly showCreateModal = signal(false);
  readonly showInstitutionalModal = signal(false);

  ngOnInit(): void {
    if (!this.auth.currentAccount()) {
      this.auth.fetchAccount().subscribe({ error: () => {} });
    }
  }

  readonly criticalCount = computed(() =>
    this.emergencyStore.emergencies().filter((e) => e.prioridad === 'CRITICA').length,
  );

  readonly availableCount = computed(() =>
    this.fleetStore.ambulances().filter((a) => a.estado === 'DISPONIBLE').length,
  );

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const tag = (event.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (event.key === 'n' || event.key === 'N') {
      event.preventDefault();
      this.showCreateModal.set(true);
    }
    if (event.key === 'Escape') {
      this.showCreateModal.set(false);
    }
  }

  onEmergencyCreated(req: CrearTicketRequest): void {
    this.showCreateModal.set(false);
    this.emergencyApi.crear(req).subscribe({
      next: (ticket) => this.emergencyStore.addOrUpdate(ticket),
      error: () => console.error('Error al crear ticket'),
    });
  }
}
