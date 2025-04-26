import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IngresarPedidoPage } from './ingresar-pedido.page';

describe('IngresarPedidoPage', () => {
  let component: IngresarPedidoPage;
  let fixture: ComponentFixture<IngresarPedidoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(IngresarPedidoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
