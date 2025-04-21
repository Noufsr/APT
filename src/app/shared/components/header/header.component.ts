import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: false
})
export class HeaderComponent {
  constructor(private authService: AuthService, private router: Router) {}

  async logout() {
    try {
      await this.authService.logout();
      const user = this.authService.currentUser;
      console.log('¿Usuario después de logout?:', user); // Debería ser null
      this.router.navigate(['']);
    } catch (error) {
      console.error('Error al cerrar sesión', error);
    }
  }

}
