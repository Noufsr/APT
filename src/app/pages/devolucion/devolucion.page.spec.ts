import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DevolucionPage } from './devolucion.page';

describe('DevolucionPage', () => {
  let component: DevolucionPage;
  let fixture: ComponentFixture<DevolucionPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DevolucionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
