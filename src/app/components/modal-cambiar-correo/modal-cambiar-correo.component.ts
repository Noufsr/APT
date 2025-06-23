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
      this.presentToast('No hay usuario autenticado.', 'warning');
      return;
    }

    if (!this.nuevoCorreo || !this.password) {
      this.presentToast('Por favor, ingresa el nuevo correo y tu contraseña.', 'warning');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.nuevoCorreo)) {
      this.presentToast('Por favor, ingresa un correo electrónico válido.', 'warning');
      return;
    }

    // Validar que el nuevo correo sea diferente al actual
    if (this.nuevoCorreo.toLowerCase().trim() === user.email?.toLowerCase().trim()) {
      this.presentToast('El nuevo correo debe ser diferente al correo actual.', 'warning');
      return;
    }

    try {
      // 1. Reautenticación
      const credential = EmailAuthProvider.credential(user.email!, this.password);
      await reauthenticateWithCredential(user, credential);

      // 2. Enviar correo de verificación para cambiar email
      await verifyBeforeUpdateEmail(user, this.nuevoCorreo);

      this.presentToast('Correo enviado para verificar el nuevo email. Revisa tu bandeja y confirma el cambio.', 'success');
      this.modalCtrl.dismiss({ success: true });

    } catch (error: any) {
      // Manejo de errores específicos de Firebase
      let errorMessage = 'Error al cambiar correo';

      switch (error.code) {
        case 'auth/wrong-password':
          errorMessage = 'La contraseña es incorrecta.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'El formato del correo electrónico no es válido.';
          break;
        case 'auth/email-already-in-use':
          errorMessage = 'Este correo electrónico ya está en uso por otra cuenta.';
          break;
        case 'auth/requires-recent-login':
          errorMessage = 'Por seguridad, debes iniciar sesión nuevamente antes de cambiar el correo.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Demasiados intentos. Por favor, intenta más tarde.';
          break;
        default:
          errorMessage = error.message || 'Error desconocido al cambiar el correo.';
      }

      this.presentToast(errorMessage, 'danger');
    }
  }

  async presentToast(message: string, color: 'primary' | 'success' | 'warning' | 'danger' = 'primary') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 4000,
      position: 'bottom',
      color: color,
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  cancelar() {
    this.modalCtrl.dismiss();
  }
}
