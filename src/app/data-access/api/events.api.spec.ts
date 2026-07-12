import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EventsApiService, FrontendEvento } from './events.api';

describe('EventsApiService', () => {
  let service: EventsApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EventsApiService]
    });
    service = TestBed.inject(EventsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should map institucionId in payload when creating an event', () => {
    const mockEvent: FrontendEvento = {
      id: '',
      name: 'Test Event',
      type: 'Deportivo',
      org: 'Test Org',
      responsible: 'John Doe',
      attendees: 100,
      address: 'Test Address',
      dateFrom: '2026-07-12',
      timeFrom: '10:00',
      dateTo: '2026-07-12',
      timeTo: '12:00',
      units: [],
      status: 'scheduled',
      institucionId: 456
    };

    service.create(mockEvent).subscribe();

    const req = httpMock.expectOne(r => r.url.endsWith('/api/v2/eventos-cobertura'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body.institucionId).toBe(456);
  });

  it('should call cerrar endpoint on cerrar()', () => {
    service.cerrar(123).subscribe();

    const req = httpMock.expectOne(r => r.url.endsWith('/api/v2/eventos-cobertura/123/cerrar'));
    expect(req.request.method).toBe('POST');
  });
});
