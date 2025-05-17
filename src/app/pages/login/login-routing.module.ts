import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login.component';

const routes: Routes = [
  {
    path: '',
    component: LoginComponent,  // Ruta que carga el LoginComponent
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],  // Usar forChild para rutas dentro de módulos hijos
  exports: [RouterModule]
})
export class LoginRoutingModule {}
