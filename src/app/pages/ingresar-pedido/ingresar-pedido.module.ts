
import { NgModule,CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { IngresarPedidoPageRoutingModule } from './ingresar-pedido-routing.module';
import { IngresarPedidoPage } from './ingresar-pedido.page';
import { NuevoProveedorComponent } from '../../components/nuevo-proveedor/nuevo-proveedor.component';
import { NuevoProductoComponent } from '../../components/nuevo-producto/nuevo-producto.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    IngresarPedidoPageRoutingModule
  ],
  declarations: [
    IngresarPedidoPage,
    NuevoProveedorComponent,
    NuevoProductoComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class IngresarPedidoPageModule {}

