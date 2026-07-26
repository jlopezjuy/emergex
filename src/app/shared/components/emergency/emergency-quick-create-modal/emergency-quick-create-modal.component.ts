import { Component, output, inject, HostListener, signal, computed, OnDestroy, DestroyRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, distinctUntilChanged, switchMap, catchError, of, map } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ModalShellComponent } from '../../modal-shell/modal-shell.component';
import { LocationPickerMapComponent } from '../../map/location-picker-map/location-picker-map.component';
import { SearchableSelectComponent, SearchableSelectOption } from '../../searchable-select/searchable-select.component';
import { AltaRapidaRequest, MotivoLlamadoDTO, ContextoEmergenciaPaciente } from '../../../../data-access/dto/ticket.dto';
import { environment } from '../../../../../environments/environment';
import { GeocodeResult } from '../../../map/geocoder-provider';
import { HttpGeocoderProvider } from '../../../map/providers/http-geocoder.provider';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { EmergencyApiService } from '../../../../data-access/api/emergency.api';
import { EmergencyStore } from '../../../../core/stores/emergency.store';
import { EmergencyModalService } from '../emergency-modal.service';
import { UserFeedbackService } from '../../../../core/notifications/user-feedback.service';

type TipoAsistencia = AltaRapidaRequest['tipoAsistencia'];
type NivelUrgencia  = AltaRapidaRequest['nivelUrgencia'];
type TipoCoberturaEstadistica = AltaRapidaRequest['tipoCoberturaEstadistica'];
type TipoPracticaEstadistica  = AltaRapidaRequest['tipoPracticaEstadistica'];

interface PacienteResult {
  id: number;
  nombre: string;
  apellido: string;
  dni?: string;
  direccion?: string;
  ciudad?: string;
  telefono?: string;
  estadoComercial?: string;
  coberturaEstado?: string;
  puedeRecibirEmergencia?: boolean;
}

const TIPOS_ASISTENCIA: { value: TipoAsistencia; label: string }[] = [
  { value: 'EMERGENCIA_DOMICILIARIA',     label: 'Emergencia domiciliaria' },
  { value: 'CONTROL_MEDICO_DOMICILIARIO', label: 'Control médico' },
  { value: 'ENFERMERIA_DOMICILIARIA',     label: 'Enfermería domiciliaria' },
  { value: 'TRASLADO_PROGRAMADO',         label: 'Traslado programado' },
  { value: 'VISITA_DOMICILIARIA',         label: 'Visita domiciliaria' },
  { value: 'ORIENTACION_TELEFONICA',      label: 'Orientación telefónica' },
];

const NIVELES_URGENCIA: { value: NivelUrgencia; label: string; sublabel: string; color: string; bg: string }[] = [
  { value: 'ROJO',    label: 'Crítica',  sublabel: 'Riesgo de vida inmediato', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  { value: 'AMARILLO', label: 'Urgente', sublabel: 'Atención < 10 min',        color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  { value: 'VERDE',   label: 'Normal',   sublabel: 'Estable, sin urgencia',    color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  { value: 'AZUL',    label: 'Guardia',  sublabel: 'Consulta de guardia',      color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
];

const TIPOS_COBERTURA_ESTADISTICA: SearchableSelectOption[] = [
  { value: 'AFILIADO',                  label: 'Afiliado' },
  { value: 'CONTRATO',                  label: 'Contrato' },
  { value: 'EMPLEADO_O_FAMILIAR',       label: 'Empleado o Familiar' },
  { value: 'EVENTOS',                   label: 'Eventos' },
  { value: 'INTERNACION_DOMICILIARIA',  label: 'Internación Domiciliaria de' },
  { value: 'PARTICULAR',                label: 'Particular' },
  { value: 'VIA_PUBLICA',               label: 'Vía Pública' },
];

const TIPOS_PRACTICA_ESTADISTICA: SearchableSelectOption[] = [
  { value: 'ATENCION_MEDICA',          label: 'Atención Médica' },
  { value: 'COBERTURA',                label: 'Cobertura' },
  { value: 'ENFERMERIA',               label: 'Enfermería' },
  { value: 'INTERNACION',              label: 'INTERNACIÓN' },
  { value: 'INYECTABLE',               label: 'Inyectable' },
  { value: 'RECONOCIMIENTO_MEDICO',    label: 'Reconocimiento Médico' },
  { value: 'TRASLADO_PROGRAMADO',      label: 'Traslado Programado' },
];

@Component({
  selector: 'emx-emergency-quick-create-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ModalShellComponent, LocationPickerMapComponent, SearchableSelectComponent],
  template: `
    <emx-modal-shell title="Nueva Emergencia" [closeOnBackdropClick]="false" (closed)="close()">
      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-5">

        <!-- Tipo de asistencia -->
        <div class="flex flex-col gap-2">
          <span id="tipoAsistenciaLabel" class="eyebrow">Tipo de asistencia *</span>
          <div class="flex flex-wrap gap-1.5" role="radiogroup" aria-labelledby="tipoAsistenciaLabel">
            @for (t of tiposAsistencia; track t.value) {
              <button
                type="button"
                role="radio"
                [attr.aria-checked]="f['tipoAsistencia'].value === t.value"
                class="px-2.5 py-1 rounded-btn text-xs font-medium transition-all focus:ring-2 focus:ring-[var(--accent-cyan)] focus:outline-none"
                [style.border]="f['tipoAsistencia'].value === t.value
                  ? '1px solid var(--accent-cyan)'
                  : '1px solid var(--border-glass)'"
                [style.background]="f['tipoAsistencia'].value === t.value
                  ? 'rgba(6,182,212,0.15)'
                  : 'var(--surface-glass)'"
                [style.color]="f['tipoAsistencia'].value === t.value
                  ? 'var(--accent-cyan)'
                  : 'var(--text-secondary)'"
                (click)="f['tipoAsistencia'].setValue(t.value)"
              >{{ t.label }}</button>
            }
          </div>
          @if (f['tipoAsistencia'].invalid && f['tipoAsistencia'].touched) {
            <span role="alert" class="text-xs" style="color: var(--error-text);">Seleccioná un tipo</span>
          }
        </div>

        <!-- Paciente -->
        <div class="flex flex-col gap-2">
          <span id="pacienteSeccionLabel" class="eyebrow">Paciente</span>

          <div class="flex flex-wrap items-center gap-4">
            <label class="flex items-center gap-2 text-sm cursor-pointer" style="color: var(--text-secondary);">
              <input type="checkbox" formControlName="noAfiliado" class="rounded focus:ring-2 focus:ring-[var(--accent-cyan)]" />
              Paciente no registrado
            </label>

            @if (f['noAfiliado'].value) {
              <div class="flex gap-3 text-xs font-medium" style="color: var(--text-secondary);" role="radiogroup" aria-label="Tipo de paciente no registrado">
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" formControlName="tipoNoAfiliado" value="particular" class="focus:ring-2 focus:ring-[var(--accent-cyan)]" />
                  Particular
                </label>
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" formControlName="tipoNoAfiliado" value="nn" class="focus:ring-2 focus:ring-[var(--accent-cyan)]" />
                  NN (Desconocido)
                </label>
              </div>
            }
          </div>

          @if (!f['noAfiliado'].value) {
            <!-- Autocomplete de paciente registrado -->
            <div class="relative" (click)="$event.stopPropagation()">
              @if (selectedPaciente()) {
                <!-- Paciente seleccionado -->
                <div
                  class="flex items-center justify-between rounded-btn px-3 py-2 text-sm"
                  style="background: rgba(6,182,212,0.08); border: 1px solid rgba(6,182,212,0.4); color: var(--text-primary);"
                >
                  <span class="flex items-center gap-2 flex-wrap">
                    <span class="font-medium">{{ selectedPaciente()!.apellido }}, {{ selectedPaciente()!.nombre }}</span>
                    @if (selectedPaciente()!.dni) {
                      <span style="color: var(--text-muted);">DNI {{ selectedPaciente()!.dni }}</span>
                    }
                    <span class="text-xs px-2 py-0.5 rounded font-semibold"
                      [style.background]="getCommercialStatusBg(selectedPaciente()!.estadoComercial)"
                      [style.color]="getCommercialStatusColor(selectedPaciente()!.estadoComercial)"
                    >
                      {{ selectedPaciente()!.estadoComercial || 'INACTIVO' }}
                    </span>
                  </span>
                  <button
                    type="button"
                    class="ml-2 text-xs px-1.5 py-0.5 rounded focus:ring-2 focus:ring-[var(--accent-cyan)] focus:outline-none"
                    style="color: var(--text-muted); background: var(--surface-glass);"
                    aria-label="Quitar paciente seleccionado"
                    (click)="clearPaciente()"
                  >✕</button>
                </div>

                <!-- Contexto clínico del paciente (edad, sexo, antecedentes) — solo lectura -->
                @if (cargandoContexto()) {
                  <span class="text-xs" style="color: var(--text-muted);" role="status">Cargando datos clínicos...</span>
                } @else if (contextoPaciente()) {
                  <div class="flex flex-col gap-1 rounded-btn px-3 py-2 text-xs" style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-secondary);">
                    <span class="flex gap-3 flex-wrap">
                      @if (contextoPaciente()!.edad != null) {
                        <span><strong style="color: var(--text-primary);">Edad:</strong> {{ contextoPaciente()!.edad }} años</span>
                      }
                      @if (contextoPaciente()!.sexo) {
                        <span><strong style="color: var(--text-primary);">Sexo:</strong> {{ contextoPaciente()!.sexo }}</span>
                      }
                    </span>
                    @if (contextoPaciente()!.antecedentes.length > 0) {
                      <span class="flex flex-col gap-0.5 mt-1">
                        <strong style="color: var(--text-primary);">Antecedentes:</strong>
                        @for (a of contextoPaciente()!.antecedentes; track $index) {
                          <span>• {{ a.tipo }}: {{ a.descripcion }}</span>
                        }
                      </span>
                    } @else {
                      <span style="color: var(--text-muted);">Sin antecedentes registrados</span>
                    }
                  </div>
                }
              } @else {
                <!-- Input de búsqueda -->
                <input
                  type="text"
                  id="pacienteBusquedaInput"
                  formControlName="pacienteBusqueda"
                  placeholder="Buscar por nombre, apellido o DNI..."
                  autocomplete="off"
                  role="combobox"
                  [attr.aria-expanded]="dropdownOpen()"
                  aria-autocomplete="list"
                  aria-controls="patient-search-results"
                  aria-label="Buscar paciente registrado"
                  class="rounded-btn px-3 py-2 text-sm w-full focus:ring-2 focus:ring-[var(--accent-cyan)] focus:outline-none"
                  style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
                  (focus)="dropdownOpen.set(true)"
                />

                <!-- Dropdown de resultados -->
                @if (dropdownOpen() && (searchResults().length > 0 || searching())) {
                  <div
                    id="patient-search-results"
                    role="listbox"
                    class="absolute left-0 right-0 top-full mt-1 rounded-btn z-[200]"
                    style="background: #ffffff; border: 1px solid rgba(148,163,184,0.45); box-shadow: 0 14px 34px rgba(15,23,42,0.18); overflow: hidden;"
                  >
                    @if (searching()) {
                      <div class="px-3 py-2.5 text-xs" style="color: #64748b;" role="status">Buscando...</div>
                    } @else {
                      @for (p of searchResults(); track p.id) {
                        <button
                          type="button"
                          role="option"
                          [attr.aria-selected]="hoveredId() === p.id"
                          class="w-full text-left px-3 py-2.5 text-sm flex justify-between items-center focus:outline-none focus:bg-slate-100"
                          style="color: #0f172a; border-bottom: 1px solid rgba(148,163,184,0.22);"
                          [style.background]="hoveredId() === p.id ? 'rgba(59,130,246,0.10)' : '#ffffff'"
                          (mouseenter)="hoveredId.set(p.id)"
                          (mouseleave)="hoveredId.set(null)"
                          (click)="selectPaciente(p)"
                        >
                          <div>
                            <span class="font-medium">{{ p.apellido }}, {{ p.nombre }}</span>
                            @if (p.dni) {
                              <span class="ml-2 text-xs" style="color: #64748b;">DNI {{ p.dni }}</span>
                            }
                          </div>
                          <span class="text-xs px-2 py-0.5 rounded font-semibold"
                            [style.background]="getCommercialStatusBg(p.estadoComercial)"
                            [style.color]="getCommercialStatusColor(p.estadoComercial)"
                          >
                            {{ p.estadoComercial || 'INACTIVO' }}
                          </span>
                        </button>
                      }
                    }
                  </div>
                }
              }
            </div>
            @if (f['pacienteId'].invalid && f['pacienteId'].touched) {
              <span role="alert" class="text-xs" style="color: var(--error-text);">Seleccioná un paciente registrado</span>
            }

            <!-- Motivo de Excepción si el afiliado no cuenta con cobertura vigente -->
            @if (!tieneCoberturaVigente() && selectedPaciente()) {
              <div role="alert" class="flex flex-col gap-1.5 p-3 rounded-btn mt-2" style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.45);">
                <label for="motivoExcepcionInput" class="eyebrow font-bold" style="color: var(--error-text);">Motivo de Excepción *</label>
                <span class="text-xs mb-1" style="color: var(--text-secondary);">El afiliado no cuenta con cobertura vigente. Para autorizar el despacho, debe justificar el motivo de excepción.</span>
                <input
                  type="text"
                  id="motivoExcepcionInput"
                  formControlName="motivoExcepcion"
                  placeholder="Ej: Autorizado por director médico / Emergencia extrema"
                  class="rounded-btn px-3 py-2 text-sm w-full focus:ring-2 focus:ring-[var(--accent-cyan)] focus:outline-none"
                  style="background: #ffffff; border: 1px solid var(--error-text); color: #0f172a;"
                />
                @if (f['motivoExcepcion'].invalid && f['motivoExcepcion'].touched) {
                  <span class="text-xs" style="color: var(--error-text);">El motivo de excepción es obligatorio (mínimo 3 caracteres).</span>
                }
              </div>
            }
          } @else {
            <!-- Datos de paciente no afiliado -->
            <div class="grid grid-cols-2 gap-2" role="group" aria-label="Datos del paciente no registrado">
              <input
                type="text"
                formControlName="pacienteNombre"
                placeholder="Nombre"
                aria-label="Nombre del paciente"
                [readonly]="f['tipoNoAfiliado'].value === 'nn'"
                class="rounded-btn px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--accent-cyan)] focus:outline-none"
                style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
              />
              <input
                type="text"
                formControlName="pacienteApellido"
                placeholder="Apellido"
                aria-label="Apellido del paciente"
                [readonly]="f['tipoNoAfiliado'].value === 'nn'"
                class="rounded-btn px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--accent-cyan)] focus:outline-none"
                style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
              />
              <input
                type="text"
                formControlName="pacienteDni"
                placeholder="DNI"
                aria-label="DNI del paciente"
                [readonly]="f['tipoNoAfiliado'].value === 'nn'"
                class="rounded-btn px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--accent-cyan)] focus:outline-none"
                style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
              />
              <input
                type="tel"
                formControlName="pacienteTelefono"
                placeholder="Teléfono"
                aria-label="Teléfono del paciente"
                [readonly]="f['tipoNoAfiliado'].value === 'nn'"
                class="rounded-btn px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--accent-cyan)] focus:outline-none"
                style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
              />
            </div>
            <div class="flex flex-col gap-1">
              @if (f['pacienteNombre'].invalid && f['pacienteNombre'].touched) {
                <span role="alert" class="text-xs" style="color: var(--error-text);">El nombre es obligatorio para paciente no registrado</span>
              }
              @if (f['pacienteTelefono'].invalid && f['pacienteTelefono'].touched) {
                <span role="alert" class="text-xs" style="color: var(--error-text);">El teléfono es obligatorio para paciente no registrado</span>
              }
            </div>
          }
        </div>

        <!-- Dirección (oculta para ORIENTACION_TELEFONICA) -->
        @if (f['tipoAsistencia'].value !== 'ORIENTACION_TELEFONICA') {
          <div class="flex flex-col gap-1.5">
            <label for="direccionInput" class="eyebrow">Dirección *</label>
            <input
              type="text"
              id="direccionInput"
              formControlName="direccion"
              placeholder="Av. Independencia 842, Centro"
              role="combobox"
              [attr.aria-expanded]="geocodeResults().length > 0"
              aria-autocomplete="list"
              aria-controls="geocode-results"
              class="rounded-btn px-3 py-2 text-sm w-full focus:ring-2 focus:ring-[var(--accent-cyan)] focus:outline-none"
              style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
            />
            @if (f['direccion'].invalid && f['direccion'].touched) {
              <span role="alert" class="text-xs" style="color: var(--error-text);">Campo requerido</span>
            }
            @if (geocodeSearching()) {
              <span class="text-xs" style="color: var(--text-muted);" role="status">Buscando ubicación...</span>
            }
            @if (geocodeResults().length > 0) {
              <div id="geocode-results" role="listbox" class="flex flex-col rounded-btn overflow-hidden" style="border:1px solid rgba(148,163,184,.35); background:#fff;">
                @for (result of geocodeResults(); track result.address) {
                  <button
                    type="button"
                    role="option"
                    class="text-left px-3 py-2 text-xs focus:bg-slate-100 focus:outline-none"
                    style="color:#0f172a; border-bottom:1px solid rgba(148,163,184,.18);"
                    (click)="selectGeocode(result)"
                  >
                    <span class="font-medium">{{ result.label }}</span>
                    <span class="block mt-0.5" style="color:#64748b;">{{ result.lat.toFixed(5) }}, {{ result.lng.toFixed(5) }}</span>
                  </button>
                }
              </div>
            }
            <div class="rounded-btn overflow-hidden" style="border:1px solid rgba(148,163,184,.35); background:#f8fafc;">
              <emx-location-picker-map
                [lat]="selectedLocation()?.lat ?? null"
                [lng]="selectedLocation()?.lng ?? null"
                (pointChanged)="setManualLocation($event)"
              />
            </div>
            @if (selectedLocation()) {
              <span class="text-xs font-semibold" style="color: var(--accent-emerald);">
                Ubicación confirmada · {{ selectedLocation()!.lat.toFixed(5) }}, {{ selectedLocation()!.lng.toFixed(5) }}
              </span>
            } @else {
              <span class="text-xs" style="color: var(--warning-text);">Sin ubicación confirmada. Podés registrar igual, pero el mapa no tendrá punto exacto.</span>
            }
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="notaDireccionInput" class="eyebrow">Nota de dirección</label>
            <input
              type="text"
              id="notaDireccionInput"
              formControlName="notaDireccion"
              placeholder="Piso, depto, referencia..."
              class="rounded-btn px-3 py-2 text-sm w-full focus:ring-2 focus:ring-[var(--accent-cyan)] focus:outline-none"
              style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="telefonoContactoInput" class="eyebrow">Teléfono de contacto</label>
            <input
              type="tel"
              id="telefonoContactoInput"
              formControlName="telefonoContacto"
              placeholder="Ej: 0388-15912345"
              class="rounded-btn px-3 py-2 text-sm w-full focus:ring-2 focus:ring-[var(--accent-cyan)] focus:outline-none"
              style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
            />
          </div>
        }

        <!-- Nivel de urgencia -->
        <div class="flex flex-col gap-2">
          <span id="nivelUrgenciaLabel" class="eyebrow">Nivel de urgencia *</span>
          <div class="flex gap-2" role="radiogroup" aria-labelledby="nivelUrgenciaLabel">
            @for (opt of nivelesUrgencia; track opt.value) {
              <button
                type="button"
                role="radio"
                [attr.aria-checked]="f['nivelUrgencia'].value === opt.value"
                class="flex-1 flex flex-col items-center gap-0.5 px-3 py-3 rounded-btn border transition-all focus:ring-2 focus:ring-[var(--accent-cyan)] focus:outline-none"
                [style.border-color]="f['nivelUrgencia'].value === opt.value ? opt.color : 'var(--border-glass)'"
                [style.background]="f['nivelUrgencia'].value === opt.value ? opt.bg : 'transparent'"
                (click)="f['nivelUrgencia'].setValue(opt.value)"
              >
                <span class="w-2.5 h-2.5 rounded-full" [style.background]="opt.color"></span>
                <span class="text-xs font-bold mt-1" [style.color]="opt.color">{{ opt.label }}</span>
                <span class="text-xs text-center leading-tight" style="color: var(--text-muted);">{{ opt.sublabel }}</span>
              </button>
            }
          </div>
          @if (f['nivelUrgencia'].invalid && f['nivelUrgencia'].touched) {
            <span role="alert" class="text-xs" style="color: var(--error-text);">Seleccioná un nivel</span>
          }
        </div>

        <!-- Motivo de llamado (catálogo) — complementario a "Descripción / síntomas": el operador
             puede elegir un motivo del catálogo Y ADEMÁS seguir detallando en el textarea libre. -->
        <div class="flex flex-col gap-1.5">
          <label for="motivoLlamadoInput" class="eyebrow">Motivo de llamado</label>
          <emx-searchable-select
            [inputId]="'motivoLlamadoInput'"
            formControlName="motivoLlamadoId"
            [options]="motivoLlamadoOptions()"
            placeholder="Seleccionar motivo (opcional)..."
          />
        </div>

        <!-- Cobertura / Práctica estadística: clasificación manual del operador solo para fines
             de reporte, independiente de la cobertura real del paciente y de cualquier catálogo
             de facturación (no valida ni condiciona nada del resto del formulario). -->
        <div class="flex flex-col gap-1.5">
          <label for="tipoCoberturaEstadisticaInput" class="eyebrow">Cobertura</label>
          <emx-searchable-select
            [inputId]="'tipoCoberturaEstadisticaInput'"
            formControlName="tipoCoberturaEstadistica"
            [options]="tiposCoberturaEstadistica"
            placeholder="Seleccionar cobertura (opcional)..."
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="tipoPracticaEstadisticaInput" class="eyebrow">Práctica</label>
          <emx-searchable-select
            [inputId]="'tipoPracticaEstadisticaInput'"
            formControlName="tipoPracticaEstadistica"
            [options]="tiposPracticaEstadistica"
            placeholder="Seleccionar práctica (opcional)..."
          />
        </div>

        <!-- Descripción / síntomas -->
        <div class="flex flex-col gap-1.5">
          <label for="descripcionSintomasInput" class="eyebrow">Descripción / síntomas *</label>
          <textarea
            id="descripcionSintomasInput"
            formControlName="descripcionSintomas"
            rows="2"
            placeholder="Describí los síntomas o motivo de la llamada..."
            class="rounded-btn px-3 py-2 text-sm w-full resize-none focus:ring-2 focus:ring-[var(--accent-cyan)] focus:outline-none"
            style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
          ></textarea>
          @if (f['descripcionSintomas'].invalid && f['descripcionSintomas'].touched) {
            <span role="alert" class="text-xs" style="color: var(--error-text);">Campo requerido</span>
          }
        </div>

        <!-- Observación -->
        <div class="flex flex-col gap-1.5">
          <label for="observacionInput" class="eyebrow">Observación</label>
          <textarea
            id="observacionInput"
            formControlName="observacion"
            rows="2"
            placeholder="Información adicional para el equipo..."
            class="rounded-btn px-3 py-2 text-sm w-full resize-none focus:ring-2 focus:ring-[var(--accent-cyan)] focus:outline-none"
            style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
          ></textarea>
        </div>

        <!-- Autorización especial: distinta de "Motivo de Excepción" (esa es por deuda/falta de
             cobertura del paciente). Esta es una autorización operativa general del despacho,
             siempre disponible sin importar el estado comercial del paciente. -->
        <div class="flex flex-col gap-1.5 p-3 rounded-btn" style="background: rgba(59, 130, 246, 0.06); border: 1px solid rgba(59, 130, 246, 0.35);">
          <label class="flex items-center gap-2 text-sm cursor-pointer font-medium" style="color: var(--text-secondary);">
            <input type="checkbox" formControlName="autorizacionEspecial" class="rounded focus:ring-2 focus:ring-[var(--accent-cyan)]" />
            Autorización especial
          </label>
          @if (f['autorizacionEspecial'].value) {
            <div class="flex flex-col gap-2 mt-1">
              <div class="flex flex-col gap-1">
                <label for="autorizadoPorInput" class="eyebrow">Autorizado por *</label>
                <input
                  type="text"
                  id="autorizadoPorInput"
                  formControlName="autorizadoPor"
                  placeholder="Ej: Dr. Pérez, director médico"
                  class="rounded-btn px-3 py-2 text-sm w-full focus:ring-2 focus:ring-[var(--accent-cyan)] focus:outline-none"
                  style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
                />
                @if (f['autorizadoPor'].invalid && f['autorizadoPor'].touched) {
                  <span role="alert" class="text-xs" style="color: var(--error-text);">Indicá quién autorizó.</span>
                }
              </div>
              <div class="flex flex-col gap-1">
                <label for="detalleAutorizacionInput" class="eyebrow">Detalle</label>
                <textarea
                  id="detalleAutorizacionInput"
                  formControlName="detalleAutorizacion"
                  rows="2"
                  placeholder="Motivo o contexto de la autorización especial..."
                  class="rounded-btn px-3 py-2 text-sm w-full resize-none focus:ring-2 focus:ring-[var(--accent-cyan)] focus:outline-none"
                  style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
                ></textarea>
              </div>
            </div>
          }
        </div>
      </form>

      <!-- Footer -->
      <div footer class="flex items-center gap-2">
        <span class="flex-1 flex gap-2 text-xs" style="color: var(--text-muted);">
          <span class="font-mono px-1 rounded" style="background: var(--surface-glass); border: 1px solid var(--border-glass);">Esc</span>
          cancelar
          <span class="font-mono px-1 rounded ml-2" style="background: var(--surface-glass); border: 1px solid var(--border-glass);">Enter</span>
          registrar
        </span>
        <button type="button" class="btn btn--ghost btn--sm" aria-label="Cancelar creación de emergencia" (click)="close()">Cancelar</button>
        <button
          type="button"
          class="btn btn--primary btn--sm"
          [disabled]="form.invalid || submitting()"
          aria-label="Registrar y despachar emergencia"
          (click)="submit()"
        >
          @if (submitting()) {
            <span>Guardando...</span>
          } @else {
            <span>Registrar y despachar</span>
          }
        </button>
      </div>
    </emx-modal-shell>
  `,
})
export class EmergencyQuickCreateModalComponent implements OnDestroy {
  private destroyRef = inject(DestroyRef);
  created = output<AltaRapidaRequest>();
  closed  = output<void>();

  private fb             = inject(FormBuilder);
  private http           = inject(HttpClient);
  private geocoder       = inject(HttpGeocoderProvider);
  private emergencyApi   = inject(EmergencyApiService);
  private emergencyStore = inject(EmergencyStore);
  private modalService   = inject(EmergencyModalService);
  private feedback       = inject(UserFeedbackService);

  readonly submitting = signal(false);

  readonly tiposAsistencia = TIPOS_ASISTENCIA;
  readonly nivelesUrgencia = NIVELES_URGENCIA;
  readonly tiposCoberturaEstadistica = TIPOS_COBERTURA_ESTADISTICA;
  readonly tiposPracticaEstadistica = TIPOS_PRACTICA_ESTADISTICA;

  // ── Autocomplete state ──
  readonly selectedPaciente = signal<PacienteResult | null>(null);
  readonly searchResults    = signal<PacienteResult[]>([]);
  readonly searching        = signal(false);
  readonly dropdownOpen     = signal(false);
  readonly hoveredId        = signal<number | null>(null);
  readonly geocodeResults   = signal<GeocodeResult[]>([]);
  readonly geocodeSearching = signal(false);
  readonly selectedLocation = signal<GeocodeResult | null>(null);

  // ── Motivo de llamado (catálogo) y contexto clínico del paciente seleccionado ──
  readonly motivosLlamado   = signal<MotivoLlamadoDTO[]>([]);
  readonly motivoLlamadoOptions = computed<SearchableSelectOption[]>(() =>
    this.motivosLlamado().map(m => ({ value: m.id, label: m.nombre }))
  );
  readonly contextoPaciente = signal<ContextoEmergenciaPaciente | null>(null);
  readonly cargandoContexto = signal(false);

  private destroy$ = new Subject<void>();
  private search$  = new Subject<string>();
  private geocode$ = new Subject<string>();

  tieneCoberturaVigente = computed(() => {
    const p = this.selectedPaciente();
    if (!p) return true;
    return p.estadoComercial === 'ACTIVO' && p.coberturaEstado === 'ACTIVA' && p.puedeRecibirEmergencia === true;
  });

  getCommercialStatusBg(status?: string): string {
    if (!status) return 'rgba(239, 68, 68, 0.12)';
    switch (status.toUpperCase()) {
      case 'ACTIVO':
        return 'rgba(16, 185, 129, 0.12)';
      case 'CON_DEUDA':
      case 'SUSPENDIDO_DEUDA':
        return 'rgba(245, 158, 11, 0.12)';
      default:
        return 'rgba(239, 68, 68, 0.12)';
    }
  }

  getCommercialStatusColor(status?: string): string {
    if (!status) return '#EF4444';
    switch (status.toUpperCase()) {
      case 'ACTIVO':
        return '#10B981';
      case 'CON_DEUDA':
      case 'SUSPENDIDO_DEUDA':
        return '#D97706';
      default:
        return '#EF4444';
    }
  }

  form = this.fb.group({
    tipoAsistencia:     ['EMERGENCIA_DOMICILIARIA' as TipoAsistencia | '', Validators.required],
    nivelUrgencia:      ['' as NivelUrgencia  | '', Validators.required],
    descripcionSintomas: ['', [Validators.required, Validators.minLength(1)]],
    direccion:          [''],
    notaDireccion:      [''],
    telefonoContacto:   [''],
    noAfiliado:         [false],
    tipoNoAfiliado:     ['particular'],
    pacienteBusqueda:   [''],
    pacienteId:         [null as number | null],
    pacienteNombre:     [''],
    pacienteApellido:   [''],
    pacienteDni:        [''],
    pacienteTelefono:   [''],
    motivoExcepcion:    [''],
    motivoLlamadoId:    [null as number | null],
    tipoCoberturaEstadistica: [null as TipoCoberturaEstadistica],
    tipoPracticaEstadistica: [null as TipoPracticaEstadistica],
    observacion:        [''],
    autorizacionEspecial: [false],
    autorizadoPor:      [''],
    detalleAutorizacion: [''],
  });

  constructor() {
    this.applyConditionalValidators();
    this.loadMotivosLlamado();

    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query || query.length < 2) {
          this.searchResults.set([]);
          this.searching.set(false);
          return of([]);
        }
        this.searching.set(true);
        return this.http
          .get<any[]>(`${environment.apiUrl}/api/operador-emergencias/buscar-afiliado`, { params: { q: query } })
          .pipe(
            map(items => items.map(item => {
              let apellido = '';
              let nombre = item.nombreCompleto || '';
              if (item.nombreCompleto && item.nombreCompleto.includes(',')) {
                const parts = item.nombreCompleto.split(',');
                apellido = parts[0].trim();
                nombre = parts[1].trim();
              }
              return {
                id: item.pacienteId,
                nombre: nombre,
                apellido: apellido,
                dni: item.dni,
                direccion: item.direccion,
                telefono: item.telefono,
                estadoComercial: item.estadoGrupo || 'INACTIVO',
                coberturaEstado: item.coberturaEstado,
                puedeRecibirEmergencia: item.puedeRecibirEmergencia
              };
            })),
            catchError(() => of([]))
          );
      }),
      takeUntil(this.destroy$), takeUntilDestroyed(this.destroyRef)
    ).subscribe(results => {
      this.searchResults.set(results);
      this.searching.set(false);
    });

    this.f['pacienteBusqueda'].valueChanges
      .pipe(takeUntil(this.destroy$), takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.search$.next(v ?? ''));

    this.f['noAfiliado'].valueChanges
      .pipe(takeUntil(this.destroy$), takeUntilDestroyed(this.destroyRef))
      .subscribe(value => this.handleNoAfiliadoToggle(Boolean(value)));

    // Autorización especial — distinta de motivoExcepcion (esa es por deuda/falta de cobertura)
    this.f['autorizacionEspecial'].valueChanges
      .pipe(takeUntil(this.destroy$), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applyConditionalValidators());

    this.f['tipoNoAfiliado'].valueChanges
      .pipe(takeUntil(this.destroy$), takeUntilDestroyed(this.destroyRef))
      .subscribe(val => {
        if (val === 'nn') {
          this.form.patchValue({
            pacienteNombre: 'NN',
            pacienteApellido: 'NN',
            pacienteDni: 'NO INFORMADO',
            pacienteTelefono: 'NO INFORMADO'
          }, { emitEvent: false });
        } else {
          this.form.patchValue({
            pacienteNombre: '',
            pacienteApellido: '',
            pacienteDni: '',
            pacienteTelefono: ''
          }, { emitEvent: false });
        }
        this.applyConditionalValidators();
      });

    this.geocode$.pipe(
      debounceTime(650),
      distinctUntilChanged(),
      switchMap(query => {
        const q = (query ?? '').trim();
        this.selectedLocation.set(null);
        if (q.length < 4) {
          this.geocodeResults.set([]);
          this.geocodeSearching.set(false);
          return of([]);
        }
        this.geocodeSearching.set(true);
        return this.geocoder.search(q).catch(() => []);
      }),
      takeUntil(this.destroy$), takeUntilDestroyed(this.destroyRef)
    ).subscribe(results => {
      this.geocodeResults.set(results);
      this.geocodeSearching.set(false);
    });

    this.f['direccion'].valueChanges
      .pipe(takeUntil(this.destroy$), takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.geocode$.next(v ?? ''));

    this.f['tipoAsistencia'].valueChanges
      .pipe(takeUntil(this.destroy$), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applyConditionalValidators());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get f() { return this.form.controls; }

  selectPaciente(p: PacienteResult): void {
    this.selectedPaciente.set(p);
    this.dropdownOpen.set(false);
    this.searchResults.set([]);
    this.f['pacienteBusqueda'].setValue('', { emitEvent: false });
    this.f['pacienteId'].setValue(p.id);
    this.f['pacienteId'].markAsTouched();

    if (p.direccion) {
      const dir = p.ciudad ? `${p.direccion}, ${p.ciudad}` : p.direccion;
      this.f['direccion'].setValue(dir);
      this.resolvePacienteAddress(dir);
    }

    if (!this.f['telefonoContacto'].value && p.telefono) {
      this.f['telefonoContacto'].setValue(p.telefono);
    }

    this.loadContextoPaciente(p.id);
    this.applyConditionalValidators();
  }

  clearPaciente(): void {
    this.selectedPaciente.set(null);
    this.searchResults.set([]);
    this.contextoPaciente.set(null);
    this.f['pacienteId'].setValue(null);
    this.f['pacienteBusqueda'].setValue('', { emitEvent: false });
    this.applyConditionalValidators();
  }

  private loadMotivosLlamado(): void {
    this.emergencyApi.getMotivosLlamado().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => this.motivosLlamado.set(data),
      error: () => {} // no crítico: el select queda vacío si falla el catálogo
    });
  }

  private loadContextoPaciente(pacienteId: number): void {
    this.contextoPaciente.set(null);
    this.cargandoContexto.set(true);
    this.emergencyApi.getContextoPaciente(pacienteId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (ctx) => {
        this.contextoPaciente.set(ctx);
        this.cargandoContexto.set(false);
      },
      error: () => {
        // no crítico: el chip de paciente sigue mostrando los datos básicos de la búsqueda
        this.cargandoContexto.set(false);
      }
    });
  }

  private resolvePacienteAddress(address: string): void {
    const query = address.trim();
    if (query.length < 4) return;

    this.geocodeSearching.set(true);
    this.geocoder.search(query).then((results) => {
      if (results && results.length > 0) {
        this.geocodeSearching.set(false);
        this.geocodeResults.set(results);
        this.selectGeocode(results[0]);
      } else {
        // Fallback: si no hay resultados y es una dirección compleja con comas,
        // tomamos el primer segmento (calle y número) y buscamos en San Salvador de Jujuy.
        const parts = query.split(',');
        if (parts.length > 1) {
          const streetPart = parts[0].trim();
          const fallbackQuery = `${streetPart}, San Salvador de Jujuy`;
          this.geocoder.search(fallbackQuery).then((fallbackResults) => {
            this.geocodeSearching.set(false);
            if (fallbackResults && fallbackResults.length > 0) {
              this.geocodeResults.set(fallbackResults);
              this.selectGeocode(fallbackResults[0]);
            }
          }).catch(() => {
            this.geocodeSearching.set(false);
          });
        } else {
          this.geocodeSearching.set(false);
        }
      }
    }).catch(() => {
      this.geocodeSearching.set(false);
    });
  }

  selectGeocode(result: GeocodeResult): void {
    this.selectedLocation.set(result);
    this.geocodeResults.set([]);
    this.f['direccion'].setValue(result.address || result.label, { emitEvent: false });
  }

  setManualLocation(point: { lat: number; lng: number }): void {
    const currentAddress = this.f['direccion'].value ?? '';
    this.selectedLocation.set({
      label: currentAddress || 'Ubicación manual',
      address: currentAddress || 'Ubicación manual',
      lat: point.lat,
      lng: point.lng,
      provider: 'manual',
    });
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.dropdownOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  @HostListener('document:keydown.enter', ['$event'])
  onEnter(event: Event): void {
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'TEXTAREA' || target.getAttribute('role') === 'combobox')) {
      return;
    }
    this.submit();
  }

  close(): void {
    this.modalService.close();
    this.closed.emit();
  }

  submit(): void {
    this.applyConditionalValidators();

    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);

    const val  = this.form.value;
    const tipo = val.tipoAsistencia as TipoAsistencia;

    const req: AltaRapidaRequest = {
      tipoAsistencia:      tipo,
      nivelUrgencia:       val.nivelUrgencia as NivelUrgencia,
      descripcionSintomas: val.descripcionSintomas!,
      coberturaAlMomentoId: null,
      motivoLlamadoId:     val.motivoLlamadoId ?? null,
      tipoCoberturaEstadistica: val.tipoCoberturaEstadistica ?? null,
      tipoPracticaEstadistica: val.tipoPracticaEstadistica ?? null,
    };

    if (tipo !== 'ORIENTACION_TELEFONICA') {
      if (val.direccion)       req.direccion        = val.direccion;
      if (val.notaDireccion)   req.notaDireccion    = val.notaDireccion;
      if (val.telefonoContacto) req.telefonoContacto = val.telefonoContacto;
      const loc = this.selectedLocation();
      if (loc) {
        req.latitud = loc.lat;
        req.longitud = loc.lng;
        req.direccionNormalizada = loc.address;
        req.geocodingProvider = loc.provider;
      }
    }

    if (val.noAfiliado) {
      req.noAfiliado = true;
      if (val.tipoNoAfiliado === 'nn') {
        req.pacienteNombre = val.pacienteNombre || 'NN';
        req.pacienteApellido = val.pacienteApellido || 'NN';
        req.pacienteDni = val.pacienteDni || 'NO INFORMADO';
        req.pacienteTelefono = val.pacienteTelefono || val.telefonoContacto || 'NO INFORMADO';
      } else {
        if (val.pacienteNombre)   req.pacienteNombre   = val.pacienteNombre;
        if (val.pacienteApellido) req.pacienteApellido = val.pacienteApellido;
        if (val.pacienteDni)      req.pacienteDni      = val.pacienteDni;
        if (val.pacienteTelefono) req.pacienteTelefono = val.pacienteTelefono;
      }
    } else {
      const p = this.selectedPaciente();
      if (p) req.pacienteId = p.id;
    }

    const motivo = val.motivoExcepcion;
    if (motivo) {
      req.observacion = val.observacion
        ? `[Motivo de Excepción: ${motivo}] ${val.observacion}`
        : `[Motivo de Excepción: ${motivo}]`;
    } else if (val.observacion) {
      req.observacion = val.observacion;
    }

    // Autorización especial — independiente del motivo de excepción por deuda/cobertura
    if (val.autorizacionEspecial) {
      req.autorizacionEspecial = true;
      req.autorizadoPor = val.autorizadoPor || undefined;
      req.detalleAutorizacion = val.detalleAutorizacion || undefined;
    }

    this.emergencyApi.altaRapida(req)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ticket) => {
          this.emergencyStore.addOrUpdate(ticket);
          this.created.emit(req);
          this.feedback.push({
            type: 'success',
            title: 'Emergencia registrada',
            message: `Ticket ${ticket.codigo ?? 'generado'} creado correctamente.`,
          });
          this.submitting.set(false);
          this.close();
        },
        error: (err) => {
          console.error('[EmergencyQuickCreateModal] error creating quick ticket:', err);
          if (err instanceof HttpErrorResponse) {
            this.feedback.fromHttpError(err);
          } else {
            this.feedback.push({
              type: 'error',
              title: 'No se pudo registrar la emergencia',
              message: 'Ocurrió un error inesperado al crear el ticket.',
            });
          }
          this.submitting.set(false);
        }
      });
  }

  private handleNoAfiliadoToggle(noAfiliado: boolean): void {
    if (noAfiliado) {
      this.clearPaciente();
      this.dropdownOpen.set(false);
      this.searchResults.set([]);
    } else {
      this.form.patchValue(
        {
          pacienteNombre: '',
          pacienteApellido: '',
          pacienteDni: '',
          pacienteTelefono: '',
        },
        { emitEvent: false }
      );
    }

    this.applyConditionalValidators();
  }

  private applyConditionalValidators(): void {
    const noAfiliado = Boolean(this.f['noAfiliado'].value);
    const tipoNoAfiliado = this.f['tipoNoAfiliado']?.value || 'particular';
    const tipoAsistencia = this.f['tipoAsistencia'].value;
    const direccionValidators =
      tipoAsistencia === 'ORIENTACION_TELEFONICA' ? [] : [Validators.required];

    this.f['direccion'].setValidators(direccionValidators);
    this.f['direccion'].updateValueAndValidity({ emitEvent: false });

    const hasActiveCoverage = this.tieneCoberturaVigente();
    if (!hasActiveCoverage && !noAfiliado && this.f['pacienteId'].value) {
      this.f['motivoExcepcion'].setValidators([Validators.required, Validators.minLength(3)]);
    } else {
      this.f['motivoExcepcion'].clearValidators();
    }
    this.f['motivoExcepcion'].updateValueAndValidity({ emitEvent: false });

    if (noAfiliado) {
      this.f['pacienteId'].clearValidators();
      if (tipoNoAfiliado === 'nn') {
        this.f['pacienteNombre'].clearValidators();
        this.f['pacienteTelefono'].clearValidators();
      } else {
        this.f['pacienteNombre'].setValidators([Validators.required]);
        this.f['pacienteTelefono'].setValidators([Validators.required]);
      }
    } else {
      this.f['pacienteId'].setValidators([Validators.required]);
      this.f['pacienteNombre'].clearValidators();
      this.f['pacienteTelefono'].clearValidators();
    }

    this.f['pacienteId'].updateValueAndValidity({ emitEvent: false });
    this.f['pacienteNombre'].updateValueAndValidity({ emitEvent: false });
    this.f['pacienteTelefono'].updateValueAndValidity({ emitEvent: false });

    // Autorización especial: "autorizadoPor" es obligatorio sólo si el checkbox está tildado
    if (this.f['autorizacionEspecial'].value) {
      this.f['autorizadoPor'].setValidators([Validators.required]);
    } else {
      this.f['autorizadoPor'].clearValidators();
    }
    this.f['autorizadoPor'].updateValueAndValidity({ emitEvent: false });
  }
}
