import { Component, inject, OnInit, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { OperationsMapComponent } from '../../shared/components/map/operations-map/operations-map.component';
import { FleetApiService } from '../../data-access/api/fleet.api';
import { EmergencyApiService } from '../../data-access/api/emergency.api';
import { UnidadMovilDTO } from '../../data-access/dto/ambulancia.dto';
import { TicketAsistenciaDTO } from '../../data-access/dto/ticket.dto';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [OperationsMapComponent],
  template: `
    <div class="h-full p-4">
      <emx-operations-map
        [ambulances]="ambulancias()"
        [emergencies]="emergencies()"
        [selectedEmergencyId]="null"
      />
    </div>
  `,
})
export class MapComponent implements OnInit {
  private fleetApi = inject(FleetApiService);
  private emergencyApi = inject(EmergencyApiService);

  readonly ambulancias = signal<UnidadMovilDTO[]>([]);
  readonly emergencies = signal<TicketAsistenciaDTO[]>([]);

  ngOnInit(): void {
    this.fleetApi.ambulancias().pipe(catchError(() => of([]))).subscribe((d) => this.ambulancias.set(d));
    this.emergencyApi.getActivos().pipe(catchError(() => of([]))).subscribe((d) => this.emergencies.set(d));
  }
}
