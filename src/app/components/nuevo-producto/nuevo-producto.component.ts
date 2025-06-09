import { Component, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
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
    cad: null as any,
    nombre: '',
    stock: null as any,
    precio_compra: null as any,
    precio_venta: null as any,
    cod_barras: null as any,
    marca: '',
    categoria: '',
    idproveedor: ''
  };

  proveedores: Proveedor[] = [];
  productosExistentes: Producto[] = [];

  // Variables para validaciones
  errorCAD: string = '';
  errorCodigoBarras: string = '';

  constructor(
    private modalController: ModalController,
    private firestoreService: FirestoreService,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.cargarProveedores();
    this.cargarProductosExistentes();
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

  cargarProductosExistentes() {
    this.firestoreService.getProductos().subscribe(
      (productos) => {
        this.productosExistentes = productos;
      },
      (error) => {
        console.error('Error al cargar productos existentes:', error);
      }
    );
  }

  validarCAD() {
    this.errorCAD = '';

    if (!this.producto.cad || this.producto.cad.toString().trim() === '') {
      return;
    }

    // Validar que no exista otro producto con el mismo CAD
    const cadExistente = this.productosExistentes.find(p =>
      p.cad && p.cad.toString() === this.producto.cad.toString()
    );

    if (cadExistente) {
      this.errorCAD = 'Ya existe un producto con este CAD';
    }
  }

  validarCodigoBarras() {
    this.errorCodigoBarras = '';

    if (!this.producto.cod_barras || this.producto.cod_barras.toString().trim() === '') {
      return;
    }

    // Validar que no exista otro producto con el mismo código de barras
    const codigoExistente = this.productosExistentes.find(p =>
      p.cod_barras && p.cod_barras.toString() === this.producto.cod_barras.toString()
    );

    if (codigoExistente) {
      this.errorCodigoBarras = 'Ya existe un producto con este código de barras';
    }
  }

  formularioValido(): boolean {
    // Verificar que no haya errores de validación
    if (this.errorCAD || this.errorCodigoBarras) {
      return false;
    }

    // Verificar campos obligatorios
    if (!this.producto.nombre || this.producto.nombre.trim() === '') {
      return false;
    }

    // Verificar que al menos uno de los códigos esté presente
    if ((!this.producto.cad || this.producto.cad.toString().trim() === '') &&
        (!this.producto.cod_barras || this.producto.cod_barras.toString().trim() === '')) {
      return false;
    }

    return true;
  }

  async mostrarToast(mensaje: string, color: string = 'danger') {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      color: color,
      position: 'top'
    });
    toast.present();
  }

  async guardarProducto() {
    this.validarCAD();
    this.validarCodigoBarras();

    if (!this.formularioValido()) {
      await this.mostrarToast('Por favor complete todos los campos obligatorios y corrija los errores');
      return;
    }

    try {
      // Convertir valores vacíos o null a sus tipos correctos antes de guardar
      const productoParaGuardar = {
        ...this.producto,
        cad: this.producto.cad || 0,
        stock: this.producto.stock || 0,
        precio_compra: this.producto.precio_compra || 0,
        precio_venta: this.producto.precio_venta || 0,
        cod_barras: this.producto.cod_barras || 0
      };

      const id = await this.firestoreService.guardarProducto(productoParaGuardar);
      productoParaGuardar.id = id;

      await this.mostrarToast('Producto guardado exitosamente', 'success');
      this.modalController.dismiss({ producto: productoParaGuardar });
    } catch (error) {
      console.error('Error al guardar producto:', error);
      await this.mostrarToast('Error al guardar el producto');
    }
  }
  cerrar() {
    this.modalController.dismiss();
  }
}
