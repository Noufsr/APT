import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DevolucionPage } from './devolucion.page';

const routes: Routes = [
  {
    path: '',
    component: DevolucionPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DevolucionPageRoutingModule {}
