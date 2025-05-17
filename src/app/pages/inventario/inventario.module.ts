import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { InventarioPageRoutingModule } from './inventario-routing.module';
import { InventarioPage } from './inventario.page';


import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    InventarioPageRoutingModule,SharedModule,

    AngularFirestoreModule,

  ],
  declarations: [InventarioPage]
})
export class InventarioPageModule {}
