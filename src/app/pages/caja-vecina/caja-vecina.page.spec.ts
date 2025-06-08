import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CajaVecinaPage } from './caja-vecina.page';

describe('CajaVecinaPage', () => {
  let component: CajaVecinaPage;
  let fixture: ComponentFixture<CajaVecinaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CajaVecinaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
