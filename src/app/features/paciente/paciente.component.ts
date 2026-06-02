import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PatientPortalApiService } from '../../data-access/api/patient-portal.api';
import { PacientePortalDashboardDTO, SOSResponseDTO } from '../../data-access/dto/patient-portal.dto';

interface SectionMeta {
  title: string;
  sub: string;
  icon: string;
  color: string;
  body: string;
}

@Component({
  selector: 'app-paciente-portal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './paciente.component.html',
  styleUrls: ['./paciente.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PacienteComponent implements OnInit {
  private portalApi = inject(PatientPortalApiService);

  // Active navigation tab signal
  readonly activeTab = signal<string>('home');

  // Dashboard data signal
  readonly dashboard = signal<PacientePortalDashboardDTO | null>(null);

  // SOS status signals
  readonly sosLoading = signal<boolean>(false);
  readonly sosInfo = signal<SOSResponseDTO | null>(null);

  // QR grid generator
  readonly qrCells = computed(() => this.getQrCells(17));

  readonly sections: Readonly<Record<string, SectionMeta>> = {
    turnos: {
      title: 'Mis turnos',
      sub: 'AGENDA · PRÓXIMOS Y PASADOS',
      icon: 'cal',
      color: '#0058be',
      body: 'Acá vas a ver tu agenda completa: turnos confirmados, espera virtual y solicitudes en curso. Próximo · viernes 22 · 11:30 hs con Dr. Alejandro Gómez.'
    },
    recetas: {
      title: 'Recetas digitales',
      sub: 'PRESCRIPCIONES ACTIVAS · HISTÓRICO',
      icon: 'pill',
      color: '#0058be',
      body: 'Tus recetas firmadas digitalmente, listas para escanear en cualquier farmacia adherida. 3 recetas activas · 12 históricas.'
    },
    estudios: {
      title: 'Estudios y órdenes',
      sub: 'LABORATORIO · IMÁGENES',
      icon: 'xray',
      color: '#06b6d4',
      body: 'Resultados de laboratorio, imágenes y órdenes médicas pendientes. 2 órdenes pendientes · 1 resultado nuevo (perfil lipídico).'
    },
    historia: {
      title: 'Historia clínica',
      sub: 'EVOLUCIÓN · DIAGNÓSTICOS · ALERGIAS',
      icon: 'flask',
      color: '#10b981',
      body: 'Línea de tiempo clínica completa con CIE-10, diagnósticos crónicos, antecedentes familiares y alergias declaradas.'
    },
    tele: {
      title: 'Telemedicina',
      sub: 'CONSULTA REMOTA · 24/7',
      icon: 'video',
      color: '#d97706',
      body: 'Consultá con un médico desde tu casa. Espera estimada · 3 min · cobertura OSDE 310 sin cargo.'
    },
    familia: {
      title: 'Grupo familiar',
      sub: 'TITULAR · CÓNYUGE · 2 HIJOS',
      icon: 'users',
      color: '#0058be',
      body: 'Gestioná los integrantes de tu plan: Marcos (titular), Julia (cónyuge), Lucas y Martina (hijos).'
    },
    pagos: {
      title: 'Facturas y pagos',
      sub: 'CUOTAS · COMPROBANTES · DÉBITO AUTOMÁTICO',
      icon: 'receipt',
      color: '#10b981',
      body: 'Tu estado de cuenta y comprobantes mensuales. Próximo débito · $ 62.400 · 05 · 06 · 2026 · Visa ••• 4827.'
    },
    plan: {
      title: 'Mi plan · Premium',
      sub: 'COBERTURA · BENEFICIOS · CONTRATO',
      icon: 'card',
      color: '#06b6d4',
      body: 'Plan Emergex Corporate Premium activo desde 2022. Cobertura ALS · ambulancias ilimitadas · internación domiciliaria.'
    },
    config: {
      title: 'Configuración',
      sub: 'CUENTA · NOTIFICACIONES · PRIVACIDAD',
      icon: 'cog',
      color: '#526f8d',
      body: 'Datos de la cuenta, preferencias de notificaciones, configuración de privacidad y seguridad biométrica.'
    }
  };

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.portalApi.getDashboardData().subscribe({
      next: (data) => this.dashboard.set(data),
      error: (err) => console.error('Error loading patient dashboard', err)
    });
  }

  setActiveTab(tab: string): void {
    this.activeTab.set(tab);
  }

  triggerSOS(): void {
    const currentData = this.dashboard();
    if (!currentData) return;

    this.sosLoading.set(true);
    this.portalApi.triggerSOS({
      pacienteId: currentData.perfil.id,
      ubicacion: 'Av. Santa Fe 3420, 4to B'
    }).subscribe({
      next: (res) => {
        this.sosInfo.set(res);
        this.sosLoading.set(false);
      },
      error: (err) => {
        console.error('Error triggering SOS', err);
        this.sosLoading.set(false);
      }
    });
  }

  getQrCells(size = 17): boolean[] {
    const cells: boolean[] = [];
    const total = size * size;
    for (let i = 0; i < total; i++) {
      const r = Math.floor(i / size);
      const c = i % size;
      const tl = r < 3 && c < 3;
      const tr = r < 3 && c > size - 4;
      const bl = r > size - 4 && c < 3;
      let filled;
      if (tl || tr || bl) {
        // ring: outer dark, middle white, center dark
        const localR = tl ? r : tr ? r : r - (size - 3);
        const localC = tl ? c : tr ? c - (size - 3) : c;
        filled = localR === 0 || localR === 2 || localC === 0 || localC === 2 ||
                 (localR === 1 && localC === 1);
      } else {
        filled = (((i * 53 + 11) >> 1) % 7) > 3;
      }
      cells.push(filled);
    }
    return cells;
  }
}
