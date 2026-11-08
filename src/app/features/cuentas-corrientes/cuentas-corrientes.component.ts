import { Component, OnInit, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LedgerApiService } from '../../data-access/api/ledger.api';
import { TercerosApiService } from '../../data-access/api/terceros.api';
import { LedgerMovimientoDTO, TerceroResumenDTO, AgingDeudaDTO } from '../../data-access/dto/ledger.dto';
import { CobranzasApiService, DocumentoPendienteDTO } from '../../data-access/api/cobranzas.api';
import { RegistrarCobranzaModalComponent } from './components/registrar-cobranza-modal/registrar-cobranza-modal.component';

@Component({
  selector: 'app-cuentas-corrientes',
  standalone: true,
  imports: [CommonModule, FormsModule, RegistrarCobranzaModalComponent],
  template: `
    <div class="cxp-container p-6 space-y-6">
      <header class="flex justify-between items-center bg-slate-900 text-white p-6 rounded-xl shadow-lg border border-slate-800">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">Submayor de Cuentas Corrientes</h1>
          <p class="text-slate-400 text-sm mt-1">Libro de Entrada Inmutable (Append-Only) para Auditoría Financiera SAE</p>
        </div>
      </header>

      <section class="bg-white rounded-xl shadow p-6 border border-slate-200 space-y-3">
        <label class="block text-sm font-semibold text-slate-700">Buscar tercero por razón social, nombre o CUIT</label>
        <input
          type="text"
          class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          placeholder="Ej: Droguería del Sur, 30-71234567-8..."
          [ngModel]="searchText()"
          (ngModelChange)="onSearchChange($event)"
        />

        @if (buscando()) {
          <p class="text-sm text-slate-400">Buscando...</p>
        } @else if (searchText().trim() && resultados().length === 0) {
          <p class="text-sm text-slate-400">Sin coincidencias.</p>
        } @else if (resultados().length > 0 && !terceroSeleccionado()) {
          <ul class="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-56 overflow-y-auto">
            @for (t of resultados(); track t.id) {
              <li
                class="px-3 py-2 text-sm cursor-pointer hover:bg-slate-50"
                (click)="seleccionarTercero(t)"
              >
                <span class="font-medium text-slate-800">{{ t.nombreComercial || t.razonSocial }}</span>
                <span class="text-slate-400 ml-2">{{ t.razonSocial }} · CUIT {{ t.cuit }}</span>
              </li>
            }
          </ul>
        }
      </section>

      <!-- Aging de Deuda KPIs -->
      @if (!terceroSeleccionado() && agingDeuda()) {
        <section class="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div class="bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm">
            <p class="text-xs font-semibold text-green-700 uppercase">No Vencido</p>
            <p class="text-xl font-bold text-green-900 mt-1">$ {{ agingDeuda()?.noVencido | number:'1.2-2' }}</p>
          </div>
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
            <p class="text-xs font-semibold text-amber-700 uppercase">0–30 días</p>
            <p class="text-xl font-bold text-amber-900 mt-1">$ {{ agingDeuda()?.tramo0a30 | number:'1.2-2' }}</p>
          </div>
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
            <p class="text-xs font-semibold text-amber-700 uppercase">31–60 días</p>
            <p class="text-xl font-bold text-amber-900 mt-1">$ {{ agingDeuda()?.tramo31a60 | number:'1.2-2' }}</p>
          </div>
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
            <p class="text-xs font-semibold text-amber-700 uppercase">61–90 días</p>
            <p class="text-xl font-bold text-amber-900 mt-1">$ {{ agingDeuda()?.tramo61a90 | number:'1.2-2' }}</p>
          </div>
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
            <p class="text-xs font-semibold text-amber-700 uppercase">+90 días</p>
            <p class="text-xl font-bold text-amber-900 mt-1">$ {{ agingDeuda()?.tramo90plus | number:'1.2-2' }}</p>
          </div>
          <div class="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm md:col-span-5 flex justify-between items-center">
            <p class="text-sm font-semibold text-red-700 uppercase">Total Vencido</p>
            <p class="text-2xl font-bold text-red-900">$ {{ agingDeuda()?.totalVencido | number:'1.2-2' }}</p>
          </div>
        </section>
      }

      <!-- Listado Inicial Proactivo de Clientes / Terceros con Cuenta Corriente -->
      @if (!terceroSeleccionado()) {
        <section class="bg-white rounded-xl shadow p-6 border border-slate-200 space-y-4">
          <div class="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h2 class="text-base font-bold text-slate-800">Clientes & Terceros con Cuenta Corriente</h2>
              <p class="text-xs text-slate-500">Seleccioná un cliente para consultar su submayor o registrar un cobro directo</p>
            </div>
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              (click)="cargarTercerosIniciales()"
            >
              ↻ Actualizar
            </button>
          </div>

          @if (loadingRecientes()) {
            <p class="text-xs text-slate-400 py-4">Cargando terceros con cuenta corriente...</p>
          } @else if (tercerosRecientes().length === 0) {
            <p class="text-xs text-slate-400 py-4">No se encontraron terceros registrados.</p>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase tracking-wider">
                    <th class="py-3 px-4">Tercero / Razón Social</th>
                    <th class="py-3 px-4">CUIT</th>
                    <th class="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-slate-700">
                  @for (t of tercerosRecientes(); track t.id) {
                    <tr class="hover:bg-slate-50 transition">
                      <td class="py-3 px-4 font-semibold text-slate-800">
                        {{ t.nombreComercial || t.razonSocial }}
                        @if (t.nombreComercial && t.nombreComercial !== t.razonSocial) {
                          <span class="text-slate-400 font-normal ml-1">({{ t.razonSocial }})</span>
                        }
                      </td>
                      <td class="py-3 px-4 font-mono text-slate-500">{{ t.cuit || '—' }}</td>
                      <td class="py-3 px-4 text-right space-x-2">
                        <button
                          type="button"
                          class="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition border border-blue-200"
                          (click)="seleccionarTercero(t)"
                        >
                          Ver Submayor →
                        </button>
                        <button
                          type="button"
                          class="px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-sm"
                          (click)="abrirModalCobranza(t.id)"
                        >
                          + Registrar Cobro
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      }

      @if (terceroSeleccionado(); as tercero) {
        <section class="bg-white rounded-xl shadow p-6 border border-slate-200 space-y-4">
          <div class="flex justify-between items-start">
            <div>
              <h2 class="text-lg font-semibold text-slate-800">{{ tercero.nombreComercial || tercero.razonSocial }}</h2>
              <p class="text-sm text-slate-500">{{ tercero.razonSocial }} · CUIT {{ tercero.cuit }}</p>
            </div>
            <div class="flex gap-2">
              @if (tipoSubmayor() === 'CXC') {
                <button type="button" class="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition" (click)="abrirModalCobranza(tercero.id)">Registrar Cobro</button>
              }
              <button type="button" class="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition" (click)="limpiarSeleccion()">Cambiar tercero</button>
            </div>
          </div>

          <!-- Selector de Submayor CxC / CxP -->
          <div class="flex space-x-2 border-b border-slate-200 pb-3">
            <button
              type="button"
              (click)="setSubmayor('CXC')"
              [class.bg-blue-600]="tipoSubmayor() === 'CXC'"
              [class.text-white]="tipoSubmayor() === 'CXC'"
              [class.bg-slate-100]="tipoSubmayor() !== 'CXC'"
              [class.text-slate-700]="tipoSubmayor() !== 'CXC'"
              class="px-4 py-2 text-xs font-bold rounded-lg transition shadow-sm"
            >
              Cuentas por Cobrar (CxC — Clientes)
            </button>
            <button
              type="button"
              (click)="setSubmayor('CXP')"
              [class.bg-blue-600]="tipoSubmayor() === 'CXP'"
              [class.text-white]="tipoSubmayor() === 'CXP'"
              [class.bg-slate-100]="tipoSubmayor() !== 'CXP'"
              [class.text-slate-700]="tipoSubmayor() !== 'CXP'"
              class="px-4 py-2 text-xs font-bold rounded-lg transition shadow-sm"
            >
              Cuentas por Pagar (CxP — Proveedores)
            </button>
          </div>

          @if (loadingCuenta()) {
            <p class="text-sm text-slate-400">Cargando estado de cuenta...</p>
          } @else if (error()) {
            <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              {{ error() }}
            </div>
          } @else {
            <div class="bg-slate-50 border border-slate-200 rounded-lg p-4 flex justify-between items-center">
              <div>
                <span class="text-xs font-bold uppercase tracking-wider block" [class.text-emerald-700]="tipoSubmayor() === 'CXC'" [class.text-amber-700]="tipoSubmayor() === 'CXP'">
                  {{ tipoSubmayor() === 'CXC' ? 'Saldo a nuestro favor (nos deben)' : 'Saldo a pagar (le debemos al proveedor)' }}
                </span>
                <span class="text-2xl font-extrabold text-slate-800">$ {{ saldo() | number: '1.2-2' }}</span>
              </div>
              <div class="flex items-center gap-2">
                <button type="button" class="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-lg transition border border-slate-300" (click)="exportarCsvPage()">
                  📥 Exportar CSV (Página)
                </button>
                <span class="text-xs px-3 py-1 font-semibold rounded-full bg-slate-200 text-slate-700">
                  Submayor {{ tipoSubmayor() }}
                </span>
              </div>
            </div>

            <table class="w-full text-left text-sm border-collapse">
              <thead>
                <tr class="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                  <th class="p-3">ID</th>
                  <th class="p-3">Fecha Contable</th>
                  <th class="p-3">Tipo Movimiento</th>
                  <th class="p-3">Concepto</th>
                  <th class="p-3 text-right">DEBE</th>
                  <th class="p-3 text-right">HABER</th>
                </tr>
              </thead>
              <tbody>
                @for (m of movimientos(); track m.id) {
                  <tr class="border-b border-slate-100 hover:bg-slate-50">
                    <td class="p-3 font-mono text-xs">{{ m.id }}</td>
                    <td class="p-3">{{ m.fechaContable }}</td>
                    <td class="p-3">
                      <span class="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800">
                        {{ m.tipoMovimiento }}
                      </span>
                    </td>
                    <td class="p-3 font-medium text-slate-800">{{ m.concepto }}</td>
                    <td class="p-3 text-right font-mono font-semibold text-blue-600">$ {{ m.montoDebe | number: '1.2-2' }}</td>
                    <td class="p-3 text-right font-mono font-semibold text-red-600">$ {{ m.montoHaber | number: '1.2-2' }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="p-6 text-center text-slate-400">Sin movimientos registrados en {{ tipoSubmayor() }}.</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </section>
      }

      @if (mostrarModalCobranza()) {
        <app-registrar-cobranza-modal
          [terceroEmpresaId]="terceroCobroId()!"
          [documentosPendientes]="documentosPendientes()"
          (cerrar)="mostrarModalCobranza.set(false)"
          (cobranzaRegistrada)="onCobranzaRegistrada(terceroCobroId()!)"
        ></app-registrar-cobranza-modal>
      }
    </div>
  `,
})
export class CuentasCorrientesComponent implements OnInit {
  private readonly ledgerApi = inject(LedgerApiService);
  private readonly tercerosApi = inject(TercerosApiService);
  private readonly cobranzasApi = inject(CobranzasApiService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly searchSubject = new Subject<string>();

  readonly searchText = signal('');
  readonly buscando = signal(false);
  readonly resultados = signal<TerceroResumenDTO[]>([]);
  readonly terceroSeleccionado = signal<TerceroResumenDTO | null>(null);

  readonly tipoSubmayor = signal<'CXC' | 'CXP'>('CXC');
  readonly loadingCuenta = signal(false);
  readonly error = signal<string | null>(null);
  readonly saldo = signal(0);
  readonly movimientos = signal<LedgerMovimientoDTO[]>([]);

  readonly agingDeuda = signal<AgingDeudaDTO | null>(null);
  readonly loadingAging = signal(false);
  readonly tercerosRecientes = signal<TerceroResumenDTO[]>([]);
  readonly loadingRecientes = signal(false);

  readonly mostrarModalCobranza = signal(false);
  /**
   * Tercero al que se le registra el cobro. Es propio del modal y no sale de
   * `terceroSeleccionado`: el cobro también se abre desde la fila de la lista, donde no hay ningún
   * tercero seleccionado (QA-ROL-019).
   */
  readonly terceroCobroId = signal<number | null>(null);
  readonly documentosPendientes = signal<DocumentoPendienteDTO[]>([]);

  ngOnInit(): void {
    this.cargarAging();
    this.cargarTercerosIniciales();

    this.searchSubject
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((texto) => this.buscarTerceros(texto));
  }

  cargarTercerosIniciales(): void {
    this.loadingRecientes.set(true);
    this.tercerosApi
      .buscar('')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.tercerosRecientes.set(items || []);
          this.loadingRecientes.set(false);
        },
        error: () => {
          this.tercerosRecientes.set([]);
          this.loadingRecientes.set(false);
        }
      });
  }

  onSearchChange(value: string): void {
    this.searchText.set(value);
    this.terceroSeleccionado.set(null);
    this.searchSubject.next(value);
  }

  setSubmayor(tipo: 'CXC' | 'CXP'): void {
    this.tipoSubmayor.set(tipo);
    const tercero = this.terceroSeleccionado();
    if (tercero) {
      this.cargarEstadoCuenta(tercero.id);
    }
  }

  private buscarTerceros(texto: string): void {
    if (!texto.trim()) {
      this.resultados.set([]);
      return;
    }
    this.buscando.set(true);
    this.tercerosApi
      .buscar(texto.trim())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.resultados.set(items);
          this.buscando.set(false);
        },
        error: () => {
          this.resultados.set([]);
          this.buscando.set(false);
        },
      });
  }

  seleccionarTercero(tercero: TerceroResumenDTO): void {
    this.terceroSeleccionado.set(tercero);
    this.resultados.set([]);
    this.cargarEstadoCuenta(tercero.id);
  }

  limpiarSeleccion(): void {
    this.terceroSeleccionado.set(null);
    this.searchText.set('');
    this.movimientos.set([]);
    this.saldo.set(0);
    this.error.set(null);
  }

  private cargarEstadoCuenta(terceroId: number): void {
    this.loadingCuenta.set(true);
    this.error.set(null);

    const isCxc = this.tipoSubmayor() === 'CXC';
    const saldo$ = isCxc ? this.ledgerApi.getSaldoCxc(terceroId) : this.ledgerApi.getSaldoCxp(terceroId);
    const movs$ = isCxc ? this.ledgerApi.getMovimientosCxc(terceroId) : this.ledgerApi.getMovimientosCxp(terceroId);

    forkJoin({
      saldo: saldo$,
      movimientos: movs$,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ saldo, movimientos }) => {
          this.saldo.set(saldo);
          this.movimientos.set(movimientos);
          this.loadingCuenta.set(false);
        },
        error: (err) => {
          this.error.set(err?.error?.detail ?? err?.error?.title ?? 'No se pudo cargar el estado de cuenta del tercero.');
          this.loadingCuenta.set(false);
        },
      });
  }

  private cargarAging(): void {
    this.loadingAging.set(true);
    this.ledgerApi.getAgingDeuda().subscribe({
      next: (aging) => {
        this.agingDeuda.set(aging);
        this.loadingAging.set(false);
      },
      error: () => {
        this.agingDeuda.set(null);
        this.loadingAging.set(false);
      }
    });
  }

  abrirModalCobranza(terceroId: number): void {
    this.cobranzasApi.getDocumentosPendientes(terceroId).subscribe({
      next: (docs) => {
        this.documentosPendientes.set(docs);
        this.terceroCobroId.set(terceroId);
        this.mostrarModalCobranza.set(true);
      },
      error: (err) => {
        this.error.set('No se pudieron cargar los documentos pendientes: ' + (err?.error?.detail || err.message));
      }
    });
  }

  onCobranzaRegistrada(terceroId: number): void {
    this.mostrarModalCobranza.set(false);
    // Sólo hay un estado de cuenta abierto si se entró por "Ver Submayor"; desde la lista no.
    if (this.terceroSeleccionado()?.id === terceroId) {
      this.cargarEstadoCuenta(terceroId);
    }
    this.cargarAging(); // Update aging numbers as well
  }

  // NOTA F4-04: Exportación de página/lista visible actual según decisión humana #6.
  // Para iterar todo el filtro server-side a futuro, extender con llamadas paginadas.
  exportarCsvPage(): void {
    const list = this.movimientos();
    if (!list || list.length === 0) return;
    let csv = 'data:text/csv;charset=utf-8,ID,Fecha Contable,Tipo Movimiento,Concepto,Debe,Haber\n';
    list.forEach((m) => {
      csv += `${m.id},"${m.fechaContable || ''}","${m.tipoMovimiento || ''}","${m.concepto || ''}",${m.montoDebe || 0},${m.montoHaber || 0}\n`;
    });
    const encoded = encodeURI(csv);
    const a = document.createElement('a');
    a.href = encoded;
    a.download = `cuentas-corrientes-${this.tipoSubmayor()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }
}
