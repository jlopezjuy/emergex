import { Component, OnInit, OnDestroy, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClinicalApiService, ScheduleItemDTO, WaitlistItemDTO } from '../../data-access/api/clinical.api';
import { EpisodioClinicoDTO, GlasgowDTO, MedicamentoPrescritoDTO } from '../../data-access/dto/clinical.dto';

@Component({
  selector: 'app-clinico',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clinico.component.html',
  styleUrls: ['./clinico.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClinicoComponent implements OnInit, OnDestroy {
  private clinicalApi = inject(ClinicalApiService);

  // Shell & Clock state
  readonly now = signal<Date>(new Date());
  readonly sessionSec = signal<number>(0);
  readonly mode = signal<'A' | 'B'>('A');

  // Mode A - Dashboard signals
  readonly waitlistTab = signal<'all' | 'red' | 'amber' | 'green'>('all');
  readonly waitlist = signal<WaitlistItemDTO[]>([]);
  readonly schedule = signal<ScheduleItemDTO[]>([]);

  // Mode B - EHR Active Session signals
  readonly activeEpisode = signal<EpisodioClinicoDTO | null>(null);
  readonly notes = signal<string>('');
  readonly avpu = signal<'A' | 'V' | 'P' | 'U'>('V');
  readonly glasgow = signal<GlasgowDTO>({ o: 4, v: 5, m: 6 });
  readonly diagnosticos = signal<Array<{ code: string; l: string }>>([]);
  readonly receta = signal<MedicamentoPrescritoDTO[]>([]);
  readonly allergySwap = signal<boolean>(false);
  readonly firmado = signal<boolean>(false);
  readonly firmaHash = signal<string | null>(null);
  readonly autoSaveTime = signal<string>('CONECTADO');
  readonly showTweaks = signal<boolean>(true);

  readonly avpuOptions: ReadonlyArray<{ v: 'A' | 'V' | 'P' | 'U'; l: string }> = [
    { v: 'A', l: 'Alerta' },
    { v: 'V', l: 'Verbal' },
    { v: 'P', l: 'Dolor' },
    { v: 'U', l: 'No resp.' }
  ];

  // Computeds
  readonly hh = computed(() => String(this.now().getHours()).padStart(2, '0'));
  readonly mm = computed(() => String(this.now().getMinutes()).padStart(2, '0'));
  readonly ss = computed(() => String(this.now().getSeconds()).padStart(2, '0'));
  readonly dd = computed(() => String(this.now().getDate()).padStart(2, '0'));
  readonly MM = computed(() => String(this.now().getMonth() + 1).padStart(2, '0'));
  readonly yyyy = computed(() => this.now().getFullYear());

  readonly sessionTimeStr = computed(() => {
    const total = this.sessionSec();
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  });

  readonly glasgowTotal = computed(() => {
    const g = this.glasgow();
    return g.o + g.v + g.m;
  });

  readonly glasgowSeverity = computed(() => {
    const total = this.glasgowTotal();
    if (total === 15) return 'Normal';
    if (total >= 13) return 'TCE leve';
    if (total >= 9) return 'TCE moderado';
    return 'TCE severo';
  });

  readonly glasgowSeverityClass = computed(() => {
    const total = this.glasgowTotal();
    if (total === 15) return null;
    if (total >= 13) return 'leve';
    if (total >= 9) return 'mod';
    return 'severo';
  });

  readonly avpuStateText = computed(() => {
    const a = this.avpu();
    switch (a) {
      case 'A': return 'ALERTA Y ORIENTADO';
      case 'V': return 'RESPONSIVE A ESTÍMULO VERBAL';
      case 'P': return 'RESPONSIVE A ESTÍMULO DOLOROSO';
      case 'U': return 'SIN RESPUESTA (UNRESPONSIVE)';
    }
  });

  // Filtered waitlist for Mode A tabs
  readonly filteredWaitlist = computed(() => {
    const tab = this.waitlistTab();
    const list = this.waitlist();
    if (tab === 'all') return list;
    return list.filter(p => p.tri === tab);
  });

  // Count waitlist items per category
  readonly waitlistCounts = computed(() => {
    const list = this.waitlist();
    return {
      all: list.length,
      red: list.filter(p => p.tri === 'red').length,
      amber: list.filter(p => p.tri === 'amber').length,
      green: list.filter(p => p.tri === 'green').length,
    };
  });

  private clockInterval: ReturnType<typeof setInterval> | null = null;
  private sessionInterval: ReturnType<typeof setInterval> | null = null;
  private autoSaveInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    // Clock Ticker
    this.clockInterval = setInterval(() => {
      this.now.set(new Date());
    }, 1000);

    // Initial load for Mode A dashboard
    this.loadDashboardData();

    // Auto-save Simulator (runs every 15 seconds if active session is editing)
    this.autoSaveInterval = setInterval(() => {
      this.performAutoSave();
    }, 15000);
  }

  ngOnDestroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
    if (this.sessionInterval) clearInterval(this.sessionInterval);
    if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);
  }

  loadDashboardData(): void {
    this.clinicalApi.getWaitlist().subscribe(data => this.waitlist.set(data));
    this.clinicalApi.getScheduleToday().subscribe(data => this.schedule.set(data));
  }

  startConsultation(patientId = 9877): void {
    this.mode.set('B');
    this.sessionSec.set(0);
    this.firmado.set(false);
    this.firmaHash.set(null);
    this.allergySwap.set(false);

    // Load active episode mock/backend
    this.clinicalApi.getActiveEpisode(patientId).subscribe(episode => {
      this.activeEpisode.set(episode);
      this.notes.set(episode.notas);
      this.avpu.set(episode.avpu);
      this.glasgow.set(episode.glasgow);
      this.diagnosticos.set(episode.diagnosticos);
      this.receta.set(episode.receta);
      this.autoSaveTime.set('INICIADO');
    });

    // Session Timer Ticker
    if (this.sessionInterval) clearInterval(this.sessionInterval);
    this.sessionInterval = setInterval(() => {
      this.sessionSec.update(s => s + 1);
    }, 1000);
  }

  setMode(m: 'A' | 'B'): void {
    this.mode.set(m);
    if (m === 'A') {
      if (this.sessionInterval) {
        clearInterval(this.sessionInterval);
        this.sessionInterval = null;
      }
    } else {
      this.startConsultation();
    }
  }

  updateGlasgow(dimension: 'o' | 'v' | 'm', value: number): void {
    if (this.firmado()) return; // Lock if signed
    this.glasgow.update(g => ({ ...g, [dimension]: value }));
  }

  setAvpu(value: 'A' | 'V' | 'P' | 'U'): void {
    if (this.firmado()) return;
    this.avpu.set(value);
  }

  setAllergySwap(apply: boolean): void {
    if (this.firmado()) return;
    this.allergySwap.set(apply);

    this.receta.update(items => {
      return items.map(item => {
        if (item.nombre.includes('Amoxicilina') && apply) {
          return {
            ...item,
            nombre: 'Claritromicina 500 mg · Comprimidos',
            sub: 'Macrólido · ATC: J01FA09',
            dosis: '500 mg / 12 hs',
            riesgoAlergia: false,
          };
        } else if (item.nombre.includes('Claritromicina') && !apply) {
          return {
            ...item,
            nombre: 'Amoxicilina 500 mg · Comprimidos',
            sub: 'Beta-lactámico (Penicilina) · ATC: J01CA04',
            dosis: '500 mg / 8 hs',
            riesgoAlergia: true,
          };
        }
        return item;
      });
    });
  }

  addCieDiagnostico(code: string, label: string): void {
    if (this.firmado()) return;
    const current = this.diagnosticos();
    if (!current.some(d => d.code === code)) {
      this.diagnosticos.set([...current, { code, l: label }]);
    }
  }

  removeCieDiagnostico(code: string): void {
    if (this.firmado()) return;
    this.diagnosticos.update(list => list.filter(d => d.code !== code));
  }

  addMedicamento(): void {
    if (this.firmado()) return;
    this.receta.update(list => [
      ...list,
      {
        nombre: 'Nuevo Medicamento',
        sub: 'ATC: N/A',
        dosis: '1 comp / día',
        duracion: '3 días',
      }
    ]);
  }

  updateNotes(event: Event): void {
    if (this.firmado()) return;
    const val = (event.target as HTMLTextAreaElement).value;
    this.notes.set(val);
  }

  performAutoSave(): void {
    if (this.mode() !== 'B' || this.firmado() || !this.activeEpisode()) return;

    const episodeData: EpisodioClinicoDTO = {
      ...this.activeEpisode()!,
      notas: this.notes(),
      avpu: this.avpu(),
      glasgow: this.glasgow(),
      diagnosticos: this.diagnosticos(),
      receta: this.receta(),
      firmado: this.firmado(),
    };

    this.clinicalApi.saveEpisode(episodeData).subscribe({
      next: () => {
        const time = new Date();
        const secStr = String(time.getSeconds()).padStart(2, '0');
        this.autoSaveTime.set(`GUARDADO A LAS :${secStr}s`);
      }
    });
  }

  signRecipe(): void {
    if (this.firmado() || !this.activeEpisode()) return;

    this.clinicalApi.signEpisode(this.activeEpisode()!.id, 'Dra. Carolina Altieri').subscribe({
      next: (res) => {
        this.firmado.set(true);
        this.firmaHash.set(res.hash);
        this.autoSaveTime.set('FIRMA CERTIFICADA');
        if (this.sessionInterval) {
          clearInterval(this.sessionInterval);
          this.sessionInterval = null;
        }
      }
    });
  }

  pauseConsultation(): void {
    // Placeholder action
  }

  requestStudy(): void {
    // Placeholder action
  }

  finalizeConsultation(): void {
    if (!this.firmado()) {
      this.signRecipe();
    }
    // Return to dashboard A
    this.mode.set('A');
  }
}
