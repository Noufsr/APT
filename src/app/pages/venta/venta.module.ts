import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { VentaPageRoutingModule } from './venta-routing.module';

import { VentaPage } from './venta.page';
import { SharedModule } from "../../shared/shared.module";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    VentaPageRoutingModule,
    SharedModule
],
  declarations: [VentaPage]
})
export class VentaPageModule {}
