import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { IonicModule } from '@ionic/angular';
import { DevolucionPageRoutingModule } from './devolucion-routing.module';
import { DevolucionPage } from './devolucion.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SharedModule,
    DevolucionPageRoutingModule
  ],
  declarations: [DevolucionPage]
})
export class DevolucionPageModule {}
