import { Component, input } from '@angular/core';
import { CoberturaAsistenciaSnapshotDTO } from '../../../../../data-access/dto/ticket.dto';
import { GlassCardComponent } from '../../../../../shared/components/glass-card/glass-card.component';

@Component({
  selector: 'app-coverage-snapshot-card',
  standalone: true,
  imports: [GlassCardComponent],
  templateUrl: './coverage-snapshot-card.component.html',
  styleUrl: './coverage-snapshot-card.component.scss',
})
export class CoverageSnapshotCardComponent {
  readonly snapshot = input<CoberturaAsistenciaSnapshotDTO | null>(null);
}
