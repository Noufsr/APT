import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CajaVecinaPageRoutingModule } from './caja-vecina-routing.module';

import { CajaVecinaPage } from './caja-vecina.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CajaVecinaPageRoutingModule
  ],
  declarations: [CajaVecinaPage]
})
export class CajaVecinaPageModule {}
