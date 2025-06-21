import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ImportarProductosPage } from './importar-productos.page';

const routes: Routes = [
  {
    path: '',
    component: ImportarProductosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ImportarProductosPageRoutingModule {}
