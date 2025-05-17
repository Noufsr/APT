import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { User } from 'src/app/models/user.models';
import { FirestoreService } from '../../services/firestore.service';

@Component({
  selector: 'app-user-detail-modal',
  templateUrl: './user-detail-modal.component.html',
  styleUrls: ['./user-detail-modal.component.scss'],
  standalone: false
})
export class UserDetailModalComponent implements OnInit {
  @Input() user!: User;
  userForm!: FormGroup;
  saving = false;

  constructor(
    private modalCtrl: ModalController,
    private fb: FormBuilder,
    private firestoreService: FirestoreService
  ) {}

  ngOnInit() {
    this.userForm = this.fb.group({
      nombre: [this.user.nombre, Validators.required],
      telefono: [this.user.telefono],
      direccion: [this.user.direccion],
      role: [this.user.role, Validators.required],
      activo: [this.user.activo]
      // No incluimos email para que no sea editable
    });
  }

  async save() {
    if (this.userForm.invalid) return;

    this.saving = true;

    const updatedUser = {
      ...this.user,
      ...this.userForm.value,
      email: this.user.email  // Mantener email igual
    };

    try {
      await this.firestoreService.updateUser(updatedUser);
      await this.modalCtrl.dismiss(updatedUser);  // Envía el usuario actualizado al cerrar
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      this.saving = false;
    }
  }


  close() {
    this.modalCtrl.dismiss();
  }
}
