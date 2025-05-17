import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/services/auth.service';
import { User as AppUser } from 'src/app/models/user.models';
import { FirestoreService } from 'src/app/services/firestore.service';
import { ModalController } from '@ionic/angular';

import { ModalCambiarCorreoComponent } from 'src/app/components/modal-cambiar-correo/modal-cambiar-correo.component';


@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: false
})
export class PerfilPage implements OnInit {
  usuario!: AppUser;
  perfilForm!: FormGroup;
  guardando = false;

  constructor(
    private authService: AuthService,
    private firestoreService: FirestoreService,
    private fb: FormBuilder,
    private modalCtrl: ModalController
  ) {}

  ngOnInit() {
    this.cargarDatosUsuario();
  }

  // Separamos la carga de datos en un método para poder reutilizarlo
  cargarDatosUsuario() {
    const user = this.authService.currentUserValue;
    if (user) {
      this.usuario = user;
      this.perfilForm = this.fb.group({
        nombre: [user.nombre, Validators.required],
        telefono: [user.telefono],
        direccion: [user.direccion],
        email: [user.email, [Validators.required, Validators.email]]
      });
    }
  }

  async abrirModalCambioCorreo() {
    const modal = await this.modalCtrl.create({
      component: ModalCambiarCorreoComponent,
      componentProps: {
        correoActual: this.usuario.email
      }
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.nuevoCorreo) {
      // Actualizamos el correo en el formulario
      this.perfilForm.patchValue({ email: data.nuevoCorreo });

      // Actualizamos también en Firestore
      await this.firestoreService.updateUser({
        ...this.usuario,
        email: data.nuevoCorreo
      });

      // Actualizamos el usuario local
      this.usuario = {
        ...this.usuario,
        email: data.nuevoCorreo
      };

      // Recargar los datos del usuario para reflejar los cambios

    }

  }

  async guardar() {
    if (this.perfilForm.invalid) return;

    this.guardando = true;
    const formValue = this.perfilForm.value;

    try {
      // Verificamos si el correo ha cambiado
      if (formValue.email !== this.usuario.email) {
        // Si el correo cambió, forzamos a usar el modal
        await this.abrirModalCambioCorreo();
        this.guardando = false;
        return;
      }

      // Para los demás datos, actualizamos normalmente
      const datosActualizados: AppUser = {
        ...this.usuario,
        ...formValue
      };

      await this.firestoreService.updateUser(datosActualizados);
      this.usuario = datosActualizados;
      alert('Datos actualizados correctamente');
    } catch (error: any) {
      console.error('Error al actualizar perfil:', error);
      alert(error.message || 'Ocurrió un error al guardar los datos.');
    } finally {
      this.guardando = false;
    }
  }
}
