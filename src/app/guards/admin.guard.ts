import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable } from 'rxjs';
import { filter, switchMap, take, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.authInitialized$.pipe(

      filter(initialized => initialized === true),
      take(1),
      switchMap(() => this.authService.currentUser.pipe(take(1))),
      map(user => {
        if (user && user.activo && user.role === 'admin') {
          return true;
        } else {
          // Intentar fallback a localStorage para offline
          const localUserJson = localStorage.getItem('currentUser');
          if (localUserJson) {
            try {
              const localUser = JSON.parse(localUserJson);
              if (localUser && localUser.activo && localUser.role === 'admin') {
                return true;
              }
            } catch {
              // JSON inválido o error, ignorar
            }
          }
          // Redirigir a Access Denied si no es admin o no está activo
          return this.router.createUrlTree(['/access-denied']);
        }
      })
    );
  }

}
