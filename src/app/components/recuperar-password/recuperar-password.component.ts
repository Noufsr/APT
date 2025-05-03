import { Component } from '@angular/core';
import { ModalController, AlertController, ToastController, IonicModule } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth.service';
import { IonHeader, IonToolbar } from "@ionic/angular/standalone";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-recuperar-password',
  templateUrl: './recuperar-password.component.html',
  styleUrls: ['./recuperar-password.component.scss'],
  standalone: true,
  imports: [ CommonModule,FormsModule,IonicModule]
})
export class RecuperarPasswordComponent {
  email: string = '';

  constructor(
    private modalCtrl: ModalController,
    private authService: AuthService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  cerrar() {
    this.modalCtrl.dismiss();
  }

  async enviarEmailReset() {
    if (!this.email) {
      const toast = await this.toastCtrl.create({
        message: 'Por favor ingresa tu correo',
        duration: 2000,
        color: 'warning',
      });
      await toast.present();
      return;
    }

    try {
      await this.authService.enviarResetPassword(this.email);
      await this.alertCtrl.create({
        header: 'Correo enviado',
        message: 'Revisa tu bandeja de entrada',
        buttons: ['OK'],
      }).then(alert => alert.present());
      this.cerrar();
    } catch (error) {
      await this.alertCtrl.create({
        header: 'Error',
        message: 'No se pudo enviar el correo. Verifica el correo ingresado.',
        buttons: ['OK'],
      }).then(alert => alert.present());
    }
  }
}
