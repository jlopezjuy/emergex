import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { GruposFamiliaresComponent } from './grupos-familiares.component';
import { environment } from '../../../environments/environment';
import { rutaParaEntidad } from '../../core/navigation/entidad-ruta';

describe('GruposFamiliaresComponent', () => {
  let component: GruposFamiliaresComponent;
  let fixture: ComponentFixture<GruposFamiliaresComponent>;
  let httpMock: HttpTestingController;

  const mockGrupos = [
    {
      id: 1,
      numeroCuenta: 'GF-001',
      estadoGrupo: 'ACTIVO',
      observacion: 'Grupo familiar principal',
      ciudad: 'Córdoba',
      titularNombre: 'Carlos Gomez',
      titularDni: '25111222',
      titularPacienteId: 10,
      miembros: [
        { id: 101, pacienteId: 10, nombre: 'Carlos', apellido: 'Gomez', dni: '25111222', rolFamiliar: 'TITULAR', estado: 'ACTIVA' },
        { id: 102, pacienteId: 11, nombre: 'Laura', apellido: 'Perez', dni: '28333444', rolFamiliar: 'DEPENDIENTE', estado: 'ACTIVA' }
      ]
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GruposFamiliaresComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GruposFamiliaresComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crear el componente y cargar los grupos familiares', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne(`${environment.apiUrl}/api/grupo-familiars`);
    expect(req.request.method).toBe('GET');
    req.flush(mockGrupos);

    fixture.detectChanges();

    expect(component.grupos().length).toBe(1);
    expect(component.filtered().length).toBe(1);
  });

  it('debe resolver correctamente la ruta hacia la ficha 360 del paciente usando rutaParaEntidad', () => {
    const ruta = component.obtenerRutaPaciente(10);
    expect(ruta).toBe('/patients/10');
    expect(ruta).toBe(rutaParaEntidad('AFILIADO', 10));
  });

  it('debe identificar al titular del grupo familiar', () => {
    const titular = component.obtenerTitular(mockGrupos[0]);
    expect(titular).toBeDefined();
    expect(titular?.nombre).toBe('Carlos');
    expect(titular?.rolFamiliar).toBe('TITULAR');
  });
});
