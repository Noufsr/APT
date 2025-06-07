import { Injectable } from '@angular/core';
import { CanActivate, UrlTree, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable } from 'rxjs';
import { map, take, filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthRedirectGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.authInitialized$.pipe(
      filter(initialized => initialized),
      take(1),
      map(() => {
        const user = this.authService.currentUserValue;
        if (user) {
          // Si ya está autenticado, redirige a /home
          return this.router.createUrlTree(['/home']);
        } else {
          // Si no está autenticado, permite entrar a login o register
          return true;
        }
      })
    );
  }
}
