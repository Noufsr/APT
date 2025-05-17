import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { FirestoreService } from '../../services/firestore.service';
import { Producto } from '../../models/producto.models';

@Component({
  selector: 'app-nuevo-producto',
  templateUrl: './nuevo-producto.component.html',
  standalone: false
})
export class NuevoProductoComponent {
  @Input() idProveedor: string | number | undefined;
  @Input() codBarras: number | undefined;

  producto: Producto = {
    id: '',
    nombre: '',
    stock: 0,
    precio_compra: 0,
    precio_venta: 0,
    cod_barras: 0,
    marca: '',
    categoria: '',
    idproveedor: '',
  };

  constructor(
    private modalController: ModalController,
    private firestoreService: FirestoreService
  ) {}

  ngOnInit() {
    if (this.idProveedor) {
      this.producto.idproveedor = this.idProveedor;
    }
    if (this.codBarras) {
      this.producto.cod_barras = this.codBarras;
    }
  }

  async guardarProducto() {
    if (!this.producto.nombre.trim() || !this.producto.precio_compra || !this.producto.id) {
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
