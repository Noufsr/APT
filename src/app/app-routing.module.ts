import { AuthRedirectGuard } from './guards/auth-redirect.guard';

import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./pages/login/login.module').then(m => m.LoginModule),canActivate: [AuthRedirectGuard]
     // OK
  },
  {
    path: 'home',
    loadChildren: () => import('./pages/home/home.module').then( m => m.HomePageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'inventario',
    loadChildren: () => import('./pages/inventario/inventario.module').then( m => m.InventarioPageModule),canActivate: [AuthGuard],
  },
  {
    path: 'registro',
    loadChildren: () => import('./pages/registro/registro.module').then( m => m.RegistroPageModule),canActivate: [AuthGuard,AdminGuard],
  },
  {
    path: 'venta',
    loadChildren: () => import('./pages/venta/venta.module').then( m => m.VentaPageModule)
  },
  {
     path: 'access-denied',
  loadChildren: () => import('./pages/access-denied/access-denied.module').then(m => m.AccessDeniedPageModule)},
  {
    path: 'ingresar-pedido',
    loadChildren: () => import('./pages/ingresar-pedido/ingresar-pedido.module').then( m => m.IngresarPedidoPageModule),canActivate: [AuthGuard],
  },
  {
    path: 'adminpanel',
    loadChildren: () => import('./pages/adminpanel/adminpanel.module').then( m => m.AdminpanelPageModule),canActivate: [AuthGuard,AdminGuard],
  },
  {
    path: 'perfil',
    loadChildren: () => import('./pages/perfil/perfil.module').then( m => m.PerfilPageModule),canActivate: [AuthGuard],
  },
  {
    path: 'venta',
    loadChildren: () => import('./pages/venta/venta.module').then( m => m.VentaPageModule),canActivate: [AuthGuard],
  },
  {
    path: 'access-denied',
    loadChildren: () => import('./pages/access-denied/access-denied.module').then( m => m.AccessDeniedPageModule)
  },
  {
    path: 'bip',
    loadChildren: () => import('./pages/bip/bip.module').then( m => m.BipPageModule)
  },
  {
    path: 'caja-vecina',
    loadChildren: () => import('./pages/caja-vecina/caja-vecina.module').then( m => m.CajaVecinaPageModule)
  },
  {
    path: 'devolucion',
    loadChildren: () => import('./pages/devolucion/devolucion.module').then( m => m.DevolucionPageModule)
  },
  {
    path: 'reportes',
    loadChildren: () => import('./pages/reportes/reportes.module').then( m => m.ReportesPageModule)
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
