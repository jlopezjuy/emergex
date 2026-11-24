import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmergencyQuickCreateModalComponent, deriveEstadoComercial } from './emergency-quick-create-modal.component';
import { AddressCandidate } from '../../../../data-access/dto/address-search.dto';

/**
 * Foco: la exclusividad de los tres modos de sujeto y que la ubicación nunca se dé por
 * confirmada sola. Son los dos invariantes que, si se rompen, mandan un móvil al lugar
 * equivocado o registran una emergencia con el sujeto equivocado.
 */
describe('EmergencyQuickCreateModalComponent', () => {
  let component: EmergencyQuickCreateModalComponent;

  const candidato = (overrides: Partial<AddressCandidate> = {}): AddressCandidate => ({
    id: '0',
    displayAddress: 'Belgrano 722, San Salvador de Jujuy, Jujuy',
    locality: 'San Salvador de Jujuy',
    province: 'Jujuy',
    houseNumber: '722',
    latitude: -24.1855,
    longitude: -65.299,
    precision: 'EXACTA',
    provider: 'geoapify',
    withinOperationalArea: true,
    ...overrides,
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmergencyQuickCreateModalComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    component = TestBed.createComponent(EmergencyQuickCreateModalComponent).componentInstance;
  });

  describe('modo de sujeto asistido', () => {
    it('arranca en paciente registrado, igual que antes del cambio', () => {
      expect(component.modoSujeto()).toBe('registrado');
    });

    it('los tres modos son excluyentes: activar uno desactiva los otros', () => {
      component.onModoSujetoChange('personalSae');
      expect(component.modoSujeto()).toBe('personalSae');

      component.onModoSujetoChange('noRegistrado');
      expect(component.modoSujeto()).toBe('noRegistrado');
      expect(component.modoSujeto()).not.toBe('personalSae');
    });

    it('exige paciente registrado sólo en modo registrado', () => {
      expect(component.form.controls['pacienteId'].hasError('required')).toBe(true);
      expect(component.form.controls['profesionalSaludId'].hasError('required')).toBe(false);
    });

    it('exige personal SAE sólo en modo personalSae', () => {
      component.onModoSujetoChange('personalSae');

      expect(component.form.controls['profesionalSaludId'].hasError('required')).toBe(true);
      expect(component.form.controls['pacienteId'].hasError('required')).toBe(false);
    });

    it('no exige ningún id en modo no registrado, pero sí nombre y teléfono', () => {
      component.onModoSujetoChange('noRegistrado');

      expect(component.form.controls['pacienteId'].hasError('required')).toBe(false);
      expect(component.form.controls['profesionalSaludId'].hasError('required')).toBe(false);
      expect(component.form.controls['pacienteNombre'].hasError('required')).toBe(true);
      expect(component.form.controls['pacienteTelefono'].hasError('required')).toBe(true);
    });

    it('cambiar de modo no deja valores residuales del modo anterior', () => {
      component.selectPersonal({ profesionalSaludId: 9, nombreCompleto: 'Pérez, Ana', matricula: 'MP-123' });
      expect(component.form.controls['profesionalSaludId'].value).toBe(9);

      component.onModoSujetoChange('noRegistrado');
      component.form.patchValue({ pacienteNombre: 'Juan', pacienteDni: '30111222' });

      component.onModoSujetoChange('registrado');

      expect(component.selectedPersonal()).toBeNull();
      expect(component.form.controls['profesionalSaludId'].value).toBeNull();
      expect(component.form.controls['pacienteId'].value).toBeNull();
      expect(component.form.controls['pacienteNombre'].value).toBe('');
      expect(component.form.controls['pacienteDni'].value).toBe('');
    });

    it('quitar el personal seleccionado limpia el id enviado al backend', () => {
      component.onModoSujetoChange('personalSae');
      component.selectPersonal({ profesionalSaludId: 7, nombreCompleto: 'Gómez, Luis' });

      component.clearPersonal();

      expect(component.selectedPersonal()).toBeNull();
      expect(component.form.controls['profesionalSaludId'].value).toBeNull();
    });
  });

  describe('confirmación de ubicación', () => {
    it('no hay ubicación seleccionada hasta que el operador elige una', () => {
      expect(component.selectedAddress()).toBeNull();
    });

    it('elegir un candidato fija el punto y limpia la lista de resultados', () => {
      component.addressCandidates.set([candidato(), candidato({ id: '1' })]);

      component.selectAddress(candidato());

      expect(component.selectedAddress()?.latitude).toBe(-24.1855);
      expect(component.addressCandidates()).toHaveLength(0);
      expect(component.form.controls['direccion'].value).toBe('Belgrano 722, San Salvador de Jujuy, Jujuy');
    });

    it('una ubicación EXACTA no pide confirmación extra', () => {
      component.selectAddress(candidato({ precision: 'EXACTA' }));

      expect(component.requiereConfirmacionAproximada()).toBe(false);
    });

    it('una ubicación APROXIMADA sí pide confirmación explícita', () => {
      component.selectAddress(candidato({ precision: 'APROXIMADA' }));

      expect(component.requiereConfirmacionAproximada()).toBe(true);
      expect(component.form.controls['ubicacionAproximadaConfirmada'].value).toBe(false);
    });

    it('marcar el punto a mano queda como MANUAL y no pide confirmación', () => {
      component.setManualLocation({ lat: -24.2, lng: -65.31 });

      expect(component.selectedAddress()?.precision).toBe('MANUAL');
      expect(component.selectedAddress()?.latitude).toBe(-24.2);
      expect(component.requiereConfirmacionAproximada()).toBe(false);
    });

    it('elegir otro candidato aproximado obliga a confirmar de nuevo', () => {
      component.selectAddress(candidato({ precision: 'APROXIMADA' }));
      component.form.controls['ubicacionAproximadaConfirmada'].setValue(true);

      component.selectAddress(candidato({ id: '1', precision: 'APROXIMADA', displayAddress: 'Otra dirección' }));

      expect(component.form.controls['ubicacionAproximadaConfirmada'].value).toBe(false);
    });

    it('informa la precisión real con etiquetas distinguibles', () => {
      expect(component.precisionLabel('EXACTA')).toBe('Ubicación exacta');
      expect(component.precisionLabel('APROXIMADA')).toBe('Ubicación aproximada');
      expect(component.precisionLabel('MANUAL')).toBe('Punto marcado a mano');
      expect(component.precisionLabel('NO_CONFIRMADA')).toBe('Sin confirmar');
    });
  });

  describe('tipos de asistencia', () => {
    it('ofrece Reconocimiento médico junto a los tipos históricos', () => {
      const valores = component.tiposAsistencia.map(t => t.value);

      expect(valores).toContain('RECONOCIMIENTO_MEDICO');
      expect(valores).toContain('EMERGENCIA_DOMICILIARIA');
      expect(valores).toContain('ORIENTACION_TELEFONICA');
    });

    it('Reconocimiento médico es presencial: la dirección sigue siendo obligatoria', () => {
      component.form.controls['tipoAsistencia'].setValue('RECONOCIMIENTO_MEDICO');

      expect(component.form.controls['direccion'].hasError('required')).toBe(true);
    });
  });

  describe('contrato de atención con paciente registrado (A4-T2)', () => {
    it('con paciente registrado y contrato elegido, el payload de alta rápida incluye contratoCoberturaId y plan', () => {
      const emergencyApi = (component as unknown as { emergencyApi: { altaRapida: (req: unknown) => unknown } })['emergencyApi'];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const altaSpy = vi.spyOn(emergencyApi, 'altaRapida').mockReturnValue({ pipe: () => ({ subscribe: () => {} }) } as any);

      component.selectPaciente({
        id: 10,
        nombre: 'Carlos',
        apellido: 'Lopez',
        dni: '30111222',
        estadoComercial: 'ACTIVO',
        coberturaEstado: 'ACTIVA',
        puedeRecibirEmergencia: true,
      });

      component.form.patchValue({
        tipoAsistencia: 'EMERGENCIA_DOMICILIARIA',
        nivelUrgencia: 'ROJO',
        descripcionSintomas: 'Dolor precordial',
        direccion: 'Av. Santa Fe 1234',
        tipoContrato: 'CONVENIO_OBRA_SOCIAL',
        contratoCoberturaId: 100,
        planObraSocialId: 300,
        numeroCredencial: '1234567890',
      });

      component.submit();

      expect(altaSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          pacienteId: 10,
          contratoCoberturaId: 100,
          planObraSocialId: 300,
          numeroCredencial: '1234567890',
        })
      );
    });
  });

  describe('ubicación compartida por el llamante (U1)', () => {
    const compartida = (overrides: Partial<AddressCandidate> = {}): AddressCandidate =>
      candidato({
        id: 'ubicacion_compartida',
        displayAddress: 'Av. Bolivia 2100, Alto Comedero',
        houseNumber: undefined,
        latitude: -24.218734,
        longitude: -65.262511,
        precision: 'MANUAL',
        provider: 'ubicacion_compartida',
        ...overrides,
      });

    const addressApi = () =>
      (component as unknown as { addressApi: { resolveSharedLocation: (texto: string) => unknown } })['addressApi'];

    const emergencyApi = () =>
      (component as unknown as { emergencyApi: { sugerirAreaProtegida: (lat: number, lng: number) => unknown } })['emergencyApi'];

    beforeEach(() => {
      vi.spyOn(emergencyApi(), 'sugerirAreaProtegida').mockReturnValue(of(null));
    });

    it('fija el punto compartido como MANUAL, limpia la lista y completa la dirección vacía', () => {
      const spy = vi.spyOn(addressApi(), 'resolveSharedLocation').mockReturnValue(of(compartida()));
      component.addressCandidates.set([candidato()]);

      component.applySharedLocation('https://maps.app.goo.gl/AbC123');

      expect(spy).toHaveBeenCalledWith('https://maps.app.goo.gl/AbC123');
      expect(component.selectedAddress()).toEqual(compartida());
      expect(component.addressCandidates()).toEqual([]);
      expect(component.form.controls['direccion'].value).toBe('Av. Bolivia 2100, Alto Comedero');
      expect(component.requiereConfirmacionAproximada()).toBe(false);
      expect(component.sharedLocationError()).toBeNull();
      expect(emergencyApi().sugerirAreaProtegida).toHaveBeenCalledWith(-24.218734, -65.262511);
    });

    it('respeta la referencia que ya escribió el operador', () => {
      vi.spyOn(addressApi(), 'resolveSharedLocation').mockReturnValue(of(compartida()));
      component.form.controls['direccion'].setValue('Barrio 200 viviendas, casa azul', { emitEvent: false });

      component.applySharedLocation('-24.218734, -65.262511');

      expect(component.form.controls['direccion'].value).toBe('Barrio 200 viviendas, casa azul');
      expect(component.selectedAddress()?.latitude).toBe(-24.218734);
    });

    it('muestra el motivo si no se reconoce y no toca la ubicación ya elegida', () => {
      vi.spyOn(addressApi(), 'resolveSharedLocation').mockReturnValue(
        throwError(() => new Error('No se encontraron coordenadas en la ubicación pegada.')),
      );
      component.selectAddress(candidato());

      component.applySharedLocation('Av. Bolivia 1500');

      expect(component.sharedLocationError()).toBe('No se encontraron coordenadas en la ubicación pegada.');
      expect(component.selectedAddress()).toEqual(candidato());
      expect(component.sharedLocationResolving()).toBe(false);
    });

    it('no consulta el backend con texto vacío', () => {
      const spy = vi.spyOn(addressApi(), 'resolveSharedLocation');

      component.applySharedLocation('   ');

      expect(spy).not.toHaveBeenCalled();
    });

    it('avisa cuando el punto compartido cae fuera de la zona operativa', () => {
      vi.spyOn(addressApi(), 'resolveSharedLocation').mockReturnValue(of(compartida({ withinOperationalArea: false })));

      component.applySharedLocation('-24.9, -65.9');

      expect(component.ubicacionFueraDeZona()).toBe(true);
    });

    it('un punto dentro de la zona no muestra el aviso', () => {
      vi.spyOn(addressApi(), 'resolveSharedLocation').mockReturnValue(of(compartida()));

      component.applySharedLocation('-24.218734, -65.262511');

      expect(component.ubicacionFueraDeZona()).toBe(false);
    });
  });

  describe('sugerencia de área protegida por proximidad (A4-T5)', () => {
    it('al seleccionar dirección con coordenadas, consulta la sugerencia de área protegida y permite aplicarla', () => {
      const emergencyApi = (component as unknown as { emergencyApi: { sugerirAreaProtegida: (lat: number, lng: number) => unknown } })['emergencyApi'];
      const sugSpy = vi.spyOn(emergencyApi, 'sugerirAreaProtegida').mockReturnValue(of({
        areaProtegidaId: 50,
        nombre: 'Club Social',
        distanciaMetros: 45,
        dentroDeHorario: true,
        contratoCoberturaId: 88,
      }));

      component.selectAddress({
        id: 'addr-1',
        displayAddress: 'Av. Belgrano 500',
        latitude: -24.1855,
        longitude: -65.2990,
        precision: 'EXACTA',
        provider: 'carto',
      });

      expect(sugSpy).toHaveBeenCalledWith(-24.1855, -65.2990);
      expect(component.sugerenciaAreaProtegida()).toEqual(expect.objectContaining({
        areaProtegidaId: 50,
        nombre: 'Club Social',
      }));

      component.aplicarSugerenciaAreaProtegida();
      expect(component.form.get('tipoContrato')?.value).toBe('AREA_PROTEGIDA');
      expect(component.form.get('contratoCoberturaId')?.value).toBe(88);
    });
  });
});

describe('deriveEstadoComercial — chip de paciente (BUG-E2E-012)', () => {
  it('muestra ACTIVO cuando el backend resuelve puedeRecibirEmergencia=true', () => {
    expect(deriveEstadoComercial(true)).toBe('ACTIVO');
  });

  it('no muestra INACTIVO para cobertura activa sin grupo', () => {
    expect(deriveEstadoComercial(true)).not.toBe('INACTIVO');
  });

  it('muestra INACTIVO cuando puedeRecibirEmergencia es false o indefinido', () => {
    expect(deriveEstadoComercial(false)).toBe('INACTIVO');
    expect(deriveEstadoComercial(undefined)).toBe('INACTIVO');
  });
});
