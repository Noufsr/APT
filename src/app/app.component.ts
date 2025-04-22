import { Component } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor() {
    try {
    const app = initializeApp(environment.firebaseConfig);
    console.log('Firebase inicializado:', app.name);
  } catch (error) {
    console.error('Error al inicializar Firebase:', error);
  }}
}
