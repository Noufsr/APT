import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImportarProductosPage } from './importar-productos.page';

describe('ImportarProductosPage', () => {
  let component: ImportarProductosPage;
  let fixture: ComponentFixture<ImportarProductosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ImportarProductosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
