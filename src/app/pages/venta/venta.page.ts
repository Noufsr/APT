import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { AlertController, ToastController, NavController } from '@ionic/angular';
import { FirestoreService } from '../../services/firestore.service';
import { AuthService } from '../../services/auth.service';
import { Producto } from '../../models/producto.models';
import { Boleta, ProductoVendido } from '../../models/venta.models';
import { Subscription } from 'rxjs';

interface ProductoEnVenta extends ProductoVendido {
  stock?: number;
}

@Component({
  selector: 'app-venta',
  templateUrl: './venta.page.html',
  styleUrls: ['./venta.page.scss'],
  standalone: false
})
export class VentaPage implements OnInit, OnDestroy {
  @ViewChild('codigoInput') codigoInput!: ElementRef;
  @ViewChild('cantidadInput') cantidadInput!: ElementRef;

  // Variables para productos
  productos: Producto[] = [];
  productosEnVenta: ProductoEnVenta[] = [];
  productoActual: Producto | null = null;
  nuevoCodigo: number | null = null;
  nuevaCantidad: number = 1;

  // Variables para la venta
  total: number = 0;
  cajero: string = '';

  // Subscription para el usuario
  private userSubscription: Subscription | null = null;

  constructor(
    private firestoreService: FirestoreService,
    private authService: AuthService,
    private alertController: AlertController,
    private toastController: ToastController,
    private navController: NavController
  ) { }

  ngOnInit() {
    this.cargarProductos();
    this.obtenerCajeroLogueado();
  }

  ngOnDestroy() {
    // Limpiar la suscripción al destruir el componente
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  obtenerCajeroLogueado() {
    // Primero intentar obtener desde localStorage para carga inmediata
    const userName = localStorage.getItem('userName');
    if (userName) {
      this.cajero = userName;
      // Enfocar el input de código después de establecer el cajero
      setTimeout(() => {
        if (this.codigoInput && this.codigoInput.nativeElement) {
          this.codigoInput.nativeElement.focus();
        }
      }, 100);
    }

    // También suscribirse a cambios del usuario autenticado
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      if (user && user.nombre) {
        this.cajero = user.nombre;
        // Si no había cajero antes, enfocar el input
        if (!userName) {
          setTimeout(() => {
            if (this.codigoInput && this.codigoInput.nativeElement) {
              this.codigoInput.nativeElement.focus();
            }
          }, 100);
        }
      } else if (!userName) {
        // Solo si no hay usuario en localStorage, solicitar manualmente
        this.solicitarCajero();
      }
    });
  }

  async solicitarCajero() {
    const alert = await this.alertController.create({
      header: 'Identificación',
      message: 'Ingrese el nombre del cajero',
      inputs: [
        {
          name: 'cajero',
          type: 'text',
          placeholder: 'Nombre del cajero'
        }
      ],
      buttons: [
        {
          text: 'Confirmar',
          handler: (data) => {
            if (data.cajero && data.cajero.trim()) {
              this.cajero = data.cajero.trim();
              setTimeout(() => {
                if (this.codigoInput && this.codigoInput.nativeElement) {
                  this.codigoInput.nativeElement.focus();
                }
              }, 100);
            } else {
              this.presentToast('Debe ingresar el nombre del cajero');
              this.solicitarCajero();
            }
          }
        }
      ],
      backdropDismiss: false
    });

    await alert.present();
  }

  // Método para cambiar cajero manualmente si es necesario
  async cambiarCajero() {
    const alert = await this.alertController.create({
      header: 'Cambiar Cajero',
      message: 'Ingrese el nuevo nombre del cajero',
      inputs: [
        {
          name: 'cajero',
          type: 'text',
          placeholder: 'Nombre del cajero',
          value: this.cajero
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Confirmar',
          handler: (data) => {
            if (data.cajero && data.cajero.trim()) {
              this.cajero = data.cajero.trim();
            } else {
              this.presentToast('Debe ingresar el nombre del cajero');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  cargarProductos() {
    console.log('Cargando productos...');
    this.firestoreService.getProductos().subscribe(
      (productos: Producto[]) => {
        console.log('Productos cargados:', productos);
        this.productos = productos;
      },
      error => {
        console.error('Error al cargar productos:', error);
      }
    );
  }

  buscarProducto() {
    if (!this.nuevoCodigo) {
      return;
    }

    console.log('Buscando producto con código de barras:', this.nuevoCodigo);
    const productoEncontrado = this.productos.find(p => p.cod_barras === this.nuevoCodigo);

    if (productoEncontrado) {
      console.log('Producto encontrado:', productoEncontrado);

      if (productoEncontrado.stock <= 0) {
        this.presentToast('Producto sin stock disponible');
        this.productoActual = null;
        this.nuevoCodigo = null;
        return;
      }

      this.productoActual = productoEncontrado;

      setTimeout(() => {
        if (this.cantidadInput && this.cantidadInput.nativeElement) {
          this.cantidadInput.nativeElement.focus();
        }
      }, 100);
    } else {
      console.log('Producto no encontrado');
      this.productoActual = null;
      this.presentToast(`No se encontró ningún producto con código ${this.nuevoCodigo}`);
      this.nuevoCodigo = null;
    }
  }

  agregarProductoAVenta() {
    if (!this.productoActual || !this.nuevaCantidad || this.nuevaCantidad <= 0) {
      this.presentToast('Por favor complete todos los campos correctamente');
      return;
    }

    // Verificar stock disponible
    const stockDisponible = this.productoActual.stock;
    const cantidadYaEnVenta = this.productosEnVenta.find(p => p.idProducto === this.productoActual?.id)?.cantidad || 0;
    const stockRestante = stockDisponible - cantidadYaEnVenta;

    if (this.nuevaCantidad > stockRestante) {
      this.presentToast(`Stock insuficiente. Disponible: ${stockRestante}`);
      return;
    }

    // Verificar si el producto ya está en la venta
    const index = this.productosEnVenta.findIndex(p => p.idProducto === this.productoActual?.id);

    if (index >= 0) {
      // Actualizar cantidad si ya existe
      this.productosEnVenta[index].cantidad += this.nuevaCantidad;
      this.productosEnVenta[index].subtotal = this.productosEnVenta[index].cantidad * this.productosEnVenta[index].precioUnitario;
    } else {
      // Agregar nuevo producto a la venta
      const nuevoProducto: ProductoEnVenta = {
        idProducto: this.productoActual.id,
        nombre: this.productoActual.nombre,
        cantidad: this.nuevaCantidad,
        precioUnitario: this.productoActual.precio_venta,
        subtotal: this.nuevaCantidad * this.productoActual.precio_venta,
        stock: this.productoActual.stock
      };

      this.productosEnVenta.push(nuevoProducto);
    }

    this.calcularTotal();

    // Limpiar campos para un nuevo producto
    this.productoActual = null;
    this.nuevoCodigo = null;
    this.nuevaCantidad = 1;

    // Establecer foco en el campo de código de barras
    setTimeout(() => {
      if (this.codigoInput && this.codigoInput.nativeElement) {
        this.codigoInput.nativeElement.focus();
      }
    }, 100);
  }

  eliminarProducto(index: number) {
    this.productosEnVenta.splice(index, 1);
    this.calcularTotal();
  }

  calcularTotal() {
    this.total = this.productosEnVenta.reduce((sum, producto) => sum + producto.subtotal, 0);
  }

  async confirmarVenta() {
    if (this.productosEnVenta.length === 0) {
      this.presentToast('Debe agregar al menos un producto a la venta');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirmar Venta',
      message: `Total: $${this.total.toFixed(2)}`,
      inputs: [
        {
          name: 'metodoPago',
          type: 'radio',
          label: 'Efectivo',
          value: 'efectivo',
          checked: true
        },
        {
          name: 'metodoPago',
          type: 'radio',
          label: 'Tarjeta',
          value: 'tarjeta'
        },
        {
          name: 'metodoPago',
          type: 'radio',
          label: 'Transferencia',
          value: 'transferencia'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Confirmar',
          handler: (metodoPago) => {
            this.procesarVenta(metodoPago);
          }
        }
      ]
    });

    await alert.present();
  }

  async procesarVenta(metodoPago: string) {
    try {
      // Generar número de folio único
      const folio = Date.now();

      const boleta: Boleta = {
        id: '', // Se asignará automáticamente por Firestore
        folio: folio,
        fecha: new Date(),
        total: this.total,
        productosVendidos: this.productosEnVenta.map(p => ({
          idProducto: p.idProducto,
          nombre: p.nombre,
          cantidad: p.cantidad,
          precioUnitario: p.precioUnitario,
          subtotal: p.subtotal
        })),
        metodo_pago: metodoPago,
        cajero: this.cajero
      };

      console.log('Procesando venta:', boleta);

      // Guardar la venta
      const ventaId = await this.firestoreService.guardarVenta(boleta);
      console.log('Venta guardada con ID:', ventaId);

      // Actualizar el stock de los productos
      await this.actualizarStocks();

      this.presentToast('Venta procesada correctamente');
      this.limpiarVenta();

    } catch (error) {
      console.error('Error al procesar venta:', error);
      this.presentToast('Error al procesar la venta');
    }
  }

  async actualizarStocks() {
    for (const item of this.productosEnVenta) {
      const producto = this.productos.find(p => p.id === item.idProducto);
      if (producto) {
        const nuevoStock = producto.stock - item.cantidad;
        console.log(`Actualizando stock del producto ${producto.nombre} de ${producto.stock} a ${nuevoStock}`);

        try {
          await this.firestoreService.actualizarStockProducto(producto.id, nuevoStock);
          console.log(`Stock actualizado correctamente para ${producto.nombre}`);
        } catch (updateError) {
          console.error(`Error al actualizar stock para ${producto.nombre}:`, updateError);
        }
      }
    }
  }

  limpiarVenta() {
    this.productosEnVenta = [];
    this.productoActual = null;
    this.nuevoCodigo = null;
    this.nuevaCantidad = 1;
    this.total = 0;

    setTimeout(() => {
      if (this.codigoInput && this.codigoInput.nativeElement) {
        this.codigoInput.nativeElement.focus();
      }
    }, 100);
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom'
    });

    await toast.present();
  }

  obtenerCodigoBarras(idProducto: string): number | undefined {
    const producto = this.productos.find(p => p.id === idProducto);
    return producto?.cod_barras;
  }

  volver() {
    this.navController.back();
  }
}
