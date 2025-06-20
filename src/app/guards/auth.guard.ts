import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, filter, switchMap, take, map, from } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController
  ) {}

 canActivate(): Observable<boolean | UrlTree> {
  return this.authService.authInitialized$.pipe(
    filter(initialized => {

      return initialized === true;
    }),
    take(1),
    switchMap(() => this.authService.currentUser.pipe(take(1))),
    switchMap(user => {


      if (user && user.activo) {

        return [true];
      } else {


        // Mostrar toast y luego redirigir
        return from(
          this.toastController.create({
            message: 'Debes iniciar sesión para continuar',
            duration: 2000,
            color: 'warning',
            position: 'top'
          }).then(toast => {
            toast.present();
            return this.router.createUrlTree(['/']);
          })
        );
      }
    })
  );
}}
