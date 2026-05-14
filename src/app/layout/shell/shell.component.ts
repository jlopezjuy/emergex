import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { EmergencyQuickCreateModalComponent } from '../../shared/components/emergency/emergency-quick-create-modal/emergency-quick-create-modal.component';
import { EmergencyApiService } from '../../data-access/api/emergency.api';
import { EmergencyStore } from '../../core/stores/emergency.store';
import { CrearTicketRequest } from '../../data-access/dto/ticket.dto';

@Component({
  selector: 'emx-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    SidebarComponent,
    HeaderComponent,
    EmergencyQuickCreateModalComponent,
  ],
  template: `
    <div class="flex h-screen overflow-hidden" style="background: var(--bg-deep);">
      <emx-sidebar />
      <div class="flex-1 flex flex-col overflow-hidden">
        <emx-header
          [activeCount]="emergencyStore.emergencies().length"
          [criticalCount]="criticalCount()"
          [availableCount]="0"
          (createEmergency)="showCreateModal.set(true)"
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
  `,
})
export class ShellComponent {
  readonly emergencyStore = inject(EmergencyStore);
  private emergencyApi = inject(EmergencyApiService);

  readonly showCreateModal = signal(false);

  criticalCount() {
    return this.emergencyStore.emergencies().filter((e) => e.prioridad === 'CRITICA').length;
  }

  onEmergencyCreated(req: CrearTicketRequest): void {
    this.showCreateModal.set(false);
    this.emergencyApi.crear(req).subscribe({
      next: (ticket) => this.emergencyStore.addOrUpdate(ticket),
      error: () => console.error('Error al crear ticket'),
    });
  }
}
