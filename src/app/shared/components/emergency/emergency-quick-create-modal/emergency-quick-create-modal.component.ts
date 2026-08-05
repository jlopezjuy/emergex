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
import { AddressSearchApiService } from '../../../../data-access/api/address-search.api';
import { AddressCandidate, PrecisionDireccion } from '../../../../data-access/dto/address-search.dto';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { EmergencyApiService } from '../../../../data-access/api/emergency.api';
import { EmergencyStore } from '../../../../core/stores/emergency.store';
import { EmergencyModalService } from '../emergency-modal.service';
import { UserFeedbackService } from '../../../../core/notifications/user-feedback.service';
import { ContratoCoberturaCatalogoApiService } from '../../../../data-access/api/contrato-cobertura-catalogo.api';
import { ContratoActivoDTO } from '../../../../data-access/dto/contrato-cobertura-catalogo.dto';
import { PlanObraSocialApiService } from '../../../../data-access/api/plan-obra-social.api';

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

/** Integrante del personal propio (SAE) devuelto por /api/operador-emergencias/buscar-personal. */
interface PersonalSaeResult {
  profesionalSaludId: number;
  nombreCompleto: string;
  matricula?: string;
  telefono?: string;
  atencionEmergencia?: boolean;
}

/**
 * Los tres modos son mutuamente excluyentes por construcción: un único signal decide
 * cuál está activo, en vez de checkboxes independientes que podrían quedar los dos
 * tildados a la vez. El modo por defecto sigue siendo el histórico: paciente registrado.
 */
type ModoSujeto = 'registrado' | 'noRegistrado' | 'personalSae';

/** Debe coincidir con aliviarsalud.geocoding.min-query-length del backend. */
const MIN_ADDRESS_QUERY_LENGTH = 4;

const MODOS_SUJETO: { value: ModoSujeto; label: string }[] = [
  { value: 'registrado',    label: 'Paciente registrado' },
  { value: 'noRegistrado',  label: 'Paciente no registrado' },
  { value: 'personalSae',   label: 'Personal SAE' },
];

const TIPOS_ASISTENCIA: { value: TipoAsistencia; label: string }[] = [
  { value: 'EMERGENCIA_DOMICILIARIA',     label: 'Emergencia domiciliaria' },
  { value: 'CONTROL_MEDICO_DOMICILIARIO', label: 'Control médico' },
  { value: 'ENFERMERIA_DOMICILIARIA',     label: 'Enfermería domiciliaria' },
  { value: 'TRASLADO_PROGRAMADO',         label: 'Traslado programado' },
  { value: 'VISITA_DOMICILIARIA',         label: 'Visita domiciliaria' },
  { value: 'RECONOCIMIENTO_MEDICO',       label: 'Reconocimiento médico' },
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
    <emx-modal-shell
      title="Nueva Emergencia"
      [closeOnBackdropClick]="false"
      [maxWidthClass]="'max-w-[560px] lg:max-w-5xl'"
      (closed)="close()"
    >
      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">

        <!-- Tipo de asistencia (fila completa, arriba de las 2 columnas) -->
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

        <!-- Grid principal: 1 columna en mobile/tablet, 2 columnas desde lg (1024px) —
             coincide con el breakpoint en el que el modal pasa a max-w-5xl. -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-x-6">

        <!-- Columna izquierda: Paciente + Dirección -->
        <div class="flex flex-col gap-4">

        <!-- Persona asistida -->
        <div class="flex flex-col gap-2">
          <span id="pacienteSeccionLabel" class="eyebrow">Persona asistida</span>

          <div class="flex flex-wrap items-center gap-4">
            <div class="flex flex-wrap items-center gap-4" role="radiogroup" aria-labelledby="pacienteSeccionLabel">
              @for (m of modosSujeto; track m.value) {
                <label class="flex items-center gap-2 text-sm cursor-pointer" style="color: var(--text-secondary);">
                  <input
                    type="radio"
                    name="modoSujeto"
                    [value]="m.value"
                    [checked]="modoSujeto() === m.value"
                    (change)="onModoSujetoChange(m.value)"
                    class="focus:ring-2 focus:ring-[var(--accent-cyan)]"
                  />
                  {{ m.label }}
                </label>
              }
            </div>

            @if (modoSujeto() === 'noRegistrado') {
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

          @if (modoSujeto() === 'registrado') {
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
          } @else if (modoSujeto() === 'noRegistrado') {
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

            <!-- Contrato de atención: Área Protegida o Convenio con Obra Social. Solo tiene
                 sentido para paciente NO afiliado (así lo pidió el cliente) — un afiliado ya
                 tiene su cobertura resuelta por su cuenta y nunca se factura a un tercero. -->
            <div class="flex flex-col gap-2 mt-2 pt-3" style="border-top: 1px solid var(--border-glass);">
              <span class="eyebrow">Contrato de atención (opcional)</span>

              @if (loadingContratos()) {
                <span class="text-xs" style="color: var(--text-muted);" role="status">Cargando contratos...</span>
              } @else if (errorContratos()) {
                <span class="text-xs" style="color: var(--error-text);">{{ errorContratos() }}</span>
              } @else if (tiposContratoDisponibles().length === 0) {
                <span class="text-xs" style="color: var(--text-muted);">No hay contratos activos disponibles.</span>
              } @else {
                <div class="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tipo de contrato">
                  @for (t of tiposContratoDisponibles(); track t.value) {
                    <button
                      type="button"
                      role="radio"
                      [attr.aria-checked]="f['tipoContrato'].value === t.value"
                      class="px-2.5 py-1 rounded-btn text-xs font-medium transition-all focus:ring-2 focus:ring-[var(--accent-cyan)] focus:outline-none"
                      [style.border]="f['tipoContrato'].value === t.value ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)'"
                      [style.background]="f['tipoContrato'].value === t.value ? 'rgba(6,182,212,0.15)' : 'var(--surface-glass)'"
                      [style.color]="f['tipoContrato'].value === t.value ? 'var(--accent-cyan)' : 'var(--text-secondary)'"
                      (click)="onTipoContratoChange(t.value)"
                    >{{ t.label }}</button>
                  }
                  @if (f['tipoContrato'].value) {
                    <button
                      type="button"
                      class="px-2.5 py-1 rounded-btn text-xs"
                      style="border: 1px solid var(--border-glass); color: var(--text-muted); background: transparent;"
                      (click)="onTipoContratoChange(null)"
                    >Quitar</button>
                  }
                </div>

                @if (f['tipoContrato'].value) {
                  <emx-searchable-select
                    [inputId]="'contratoCoberturaInput'"
                    formControlName="contratoCoberturaId"
                    [options]="contratosDelTipoOptions()"
                    placeholder="Elegí el contrato..."
                  />

                  @if (f['tipoContrato'].value === 'CONVENIO_OBRA_SOCIAL' && f['contratoCoberturaId'].value) {
                    <div class="grid grid-cols-2 gap-2 mt-1">
                      @if (loadingPlanesObraSocial()) {
                        <span class="text-xs col-span-2" style="color: var(--text-muted);" role="status">Cargando planes...</span>
                      } @else {
                        <emx-searchable-select
                          [inputId]="'planObraSocialInput'"
                          formControlName="planObraSocialId"
                          [options]="planesObraSocialOptions()"
                          placeholder="Plan de la obra social..."
                        />
                      }
                      <input
                        type="text"
                        formControlName="numeroCredencial"
                        placeholder="N° de credencial (opcional)"
                        aria-label="Número de credencial"
                        class="rounded-btn px-3 py-2 text-sm w-full focus:ring-2 focus:ring-[var(--accent-cyan)] focus:outline-none"
                        style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
                      />
                    </div>
                  }
                }
              }
            </div>
          } @else {
            <!-- Buscador de personal SAE: mismo patrón visual que el de paciente
                 registrado. El backend sólo devuelve personal activo de la empresa. -->
            <div class="relative" (click)="$event.stopPropagation()">
              @if (selectedPersonal()) {
                <div
                  class="flex items-center justify-between rounded-btn px-3 py-2 text-sm"
                  style="background: rgba(6,182,212,0.08); border: 1px solid rgba(6,182,212,0.4); color: var(--text-primary);"
                >
                  <span class="flex items-center gap-2 flex-wrap">
                    <span class="font-medium">{{ selectedPersonal()!.nombreCompleto }}</span>
                    @if (selectedPersonal()!.matricula) {
                      <span style="color: var(--text-muted);">Mat. {{ selectedPersonal()!.matricula }}</span>
                    }
                    <span class="text-xs px-2 py-0.5 rounded font-semibold"
                      style="background: rgba(59,130,246,0.12); color: #3B82F6;"
                    >PERSONAL SAE</span>
                  </span>
                  <button
                    type="button"
                    class="ml-2 text-xs px-1.5 py-0.5 rounded focus:ring-2 focus:ring-[var(--accent-cyan)] focus:outline-none"
                    style="color: var(--text-muted); background: var(--surface-glass);"
                    aria-label="Quitar personal seleccionado"
                    (click)="clearPersonal()"
                  >✕</button>
                </div>
              } @else {
                <input
                  type="text"
                  id="personalBusquedaInput"
                  formControlName="personalBusqueda"
                  placeholder="Buscar por nombre, apellido o matrícula..."
                  autocomplete="off"
                  role="combobox"
                  [attr.aria-expanded]="personalDropdownOpen()"
                  aria-autocomplete="list"
                  aria-controls="personal-search-results"
                  aria-label="Buscar personal SAE"
                  class="rounded-btn px-3 py-2 text-sm w-full focus:ring-2 focus:ring-[var(--accent-cyan)] focus:outline-none"
                  style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
                  (focus)="personalDropdownOpen.set(true)"
                />

                @if (personalDropdownOpen() && (personalResults().length > 0 || personalSearching())) {
                  <div
                    id="personal-search-results"
                    role="listbox"
                    class="absolute left-0 right-0 top-full mt-1 rounded-btn z-[200]"
                    style="background: #ffffff; border: 1px solid rgba(148,163,184,0.45); box-shadow: 0 14px 34px rgba(15,23,42,0.18); overflow: hidden;"
                  >
                    @if (personalSearching()) {
                      <div class="px-3 py-2.5 text-xs" style="color: #64748b;" role="status">Buscando...</div>
                    } @else {
                      @for (p of personalResults(); track p.profesionalSaludId) {
                        <button
                          type="button"
                          role="option"
                          [attr.aria-selected]="hoveredPersonalId() === p.profesionalSaludId"
                          class="w-full text-left px-3 py-2.5 text-sm flex justify-between items-center focus:outline-none focus:bg-slate-100"
                          style="color: #0f172a; border-bottom: 1px solid rgba(148,163,184,0.22);"
                          [style.background]="hoveredPersonalId() === p.profesionalSaludId ? 'rgba(59,130,246,0.10)' : '#ffffff'"
                          (mouseenter)="hoveredPersonalId.set(p.profesionalSaludId)"
                          (mouseleave)="hoveredPersonalId.set(null)"
                          (click)="selectPersonal(p)"
                        >
                          <span class="font-medium">{{ p.nombreCompleto }}</span>
                          @if (p.matricula) {
                            <span class="text-xs" style="color: #64748b;">Mat. {{ p.matricula }}</span>
                          }
                        </button>
                      }
                    }
                  </div>
                }
              }
            </div>
            @if (f['profesionalSaludId'].invalid && f['profesionalSaludId'].touched) {
              <span role="alert" class="text-xs" style="color: var(--error-text);">Seleccioná un integrante del personal SAE</span>
            }
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
              [attr.aria-expanded]="addressCandidates().length > 0"
              aria-autocomplete="list"
              aria-controls="geocode-results"
              class="rounded-btn px-3 py-2 text-sm w-full focus:ring-2 focus:ring-[var(--accent-cyan)] focus:outline-none"
              style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
            />
            @if (f['direccion'].invalid && f['direccion'].touched) {
              <span role="alert" class="text-xs" style="color: var(--error-text);">Campo requerido</span>
            }
            @if (addressSearching()) {
              <span class="text-xs" style="color: var(--text-muted);" role="status">Buscando ubicación...</span>
            }
            @if (addressDegraded()) {
              <span role="alert" class="text-xs" style="color: var(--warning-text);">⚠ {{ addressDegraded() }}</span>
            }
            @if (addressCandidates().length > 0) {
              <div id="geocode-results" role="listbox" aria-label="Direcciones encontradas" class="flex flex-col rounded-btn overflow-hidden" style="border:1px solid rgba(148,163,184,.35); background:#fff;">
                @for (c of addressCandidates(); track c.id) {
                  <button
                    type="button"
                    role="option"
                    [attr.aria-selected]="selectedAddress()?.id === c.id"
                    class="text-left px-3 py-2 text-xs focus:bg-slate-100 focus:outline-none"
                    style="color:#0f172a; border-bottom:1px solid rgba(148,163,184,.18);"
                    (click)="selectAddress(c)"
                  >
                    <span class="flex items-center gap-2 flex-wrap">
                      <span class="font-medium">{{ c.displayAddress }}</span>
                      <span class="px-1.5 py-0.5 rounded font-semibold"
                        [style.background]="precisionBg(c.precision)"
                        [style.color]="precisionColor(c.precision)"
                      >{{ precisionLabel(c.precision) }}</span>
                      @if (!c.withinOperationalArea) {
                        <span class="px-1.5 py-0.5 rounded font-semibold" style="background: rgba(239,68,68,0.12); color:#EF4444;">FUERA DE ZONA</span>
                      }
                    </span>
                    <!-- Localidad y provincia siempre visibles: es lo que permite descartar
                         de un vistazo una calle homónima de otro municipio. -->
                    <span class="block mt-0.5" style="color:#64748b;">
                      {{ c.locality || c.municipality || 'Localidad no informada' }} · {{ c.province || 'Provincia no informada' }}
                      @if (c.houseNumber) { <span> · Altura {{ c.houseNumber }}</span> }
                    </span>
                  </button>
                }
              </div>
            }
            <!-- Alto reducido a la mitad del histórico (~180px, mínimo interno del componente):
                 acá el mapa cumple un rol confirmatorio del pin, no hace falta tanto alto. -->
            <div class="rounded-btn overflow-hidden" style="border:1px solid rgba(148,163,184,.35); background:#f8fafc; height: 110px;">
              <emx-location-picker-map
                [lat]="selectedAddress()?.latitude ?? null"
                [lng]="selectedAddress()?.longitude ?? null"
                [minHeight]="110"
                (pointChanged)="setManualLocation($event)"
              />
            </div>

            <!-- Estado de la ubicación: se informa la precisión REAL, nunca se muestra
                 "confirmada" un punto que el operador no eligió ni ubicó. -->
            @if (selectedAddress(); as loc) {
              <span class="text-xs font-semibold flex items-center gap-2 flex-wrap" [style.color]="precisionColor(loc.precision)">
                <span>{{ precisionLabel(loc.precision) }} · {{ loc.latitude.toFixed(5) }}, {{ loc.longitude.toFixed(5) }}</span>
                @if (loc.provider) {
                  <span class="font-normal" style="color: var(--text-muted);">({{ loc.provider }})</span>
                }
              </span>

              @if (requiereConfirmacionAproximada()) {
                <label class="flex items-start gap-2 text-xs p-2 rounded-btn cursor-pointer"
                  style="background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.45); color: var(--text-secondary);">
                  <input type="checkbox" formControlName="ubicacionAproximadaConfirmada" class="mt-0.5 rounded focus:ring-2 focus:ring-[var(--accent-cyan)]" />
                  <span>
                    La altura exacta no pudo confirmarse. Confirmo que el punto del mapa es correcto para despachar.
                    Si no lo es, corregilo arrastrando el marcador.
                  </span>
                </label>
              }
            } @else {
              <span class="text-xs" style="color: var(--warning-text);">
                Sin ubicación confirmada. Podés registrar igual, pero el móvil sale sin punto exacto: elegí una dirección de la lista o marcá el punto en el mapa.
              </span>
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

        </div>
        <!-- Fin columna izquierda -->

        <!-- Columna derecha: Urgencia + clasificación + descripción -->
        <div class="flex flex-col gap-4">

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

        <!-- Motivo de llamado / Cobertura / Práctica: son combos autocompletables cortos que no
             necesitan una fila completa cada uno, así que comparten una sub-grilla de 3 columnas
             (colapsa a 1 columna por debajo de 640px). -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <!-- Motivo de llamado (catálogo) — complementario a "Descripción / síntomas": el operador
               puede elegir un motivo del catálogo Y ADEMÁS seguir detallando en el textarea libre. -->
          <div class="flex flex-col gap-1.5">
            <label for="motivoLlamadoInput" class="eyebrow">Motivo de llamado</label>
            <emx-searchable-select
              [inputId]="'motivoLlamadoInput'"
              formControlName="motivoLlamadoId"
              [options]="motivoLlamadoOptions()"
              placeholder="Opcional..."
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
              placeholder="Opcional..."
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="tipoPracticaEstadisticaInput" class="eyebrow">Práctica</label>
            <emx-searchable-select
              [inputId]="'tipoPracticaEstadisticaInput'"
              formControlName="tipoPracticaEstadistica"
              [options]="tiposPracticaEstadistica"
              placeholder="Opcional..."
            />
          </div>
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

        </div>
        <!-- Fin columna derecha -->

        </div>
        <!-- Fin grid principal (2 columnas) -->
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
  private addressApi     = inject(AddressSearchApiService);
  private emergencyApi   = inject(EmergencyApiService);
  private emergencyStore = inject(EmergencyStore);
  private modalService   = inject(EmergencyModalService);
  private feedback       = inject(UserFeedbackService);
  private contratosApi   = inject(ContratoCoberturaCatalogoApiService);
  private planObraSocialApi = inject(PlanObraSocialApiService);

  readonly submitting = signal(false);

  readonly tiposAsistencia = TIPOS_ASISTENCIA;
  readonly nivelesUrgencia = NIVELES_URGENCIA;
  readonly modosSujeto = MODOS_SUJETO;
  readonly tiposCoberturaEstadistica = TIPOS_COBERTURA_ESTADISTICA;
  readonly tiposPracticaEstadistica = TIPOS_PRACTICA_ESTADISTICA;

  // ── Modo de sujeto asistido: fuente única de verdad, por eso los tres modos no
  // pueden convivir. Es estado de UI, no un campo del request: el request se arma
  // en submit() a partir de este modo. ──
  readonly modoSujeto = signal<ModoSujeto>('registrado');

  // ── Autocomplete state ──
  readonly selectedPaciente = signal<PacienteResult | null>(null);
  readonly searchResults    = signal<PacienteResult[]>([]);
  readonly searching        = signal(false);
  readonly dropdownOpen     = signal(false);
  readonly hoveredId        = signal<number | null>(null);

  // ── Autocomplete de personal SAE ──
  readonly selectedPersonal     = signal<PersonalSaeResult | null>(null);
  readonly personalResults      = signal<PersonalSaeResult[]>([]);
  readonly personalSearching    = signal(false);
  readonly personalDropdownOpen = signal(false);
  readonly hoveredPersonalId    = signal<number | null>(null);
  // ── Dirección: candidatos, estado de búsqueda y punto elegido ──
  readonly addressCandidates = signal<AddressCandidate[]>([]);
  readonly addressSearching  = signal(false);
  readonly addressDegraded   = signal<string | null>(null);
  readonly selectedAddress   = signal<AddressCandidate | null>(null);

  /**
   * Una ubicación APROXIMADA exige un tilde explícito del operador antes de despachar.
   * EXACTA y MANUAL no lo piden: en la primera coincide la altura, en la segunda el punto
   * lo puso una persona mirando el mapa.
   */
  readonly requiereConfirmacionAproximada = computed(() => this.selectedAddress()?.precision === 'APROXIMADA');

  // ── Motivo de llamado (catálogo) y contexto clínico del paciente seleccionado ──
  readonly motivosLlamado   = signal<MotivoLlamadoDTO[]>([]);
  readonly motivoLlamadoOptions = computed<SearchableSelectOption[]>(() =>
    this.motivosLlamado().map(m => ({ value: m.id, label: m.nombre }))
  );
  readonly contextoPaciente = signal<ContextoEmergenciaPaciente | null>(null);
  readonly cargandoContexto = signal(false);

  // ── Contrato de atención (Área Protegida / Convenio Obra Social) — solo paciente no
  // afiliado: así lo pidió el cliente, y es la única rama que el backend honra hoy
  // (ver OperadorEmergenciaServiceImpl.altaRapida). ──
  private readonly TIPO_CONTRATO_LABELS: { value: 'AREA_PROTEGIDA' | 'CONVENIO_OBRA_SOCIAL'; label: string }[] = [
    { value: 'AREA_PROTEGIDA', label: 'Área Protegida' },
    { value: 'CONVENIO_OBRA_SOCIAL', label: 'Convenio con Obra Social' },
  ];
  readonly contratosDisponibles = signal<ContratoActivoDTO[]>([]);
  readonly loadingContratos = signal(false);
  readonly errorContratos = signal<string | null>(null);
  readonly planesObraSocial = signal<{ id: number; nombre: string }[]>([]);
  readonly loadingPlanesObraSocial = signal(false);

  readonly tiposContratoDisponibles = computed(() => {
    const modalidades = new Set(this.contratosDisponibles().map(c => c.modalidadCobertura));
    return this.TIPO_CONTRATO_LABELS.filter(t => modalidades.has(t.value));
  });

  // Método (no computed): depende de un FormControl.value, no de un signal — un
  // computed() no re-evaluaría al cambiar el tipo seleccionado.
  contratosDelTipoOptions(): SearchableSelectOption[] {
    const tipo = this.f['tipoContrato'].value;
    if (!tipo) return [];
    return this.contratosDisponibles()
      .filter(c => c.modalidadCobertura === tipo)
      .map(c => ({ value: c.id, label: c.nombre }));
  }

  readonly planesObraSocialOptions = computed<SearchableSelectOption[]>(() =>
    this.planesObraSocial().map(p => ({ value: p.id, label: p.nombre }))
  );

  private destroy$        = new Subject<void>();
  private search$         = new Subject<string>();
  private personalSearch$ = new Subject<string>();
  private geocode$        = new Subject<string>();

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
    ubicacionAproximadaConfirmada: [false],
    notaDireccion:      [''],
    telefonoContacto:   [''],
    tipoNoAfiliado:     ['particular'],
    pacienteBusqueda:   [''],
    pacienteId:         [null as number | null],
    personalBusqueda:   [''],
    profesionalSaludId: [null as number | null],
    pacienteNombre:     [''],
    pacienteApellido:   [''],
    pacienteDni:        [''],
    pacienteTelefono:   [''],
    motivoExcepcion:    [''],
    tipoContrato:       [null as 'AREA_PROTEGIDA' | 'CONVENIO_OBRA_SOCIAL' | null],
    contratoCoberturaId: [null as number | null],
    planObraSocialId:   [null as number | null],
    numeroCredencial:   [''],
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
    this.loadContratosDisponibles();

    // Al cambiar el contrato elegido: si es un convenio con obra social, cargar sus
    // planes; si no, limpiar el plan/credencial para no arrastrar selección vieja.
    this.f['contratoCoberturaId'].valueChanges
      .pipe(takeUntil(this.destroy$), takeUntilDestroyed(this.destroyRef))
      .subscribe(contratoId => {
        this.form.patchValue({ planObraSocialId: null, numeroCredencial: '' }, { emitEvent: false });
        this.planesObraSocial.set([]);

        const tipo = this.f['tipoContrato'].value;
        if (tipo !== 'CONVENIO_OBRA_SOCIAL' || contratoId == null) return;

        const contrato = this.contratosDisponibles().find(c => c.id === contratoId);
        if (!contrato?.obraSocialId) return;

        this.loadingPlanesObraSocial.set(true);
        this.planObraSocialApi.getByObraSocial(contrato.obraSocialId)
          .pipe(catchError(() => of([])), takeUntilDestroyed(this.destroyRef))
          .subscribe(planes => {
            this.planesObraSocial.set(planes.filter(p => p.activo).map(p => ({ id: p.id!, nombre: p.nombre })));
            this.loadingPlanesObraSocial.set(false);
          });
      });

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

    // switchMap cancela la búsqueda anterior al tipear de nuevo, igual que el de pacientes.
    this.personalSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query || query.length < 2) {
          this.personalResults.set([]);
          this.personalSearching.set(false);
          return of([] as PersonalSaeResult[]);
        }
        this.personalSearching.set(true);
        return this.http
          .get<PersonalSaeResult[]>(`${environment.apiUrl}/api/operador-emergencias/buscar-personal`, { params: { q: query } })
          .pipe(catchError(() => of([] as PersonalSaeResult[])));
      }),
      takeUntil(this.destroy$), takeUntilDestroyed(this.destroyRef)
    ).subscribe(results => {
      this.personalResults.set(results);
      this.personalSearching.set(false);
    });

    this.f['personalBusqueda'].valueChanges
      .pipe(takeUntil(this.destroy$), takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.personalSearch$.next(v ?? ''));

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

    // Autocompletado de dirección. switchMap cancela la búsqueda anterior en cuanto el
    // operador sigue tipeando, así una respuesta vieja y lenta no pisa a una nueva.
    this.geocode$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap(query => {
        const q = (query ?? '').trim();
        // Editar el texto invalida la selección previa: el punto del mapa no puede quedar
        // apuntando a una dirección que ya no es la que dice el campo.
        this.selectedAddress.set(null);
        this.f['ubicacionAproximadaConfirmada'].setValue(false, { emitEvent: false });
        if (q.length < MIN_ADDRESS_QUERY_LENGTH) {
          this.addressCandidates.set([]);
          this.addressDegraded.set(null);
          this.addressSearching.set(false);
          return of(null);
        }
        this.addressSearching.set(true);
        return this.addressApi.autocomplete(q);
      }),
      takeUntil(this.destroy$), takeUntilDestroyed(this.destroyRef)
    ).subscribe(response => {
      this.addressSearching.set(false);
      if (!response) return;
      // Nunca se autoselecciona el primer resultado: elige el operador, siempre.
      this.addressCandidates.set(response.candidates);
      this.addressDegraded.set(response.degraded ? (response.degradedReason ?? 'Resultado degradado: verificá la ubicación.') : null);
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
    this.dropdownOpen.set(false);
    this.f['pacienteId'].setValue(null);
    this.f['pacienteBusqueda'].setValue('', { emitEvent: false });
    this.applyConditionalValidators();
  }

  selectPersonal(p: PersonalSaeResult): void {
    this.selectedPersonal.set(p);
    this.personalDropdownOpen.set(false);
    this.personalResults.set([]);
    this.f['personalBusqueda'].setValue('', { emitEvent: false });
    this.f['profesionalSaludId'].setValue(p.profesionalSaludId);
    this.f['profesionalSaludId'].markAsTouched();

    // El personal no tiene domicilio en el modelo: la dirección la carga el operador.
    // Sólo se precarga el teléfono si el campo de contacto está vacío.
    if (!this.f['telefonoContacto'].value && p.telefono) {
      this.f['telefonoContacto'].setValue(p.telefono);
    }

    this.applyConditionalValidators();
  }

  clearPersonal(): void {
    this.selectedPersonal.set(null);
    this.personalResults.set([]);
    this.personalDropdownOpen.set(false);
    this.f['profesionalSaludId'].setValue(null);
    this.f['personalBusqueda'].setValue('', { emitEvent: false });
    this.applyConditionalValidators();
  }

  private loadMotivosLlamado(): void {
    this.emergencyApi.getMotivosLlamado().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => this.motivosLlamado.set(data),
      error: () => {} // no crítico: el select queda vacío si falla el catálogo
    });
  }

  private loadContratosDisponibles(): void {
    this.loadingContratos.set(true);
    this.errorContratos.set(null);
    this.contratosApi.getActivos().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.contratosDisponibles.set(data);
        this.loadingContratos.set(false);
      },
      error: () => {
        this.errorContratos.set('No se pudo cargar el catálogo de contratos.');
        this.loadingContratos.set(false);
      }
    });
  }

  onTipoContratoChange(tipo: 'AREA_PROTEGIDA' | 'CONVENIO_OBRA_SOCIAL' | null): void {
    this.f['tipoContrato'].setValue(tipo);
    // Cambiar de tipo invalida cualquier contrato/plan ya elegido del tipo anterior.
    this.form.patchValue({ contratoCoberturaId: null, planObraSocialId: null, numeroCredencial: '' }, { emitEvent: false });
    this.planesObraSocial.set([]);
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

  /**
   * Precarga el domicilio del paciente y lanza la búsqueda deliberada, pero NO selecciona
   * nada: el domicilio de la ficha puede estar viejo o mal escrito, y elegir por el operador
   * es justamente lo que mandaba ambulancias a la dirección equivocada.
   */
  private resolvePacienteAddress(address: string): void {
    const query = address.trim();
    if (query.length < MIN_ADDRESS_QUERY_LENGTH) return;

    this.addressSearching.set(true);
    this.addressApi.resolve(query).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(response => {
      this.addressSearching.set(false);
      this.addressCandidates.set(response.candidates);
      this.addressDegraded.set(response.degraded ? (response.degradedReason ?? 'Resultado degradado: verificá la ubicación.') : null);
    });
  }

  selectAddress(candidate: AddressCandidate): void {
    this.selectedAddress.set(candidate);
    this.addressCandidates.set([]);
    // Cambiar una selección anterior obliga a volver a confirmar si la nueva es aproximada.
    this.f['ubicacionAproximadaConfirmada'].setValue(false, { emitEvent: false });
    this.f['direccion'].setValue(candidate.displayAddress, { emitEvent: false });
  }

  /**
   * El operador arrastró el marcador. El punto pasa a ser MANUAL (lo puso una persona
   * mirando el mapa) y se pide la dirección inversa sólo como etiqueta legible: si el
   * servicio no contesta, la ubicación manual vale igual y el despacho sigue.
   */
  setManualLocation(point: { lat: number; lng: number }): void {
    const textoActual = (this.f['direccion'].value ?? '').trim();
    this.addressCandidates.set([]);
    this.selectedAddress.set({
      id: 'manual',
      displayAddress: textoActual || 'Ubicación marcada manualmente',
      latitude: point.lat,
      longitude: point.lng,
      precision: 'MANUAL',
      provider: 'manual',
    });

    this.addressApi.reverse(point.lat, point.lng).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(candidate => {
      const actual = this.selectedAddress();
      // Si el operador movió el pin otra vez mientras viajaba la respuesta, se descarta.
      if (!candidate || !actual || actual.latitude !== point.lat || actual.longitude !== point.lng) return;
      this.selectedAddress.set({ ...candidate, precision: 'MANUAL', latitude: point.lat, longitude: point.lng });
    });
  }

  precisionLabel(precision: PrecisionDireccion): string {
    switch (precision) {
      case 'EXACTA':      return 'Ubicación exacta';
      case 'MANUAL':      return 'Punto marcado a mano';
      case 'APROXIMADA':  return 'Ubicación aproximada';
      default:            return 'Sin confirmar';
    }
  }

  precisionColor(precision: PrecisionDireccion): string {
    switch (precision) {
      case 'EXACTA': return '#10B981';
      case 'MANUAL': return '#3B82F6';
      default:       return '#F59E0B';
    }
  }

  precisionBg(precision: PrecisionDireccion): string {
    switch (precision) {
      case 'EXACTA': return 'rgba(16,185,129,0.12)';
      case 'MANUAL': return 'rgba(59,130,246,0.12)';
      default:       return 'rgba(245,158,11,0.12)';
    }
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.dropdownOpen.set(false);
    this.personalDropdownOpen.set(false);
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

    // Una ubicación aproximada pide confirmación visible, pero NO bloquea el despacho:
    // el operador tilda y vuelve a enviar. Nunca se guarda una aproximada como exacta.
    if (this.requiereConfirmacionAproximada() && !this.f['ubicacionAproximadaConfirmada'].value) {
      this.f['ubicacionAproximadaConfirmada'].markAsTouched();
      this.feedback.push({
        type: 'warning',
        title: 'Confirmá la ubicación',
        message: 'La altura exacta no pudo confirmarse. Revisá el punto en el mapa y tildá la confirmación para despachar.',
      });
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
      const loc = this.selectedAddress();
      if (loc) {
        req.latitud = loc.latitude;
        req.longitud = loc.longitude;
        req.direccionNormalizada = loc.displayAddress;
        req.geocodingProvider = loc.provider;
        req.precisionDireccion = loc.precision;
      } else {
        // Sin punto elegido se registra igual (el flujo actual lo permite), pero queda
        // asentado que la ubicación no fue confirmada: no se inventa una precisión.
        req.precisionDireccion = 'NO_CONFIRMADA';
      }
    }

    if (this.modoSujeto() === 'personalSae') {
      // Sujeto = integrante del SAE. No se envía noAfiliado ni datos de paciente:
      // el backend resuelve el contexto en modalidad PERSONAL_INTERNO.
      req.profesionalSaludId = val.profesionalSaludId ?? undefined;
    } else if (this.modoSujeto() === 'noRegistrado') {
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
      // Contrato de atención — el backend solo lo aplica en esta rama (paciente no afiliado).
      if (val.contratoCoberturaId) {
        req.contratoCoberturaId = val.contratoCoberturaId;
        if (val.tipoContrato === 'CONVENIO_OBRA_SOCIAL') {
          if (val.planObraSocialId) req.planObraSocialId = val.planObraSocialId;
          if (val.numeroCredencial) req.numeroCredencial = val.numeroCredencial;
        }
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

  /**
   * Cambiar de modo limpia SIEMPRE el estado de los otros dos, para que no queden
   * valores residuales de una selección anterior en el request que se envía.
   */
  onModoSujetoChange(modo: ModoSujeto): void {
    if (this.modoSujeto() === modo) return;
    this.modoSujeto.set(modo);

    this.clearPaciente();
    this.clearPersonal();
    this.form.patchValue(
      {
        pacienteNombre: '',
        pacienteApellido: '',
        pacienteDni: '',
        pacienteTelefono: '',
        tipoNoAfiliado: 'particular',
        tipoContrato: null,
        contratoCoberturaId: null,
        planObraSocialId: null,
        numeroCredencial: '',
        motivoExcepcion: '',
      },
      { emitEvent: false }
    );
    this.planesObraSocial.set([]);

    this.applyConditionalValidators();
  }

  private applyConditionalValidators(): void {
    const modo = this.modoSujeto();
    const noAfiliado = modo === 'noRegistrado';
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

    // Exactamente un sujeto obligatorio según el modo: los validadores de los otros dos
    // se limpian siempre, para que un modo inactivo nunca bloquee el submit.
    if (noAfiliado) {
      this.f['pacienteId'].clearValidators();
      this.f['profesionalSaludId'].clearValidators();
      if (tipoNoAfiliado === 'nn') {
        this.f['pacienteNombre'].clearValidators();
        this.f['pacienteTelefono'].clearValidators();
      } else {
        this.f['pacienteNombre'].setValidators([Validators.required]);
        this.f['pacienteTelefono'].setValidators([Validators.required]);
      }
    } else if (modo === 'personalSae') {
      this.f['profesionalSaludId'].setValidators([Validators.required]);
      this.f['pacienteId'].clearValidators();
      this.f['pacienteNombre'].clearValidators();
      this.f['pacienteTelefono'].clearValidators();
    } else {
      this.f['pacienteId'].setValidators([Validators.required]);
      this.f['profesionalSaludId'].clearValidators();
      this.f['pacienteNombre'].clearValidators();
      this.f['pacienteTelefono'].clearValidators();
    }

    this.f['pacienteId'].updateValueAndValidity({ emitEvent: false });
    this.f['profesionalSaludId'].updateValueAndValidity({ emitEvent: false });
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
