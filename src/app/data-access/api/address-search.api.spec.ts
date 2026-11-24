import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AddressSearchApiService, SHARED_LOCATION_FALLBACK_ERROR } from './address-search.api';
import { AddressCandidate } from '../dto/address-search.dto';
import { environment } from '../../../environments/environment';

describe('AddressSearchApiService — ubicación compartida', () => {
  const url = `${environment.apiUrl}/api/v1/geo/direcciones/ubicacion-compartida`;
  let service: AddressSearchApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AddressSearchApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('envía el texto pegado por POST (nunca en la URL) y devuelve el candidato', () => {
    const candidate: AddressCandidate = {
      id: 'ubicacion_compartida',
      displayAddress: 'Ubicación compartida (-24.21873, -65.26251)',
      latitude: -24.218734,
      longitude: -65.262511,
      precision: 'MANUAL',
      provider: 'ubicacion_compartida',
      withinOperationalArea: true,
    };
    let result: AddressCandidate | undefined;

    service.resolveSharedLocation('-24.218734, -65.262511').subscribe(r => (result = r));

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ texto: '-24.218734, -65.262511' });
    req.flush(candidate);
    expect(result).toEqual(candidate);
  });

  it('propaga el motivo del 422 como mensaje para el operador', () => {
    let error: Error | undefined;

    service.resolveSharedLocation('Av. Bolivia 1500').subscribe({ error: e => (error = e) });

    httpMock
      .expectOne(url)
      .flush({ detail: 'No se encontraron coordenadas en la ubicación pegada.' }, { status: 422, statusText: 'Unprocessable Entity' });
    expect(error?.message).toBe('No se encontraron coordenadas en la ubicación pegada.');
  });

  it('ante un error de red usa un mensaje genérico, sin tumbar el alta', () => {
    let error: Error | undefined;

    service.resolveSharedLocation('https://maps.app.goo.gl/AbC123').subscribe({ error: e => (error = e) });

    httpMock.expectOne(url).error(new ProgressEvent('error'));
    expect(error?.message).toBe(SHARED_LOCATION_FALLBACK_ERROR);
  });
});
