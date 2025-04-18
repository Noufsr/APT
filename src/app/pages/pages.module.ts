import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PagesRoutingModule } from './pages-routing.module';
import { LoginComponent } from './login/login.component';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HomeComponent } from './home/home.component';


@NgModule({
  declarations: [
    LoginComponent,HomeComponent
  ],
  imports: [
    CommonModule,
    PagesRoutingModule,IonicModule,FormsModule,ReactiveFormsModule
  ]
})
export class PagesModule { }
