import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AccessDeniedPage } from './access-denied.page';

const routes: Routes = [
  {
    path: '',
    component: AccessDeniedPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AccessDeniedPageRoutingModule {}
