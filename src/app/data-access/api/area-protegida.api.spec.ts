import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AreaProtegidaApiService } from './area-protegida.api';
import { AreaProtegidaDTO } from '../dto/area-protegida.dto';
import { environment } from '../../../environments/environment';

describe('AreaProtegidaApiService', () => {
  let service: AreaProtegidaApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AreaProtegidaApiService,
      ],
    });
    service = TestBed.inject(AreaProtegidaApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debería obtener áreas protegidas por institucionId', () => {
    service.getByInstitucion(5).subscribe((res: AreaProtegidaDTO[]) => {
      expect(res.length).toBe(1);
      expect(res[0].nombre).toBe('Sede Central');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/area-protegidas?institucionId.equals=5`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, nombre: 'Sede Central', institucionId: 5, estado: 'ACTIVA' }]);
  });

  it('debería crear una nueva área protegida', () => {
    const payload: AreaProtegidaDTO = { nombre: 'Sucursal Norte', institucionId: 5 };
    service.createAreaProtegida(payload).subscribe((res: AreaProtegidaDTO) => {
      expect(res.id).toBe(2);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/area-protegidas`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 2, ...payload });
  });

  it('debería eliminar una área protegida', () => {
    service.deleteAreaProtegida(1).subscribe((res) => {
      expect(res).toBeNull();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/area-protegidas/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
