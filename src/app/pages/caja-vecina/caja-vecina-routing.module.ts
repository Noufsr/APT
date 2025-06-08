import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CajaVecinaPage } from './caja-vecina.page';

const routes: Routes = [
  {
    path: '',
    component: CajaVecinaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CajaVecinaPageRoutingModule {}
