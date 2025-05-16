import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { FirestoreService } from '../../services/firestore.service';
import { Producto } from '../../models/producto.models';
import { Proveedor } from '../../models/proveedor.models';

@Component({
  selector: 'app-nuevo-producto',
  templateUrl: './nuevo-producto.component.html',
  standalone: false
})
export class NuevoProductoComponent implements OnInit {
  producto: Producto = {
    id: '',
    cad: 0,
    nombre: '',
    stock: 0,
    precio_compra: 0,
    precio_venta: 0,
    cod_barras: 0,
    marca: '',
    categoria: '',
    idproveedor: ''
  };

  proveedores: Proveedor[] = [];

  constructor(
    private modalController: ModalController,
    private firestoreService: FirestoreService
  ) {}

  ngOnInit() {
    this.cargarProveedores();
  }

  cargarProveedores() {
    this.firestoreService.getProveedores().subscribe(
      (proveedores) => {
        this.proveedores = proveedores;
      },
      (error) => {
        console.error('Error al cargar proveedores:', error);
      }
    );
  }

  async guardarProducto() {
    if (!this.producto.cad.toString().trim()) {
      return;
    }

    try {
      const id = await this.firestoreService.guardarProducto(this.producto);
      this.producto.id = id;
      this.modalController.dismiss({ producto: this.producto });
    } catch (error) {
      console.error('Error al guardar producto:', error);
    }
  }

  cerrar() {
    this.modalController.dismiss();
  }
}
