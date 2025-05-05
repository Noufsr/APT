import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: false
})
export class HeaderComponent implements OnInit, OnDestroy {
  userRole: string | null = null;
  userName: string | null = null;
  private userSubscription: Subscription | null = null;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    // Cargar instantáneamente desde localStorage
    this.userName = localStorage.getItem('userName');
    this.userRole = localStorage.getItem('userRole');

    // Escuchar actualizaciones del usuario si hay cambios
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      if (user) {
        this.userName = user.nombre;
        this.userRole = user.role;
      }
    });
  }

  ngOnDestroy() {
    this.userSubscription?.unsubscribe();
  }

  async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['']);
    } catch (error) {
      console.error('Error al cerrar sesión', error);
    }
  }
}
