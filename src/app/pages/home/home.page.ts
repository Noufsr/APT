import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Observable } from 'rxjs';
import { User } from '../../models/user.models';
import { CajaComponent } from '../../components/caja/caja.component';
import { AlertController, ModalController, NavController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {
  currentUser$: Observable<User | null> = this.authService.currentUser;
  constructor(
    private authService: AuthService,
    private modalController: ModalController,
    private alertController: AlertController,
  ) {}

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

  //apertura cierre
  async realizarApCi() {

    const alert = await this.alertController.create({
      header: 'Apertura/Cierre',
      message: `Que desea realizar`,
      inputs: [
        {
          name: 'accion',
          type: 'radio',
          label: 'Apertura de caja',
          value: 'apertura',
          checked: true
        },
        {
          name: 'accion',
          type: 'radio',
          label: 'Cierre de caja',
          value: 'cierre'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Confirmar',
          handler: (accion) => {
            this.abrirModalCaja(accion);
          }
        }
      ]
    });

    await alert.present();
  }

  async abrirModalCaja(accion: 'apertura' | 'cierre') {
  const modal = await this.modalController.create({
    component: CajaComponent,
    componentProps: {
      accion: accion
    }
  });

  return await modal.present();
}
}

