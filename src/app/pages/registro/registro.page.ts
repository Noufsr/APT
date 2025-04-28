import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastController } from '@ionic/angular'; // Asumiendo que usas Ionic

@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  standalone: false
})
export class RegistroPage {
  userForm: FormGroup;
  loading = false;
  success = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toastController: ToastController
  ) {
    this.userForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      nombre: ['', Validators.required],
      role: ['usuario', Validators.required],
      telefono: [''],
      direccion: ['']
    });
  }

  async onSubmit() {
    if (this.userForm.invalid) {
      return;
    }

    this.loading = true;
    this.success = false;
    this.error = '';

    try {
      const formValue = this.userForm.value;

      await this.authService.registerUser({
        email: formValue.email,
        password: formValue.password,
        nombre: formValue.nombre,
        role: formValue.role,
        telefono: formValue.telefono ? Number(formValue.telefono) : undefined,
        direccion: formValue.direccion
      });

      this.success = true;
      this.userForm.reset({
        role: 'usuario'
      });

      await this.presentToast('Usuario creado exitosamente', 'success');
    } catch (err: any) {
      this.error = err.message || 'Ha ocurrido un error al crear el usuario';
      await this.presentToast(this.error, 'danger');
    } finally {
      this.loading = false;
    }
  }

  async presentToast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: color,
      position: 'top'
    });
    toast.present();
  }
}
