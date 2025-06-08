import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { BipPage } from './bip.page';

const routes: Routes = [
  {
    path: '',
    component: BipPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BipPageRoutingModule {}
