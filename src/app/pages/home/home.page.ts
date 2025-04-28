import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Observable } from 'rxjs';
import { User } from '../../models/user.models';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {
  currentUser$: Observable<User | null> = this.authService.currentUser;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.currentUser$.subscribe(user => {
      if (user) {
        console.log('Usuario autenticado:', user);
      } else {
        console.log('No hay usuario autenticado');
      }
    });
  }

  // Login
  async login() {
    try {
      await this.authService.login('email@example.com', 'password');
    } catch (error) {
      console.error('Error en el login', error);
    }
  }

  // Logout
  async logout() {
    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Error en el logout', error);
    }
  }
}

