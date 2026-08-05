import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { EmergencyQuickCreateModalComponent } from './emergency-quick-create-modal.component';
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
});
