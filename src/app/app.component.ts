import { Component, OnInit } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { environment } from '../environments/environment';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  authInitialized = false;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    try {
      const app = initializeApp(environment.firebaseConfig);
      console.log('Firebase inicializado:', app.name);
    } catch (error) {
      console.error('Error al inicializar Firebase:', error);
    }

    this.authService.authInitialized$.subscribe((initialized) => {
      this.authInitialized = initialized;
    });
  }
}
