import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { InventarioPageRoutingModule } from './inventario-routing.module';
import { InventarioPage } from './inventario.page';


import { AngularFirestoreModule } from '@angular/fire/compat/firestore';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    InventarioPageRoutingModule,
    AngularFirestoreModule,
  ],
  declarations: [InventarioPage]
})
export class InventarioPageModule {}
