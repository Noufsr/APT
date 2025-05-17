import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminpanelPageRoutingModule } from './adminpanel-routing.module';

import { AdminpanelPage } from './adminpanel.page';
import { UserListComponent } from 'src/app/components/user-list/user-list.component';
import { user } from '@angular/fire/auth';
import { UserDetailModalComponent } from 'src/app/components/user-detail-modal/user-detail-modal.component';
import { SharedModule } from "../../shared/shared.module";


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminpanelPageRoutingModule,SharedModule

],
  declarations: [AdminpanelPage,UserListComponent
    ,UserDetailModalComponent
  ],

})
export class AdminpanelPageModule {}
