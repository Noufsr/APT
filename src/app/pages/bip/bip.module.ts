import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { BipPageRoutingModule } from './bip-routing.module';
import { BipPage } from './bip.page';
import { SharedModule } from "../../shared/shared.module";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    BipPageRoutingModule,
    SharedModule
],
  declarations: [BipPage]
})
export class BipPageModule {}
