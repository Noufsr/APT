import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AccessDeniedPageRoutingModule } from './access-denied-routing.module';

import { AccessDeniedPage } from './access-denied.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AccessDeniedPageRoutingModule,
    SharedModule
  ],
  declarations: [AccessDeniedPage]
})
export class AccessDeniedPageModule {}
