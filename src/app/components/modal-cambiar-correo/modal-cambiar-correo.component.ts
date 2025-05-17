import { Component, Input } from '@angular/core';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, verifyBeforeUpdateEmail } from 'firebase/auth';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-modal-cambiar-correo',
  templateUrl: './modal-cambiar-correo.component.html',
  styleUrls: ['./modal-cambiar-correo.component.scss'],
  imports: [ IonicModule,FormsModule,ReactiveFormsModule],
})
export class ModalCambiarCorreoComponent {
  nuevoCorreo: string = '';
  password: string = '';
   @Input() correoActual!: string;

  constructor(
    private modalCtrl: ModalController,
    private toastCtrl: ToastController
  ) {}

  async cambiarCorreo() {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      this.presentToast('No hay usuario autenticado.');
      return;
    }

    if (!this.nuevoCorreo || !this.password) {
      this.presentToast('Por favor, ingresa el nuevo correo y tu contraseña.');
      return;
    }

    try {
      // 1. Reautenticación
      const credential = EmailAuthProvider.credential(user.email!, this.password);
      await reauthenticateWithCredential(user, credential);

      // 2. Enviar correo de verificación para cambiar email
      await verifyBeforeUpdateEmail(user, this.nuevoCorreo);

      this.presentToast('Correo enviado para verificar el nuevo email. Revisa tu bandeja y confirma el cambio.');
      this.modalCtrl.dismiss();

    } catch (error: any) {
      this.presentToast('Error al cambiar correo: ' + error.message);
    }
  }

  async presentToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 4000,
      position: 'bottom',
      color: 'primary',
    });
    await toast.present();
  }

  cancelar() {
    this.modalCtrl.dismiss();
  }
}
