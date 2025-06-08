import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { BipPageRoutingModule } from './bip-routing.module';

import { BipPage } from './bip.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    BipPageRoutingModule
  ],
  declarations: [BipPage]
})
export class BipPageModule {}
