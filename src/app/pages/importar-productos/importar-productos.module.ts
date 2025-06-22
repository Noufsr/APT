import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ImportarProductosPageRoutingModule } from './importar-productos-routing.module';
import { SharedModule } from "../../shared/shared.module";
import { ImportarProductosPage } from './importar-productos.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SharedModule,
    ImportarProductosPageRoutingModule
  ],
  declarations: [ImportarProductosPage]
})
export class ImportarProductosPageModule {}
