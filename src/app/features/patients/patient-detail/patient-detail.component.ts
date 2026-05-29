import { Component, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'emx-patient-detail',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="detail-page">
      <div class="page-header">
        <a routerLink="/patients" class="back-link">← Volver a afiliados</a>
      </div>

      @if (loading()) {
        <p class="status-msg">Cargando…</p>
      } @else if (!pacienteId()) {
        <p class="status-msg error">Afiliado no encontrado. El ID en la URL no es válido.</p>
      } @else {
        <div class="detail-card">
          <div class="detail-placeholder">
            <div class="placeholder-icon">🧑‍⚕️</div>
            <p class="placeholder-title">Ficha del afiliado #{{ pacienteId() }}</p>
            <p class="placeholder-sub">
              La vista de detalle completa (360°) está disponible desde el listado de afiliados.<br>
              Hacé click en un afiliado → se abre el drawer lateral con toda la información.
            </p>
            <a routerLink="/patients" class="btn-back">Ir al listado de afiliados</a>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .detail-page { padding: 24px; max-width: 900px; margin: 0 auto; }
    .page-header { margin-bottom: 20px; }
    .back-link {
      color: var(--accent-blue); text-decoration: none;
      font-size: 13px; font-weight: 500;
    }
    .back-link:hover { text-decoration: underline; }
    .status-msg { color: var(--text-muted); font-size: 14px; padding: 24px 0; text-align: center; }
    .status-msg.error { color: #ef4444; }
    .detail-card {
      background: var(--bg-elevated); border: 1px solid var(--border-glass);
      border-radius: 14px; padding: 40px 24px; text-align: center;
    }
    .placeholder-icon { font-size: 48px; margin-bottom: 12px; }
    .placeholder-title { font-size: 18px; font-weight: 600; color: var(--text-primary); margin: 0 0 8px; }
    .placeholder-sub { font-size: 13px; color: var(--text-muted); margin: 0 0 20px; line-height: 1.6; }
    .btn-back {
      display: inline-block;
      background: var(--accent-blue); color: #fff;
      text-decoration: none; border-radius: 8px;
      padding: 9px 20px; font-size: 13px; font-weight: 600;
    }
    .btn-back:hover { opacity: 0.88; }
  `],
})
export class PatientDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);

  readonly pacienteId = signal<number | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);
    this.pacienteId.set(!isNaN(id) && id > 0 ? id : null);
    this.loading.set(false);
  }
}
