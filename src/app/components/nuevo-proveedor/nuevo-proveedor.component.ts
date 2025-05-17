
import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { FirestoreService } from '../../services/firestore.service';
import { Proveedor } from '../../models/proveedor.models';

@Component({
  selector: 'app-nuevo-proveedor',
  templateUrl: './nuevo-proveedor.component.html',
  standalone:false
})
export class NuevoProveedorComponent {
  proveedor: Proveedor = {
    id: '',
    nombreProveedor: '',
    rubro: '',
    nombre_vendedor: '',
    telefono: 0,
    nombre_vendedor2: '',
    telefono2: 0,
  };

  constructor(
    private modalController: ModalController,
    private firestoreService: FirestoreService
  ) {}

  async guardarProveedor() {
    if (!this.proveedor.nombreProveedor.trim()) {
      return;
    }

    try {
      const id = await this.firestoreService.guardarProveedor(this.proveedor);
      this.proveedor.id = id;
      this.modalController.dismiss({ proveedor: this.proveedor });
    } catch (error) {
      console.error('Error al guardar proveedor:', error);
    }
  }

  cerrar() {
    this.modalController.dismiss();
  }
}

