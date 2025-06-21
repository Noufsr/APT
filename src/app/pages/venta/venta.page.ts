import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { AlertController, ToastController, NavController } from '@ionic/angular';
import { FirestoreService } from '../../services/firestore.service';
import { AuthService } from '../../services/auth.service';
import { Producto } from '../../models/producto.models';
import { Boleta, ProductoVendido } from '../../models/venta.models';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

interface ProductoEnVenta extends ProductoVendido {
  stock?: number;
  unidad?: string;
}

@Component({
  selector: 'app-venta',
  templateUrl: './venta.page.html',
  styleUrls: ['./venta.page.scss'],
  standalone: false
})
export class VentaPage implements OnInit, OnDestroy {
  @ViewChild('codigoInput') codigoInput!: ElementRef;
  @ViewChild('cadInput') cadInput!: ElementRef;
  @ViewChild('cantidadInput') cantidadInput!: ElementRef;
  @ViewChild('subtotalInput') subtotalInput!: ElementRef;

  // Variables para productos
  productos: Producto[] = [];
  productosEnVenta: ProductoEnVenta[] = [];
  productoActual: Producto | null = null;
  nuevoCodigo: number | null = null;
  nuevoCAD: number | null = null;
  nuevaCantidad: number = 1;
  nuevoSubtotal: number | null = null;

  // Variables para la venta
  total: number = 0;
  cajero: string = '';

  // Variables para historial
  historialVentas: Boleta[] = [];
  aperturaActual: any = null;

  // Variables para comprobante
  comprobanteData: Boleta | null = null;
  nombreTienda: string = 'Almacén Daniella';

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
    this.cargarHistorialDelDia();
  }

  ngOnDestroy() {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  obtenerCajeroLogueado() {
    const userName = localStorage.getItem('userName');
    if (userName) {
      this.cajero = userName;
      setTimeout(() => {
        if (this.codigoInput && this.codigoInput.nativeElement) {
          this.codigoInput.nativeElement.focus();
        }
      }, 100);
    }

    this.userSubscription = this.authService.currentUser.subscribe(user => {
      if (user && user.nombre) {
        this.cajero = user.nombre;
        if (!userName) {
          setTimeout(() => {
            if (this.codigoInput && this.codigoInput.nativeElement) {
              this.codigoInput.nativeElement.focus();
            }
          }, 100);
        }
      } else if (!userName) {
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

  async cargarHistorialDelDia() {
    try {
      const aperturasAbiertas = await this.firestoreService.getAperturasAbiertas()
        .pipe(take(1))
        .toPromise();

      if (aperturasAbiertas && aperturasAbiertas.length > 0) {
        this.aperturaActual = aperturasAbiertas[0];

        const ventasHoy = await this.firestoreService.getVentasDesde(this.aperturaActual.fecha)
          .pipe(take(1))
          .toPromise();

        if (ventasHoy) {
          this.historialVentas = ventasHoy.sort((a, b) => {
            const fechaA = a.fecha instanceof Date ? a.fecha : new Date(a.fecha);
            const fechaB = b.fecha instanceof Date ? b.fecha : new Date(b.fecha);
            return fechaB.getTime() - fechaA.getTime();
          });
        }
      }
    } catch (error) {
      console.error('Error al cargar historial de ventas:', error);
    }
  }

  formatearFecha(fecha: any): string {
    if (!fecha) return '';

    let fechaDate: Date;
    if (fecha instanceof Date) {
      fechaDate = fecha;
    } else if (fecha && typeof fecha === 'object' && 'toDate' in fecha) {
      fechaDate = fecha.toDate();
    } else {
      fechaDate = new Date(fecha);
    }

    return fechaDate.toLocaleString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  formatearFechaComprobante(fecha: any): string {
    if (!fecha) return '';

    let fechaDate: Date;
    if (fecha instanceof Date) {
      fechaDate = fecha;
    } else if (fecha && typeof fecha === 'object' && 'toDate' in fecha) {
      fechaDate = fecha.toDate();
    } else {
      fechaDate = new Date(fecha);
    }

    return fechaDate.toLocaleString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  obtenerCodigoBarras(idProducto: string): number | undefined {
    const producto = this.productos.find(p => p.id === idProducto);
    return producto?.cod_barras;
  }

  obtenerCAD(idProducto: string): number | undefined {
    const producto = this.productos.find(p => p.id === idProducto);
    return producto?.cad;
  }

  buscarProductoPorCodigo() {
    if (!this.nuevoCodigo) {
      return;
    }

    console.log('Buscando producto con código de barras:', this.nuevoCodigo);
    const productoEncontrado = this.productos.find(p => p.cod_barras === this.nuevoCodigo);

    if (productoEncontrado) {
      this.procesarProductoEncontrado(productoEncontrado);
    } else {
      console.log('Producto no encontrado');
      this.productoActual = null;
      this.presentToast(`No se encontró ningún producto con código ${this.nuevoCodigo}`);
      this.nuevoCodigo = null;
    }
  }

  buscarProductoPorCAD() {
    if (!this.nuevoCAD) {
      return;
    }

    console.log('Buscando producto con CAD:', this.nuevoCAD);

    const productoEncontrado = this.productos.find(p => {
      return p.cad && Number(p.cad) === Number(this.nuevoCAD);
    });

    if (productoEncontrado) {
      console.log('Producto encontrado por CAD:', productoEncontrado);
      this.procesarProductoEncontrado(productoEncontrado);
    } else {
      console.log('Producto no encontrado por CAD');
      this.productoActual = null;
      this.presentToast(`No se encontró ningún producto con CAD ${this.nuevoCAD}`);
      this.nuevoCAD = null;
    }
  }

  private procesarProductoEncontrado(producto: Producto) {
    console.log('Producto encontrado:', producto);

    if (producto.stock <= 0) {
      this.presentToast('Producto sin stock disponible');
      this.productoActual = null;
      this.nuevoCodigo = null;
      this.nuevoCAD = null;
      return;
    }

    this.productoActual = producto;
    this.nuevoCodigo = producto.cod_barras;
    this.nuevoCAD = producto.cad;

    // Resetear valores de cantidad y subtotal
    this.nuevaCantidad = 1;
    this.nuevoSubtotal = null;

    // Enfocar el campo correcto según la unidad del producto
    setTimeout(() => {
      if (producto.unidad === 'KG' && this.subtotalInput && this.subtotalInput.nativeElement) {
        this.subtotalInput.nativeElement.focus();
      } else if (producto.unidad === 'U' && this.cantidadInput && this.cantidadInput.nativeElement) {
        this.cantidadInput.nativeElement.focus();
      }
    }, 100);
  }

  calcularCantidadDesdeSubtotal() {
    if (this.productoActual && this.nuevoSubtotal && this.productoActual.precio_venta > 0) {
      this.nuevaCantidad = Number((this.nuevoSubtotal / this.productoActual.precio_venta).toFixed(3));
    }
  }

  agregarProductoAVenta() {
    if (!this.productoActual) {
      this.presentToast('Debe seleccionar un producto');
      return;
    }

    // Validar según tipo de unidad
    if (this.productoActual.unidad === 'KG') {
      if (!this.nuevoSubtotal || this.nuevoSubtotal <= 0) {
        this.presentToast('Debe ingresar el monto total para productos por peso');
        return;
      }
      // Calcular cantidad basada en el subtotal
      this.calcularCantidadDesdeSubtotal();
    } else if (this.productoActual.unidad === 'U') {
      if (!this.nuevaCantidad || this.nuevaCantidad <= 0) {
        this.presentToast('Debe ingresar la cantidad');
        return;
      }
      // Validar que sea número entero para productos por unidad
      if (this.nuevaCantidad % 1 !== 0) {
        this.presentToast('Los productos por unidad solo aceptan cantidades enteras');
        return;
      }
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
      const subtotal = this.productoActual.unidad === 'KG' && this.nuevoSubtotal ?
        this.nuevoSubtotal :
        this.nuevaCantidad * this.productoActual.precio_venta;

      const nuevoProducto: ProductoEnVenta = {
        idProducto: this.productoActual.id,
        nombre: this.productoActual.nombre,
        cantidad: this.nuevaCantidad,
        precioUnitario: this.productoActual.precio_venta,
        subtotal: subtotal,
        stock: this.productoActual.stock,
        unidad: this.productoActual.unidad
      };

      this.productosEnVenta.push(nuevoProducto);
    }

    this.calcularTotal();

    // Limpiar campos para un nuevo producto
    this.productoActual = null;
    this.nuevoCodigo = null;
    this.nuevoCAD = null;
    this.nuevaCantidad = 1;
    this.nuevoSubtotal = null;

    // Establecer foco en el campo de código de barras
    setTimeout(() => {
      if (this.codigoInput && this.codigoInput.nativeElement) {
        this.codigoInput.nativeElement.focus();
      }
    }, 100);
  }

  actualizarSubtotal(index: number) {
    const producto = this.productosEnVenta[index];

    // Solo permitir edición de cantidad para productos por unidad
    if (producto.unidad === 'U') {
      // Validar que sea número entero
      if (producto.cantidad % 1 !== 0) {
        this.presentToast('Los productos por unidad solo aceptan cantidades enteras');
        producto.cantidad = Math.floor(producto.cantidad);
      }

      if (producto.cantidad && producto.precioUnitario) {
        producto.subtotal = producto.cantidad * producto.precioUnitario;
        this.calcularTotal();
      }
    }
  }

  actualizarCantidadPorSubtotal(index: number, event: any) {
    const producto = this.productosEnVenta[index];

    // Solo permitir edición de subtotal para productos por peso
    if (producto.unidad !== 'KG') {
      this.presentToast('Solo puede modificar el subtotal en productos por peso');
      return;
    }

    const valorString = event?.detail?.value;
    const nuevoSubtotal = valorString ? Number(valorString) : 0;

    if (!nuevoSubtotal || nuevoSubtotal <= 0 || isNaN(nuevoSubtotal)) {
      this.presentToast('El subtotal debe ser mayor a 0');
      return;
    }

    if (!producto.precioUnitario || producto.precioUnitario <= 0) {
      this.presentToast('El precio unitario debe ser mayor a 0 para calcular la cantidad');
      return;
    }

    const nuevaCantidad = nuevoSubtotal / producto.precioUnitario;

    if (nuevaCantidad <= 0) {
      this.presentToast('La cantidad debe ser mayor a 0');
      return;
    }

    const stockDisponible = producto.stock || 0;
    const cantidadOtrosProductos = this.productosEnVenta
      .filter((p, i) => i !== index && p.idProducto === producto.idProducto)
      .reduce((sum, p) => sum + p.cantidad, 0);
    const stockRestante = stockDisponible - cantidadOtrosProductos;

    if (nuevaCantidad > stockRestante) {
      this.presentToast(`Stock insuficiente. Disponible: ${stockRestante.toFixed(2)}`);
      return;
    }

    producto.cantidad = Number(nuevaCantidad.toFixed(3));
    producto.subtotal = nuevoSubtotal;

    this.calcularTotal();
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
      const folio = Date.now();

      const boleta: Boleta = {
        id: '',
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

      const ventaId = await this.firestoreService.guardarVenta(boleta);
      console.log('Venta guardada con ID:', ventaId);

      await this.actualizarStocks();

      this.comprobanteData = boleta;

      this.presentToast('Venta procesada correctamente');

      await this.mostrarComprobante();

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

  async mostrarComprobante() {
    const alert = await this.alertController.create({
      header: 'Venta Exitosa',
      message: `Venta procesada. Folio: ${this.comprobanteData?.folio}`,
      buttons: [
        {
          text: 'Solo Cerrar',
          role: 'cancel',
          handler: () => {
            this.limpiarVenta();
            this.cargarHistorialDelDia();
          }
        },
        {
          text: 'Imprimir',
          handler: () => {
            this.imprimirComprobante();
            setTimeout(() => {
              this.limpiarVenta();
              this.cargarHistorialDelDia();
            }, 1000);
          }
        }
      ],
      backdropDismiss: false
    });

    await alert.present();
  }

  imprimirComprobante() {
    if (!this.comprobanteData) {
      this.presentToast('Error: No hay datos del comprobante');
      return;
    }

    const productosHTML = this.comprobanteData.productosVendidos
      .map(item => {
        // Encontrar el producto para obtener su unidad
        const producto = this.productosEnVenta.find(p => p.idProducto === item.idProducto);
        const unidad = producto?.unidad || 'U';
        const cantidadFormateada = unidad === 'KG' ?
          `${item.cantidad.toFixed(3)} kg` :
          `${item.cantidad}`;

        return `
          <tr>
            <td style="font-size: 10px;">${item.nombre}</td>
            <td style="text-align: center; font-size: 10px;">${cantidadFormateada}</td>
            <td style="text-align: right; font-size: 10px;">$${item.subtotal.toFixed(0)}</td>
          </tr>
        `;
      }).join('');

    const comprobanteHTML = `
      <div style="width: 58mm; padding: 2mm; font-family: monospace; margin: 0;">
        <div style="text-align: center;">
          <h4 style="margin: 2px 0; font-size: 12px;">COMPROBANTE DE VENTA</h4>
          <p style="margin: 2px 0; font-size: 10px;">${this.nombreTienda}</p>
        </div>
        <hr style="border: none; border-top: 1px dashed #000; margin: 2px 0;">
        <p style="margin: 2px 0; font-size: 10px;"><strong>Folio:</strong> ${this.comprobanteData.folio}</p>
        <p style="margin: 2px 0; font-size: 10px;"><strong>Fecha:</strong> ${this.formatearFechaComprobante(this.comprobanteData.fecha)}</p>
        <p style="margin: 2px 0; font-size: 10px;"><strong>Cajero:</strong> ${this.comprobanteData.cajero}</p>
        <hr style="border: none; border-top: 1px dashed #000; margin: 2px 0;">
        <table style="width: 100%; font-size: 10px;">
          <thead>
            <tr>
              <th style="text-align: left; font-size: 10px;">Producto</th>
              <th style="text-align: center; font-size: 10px;">Cant</th>
              <th style="text-align: right; font-size: 10px;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${productosHTML}
          </tbody>
        </table>
        <hr style="border: none; border-top: 1px dashed #000; margin: 2px 0;">
        <p style="text-align: right; font-size: 14px; margin: 2px 0;"><strong>TOTAL: ${this.comprobanteData.total.toFixed(0)}</strong></p>
        <hr style="border: none; border-top: 1px dashed #000; margin: 2px 0;">
        <p style="text-align: center; font-size: 10px; margin: 2px 0;">¡Gracias por su compra!</p>
      </div>
    `;

    // Crear una ventana nueva para imprimir
    const ventanaImpresion = window.open('', '', 'width=300,height=600');

    if (!ventanaImpresion) {
      this.presentToast('Error al abrir ventana de impresión');
      return;
    }

    // Escribir el contenido HTML en la nueva ventana
    ventanaImpresion.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comprobante de Venta</title>
        <style>
          @page {
            size: 58mm auto;
            margin: 0;
          }
          body {
            font-family: monospace;
            margin: 0;
            padding: 0;
            width: 58mm;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            padding: 1px 2px;
          }
          hr {
            border: none;
            border-top: 1px dashed #000;
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        ${comprobanteHTML}
      </body>
      </html>
    `);

    ventanaImpresion.document.close();

    // Esperar un momento y luego imprimir
    setTimeout(() => {
      ventanaImpresion.print();
      ventanaImpresion.close();
    }, 250);
  }

  limpiarVenta() {
    this.productosEnVenta = [];
    this.productoActual = null;
    this.nuevoCodigo = null;
    this.nuevoCAD = null;
    this.nuevaCantidad = 1;
    this.nuevoSubtotal = null;
    this.total = 0;
    this.comprobanteData = null;

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

  volver() {
    this.navController.back();
  }
}
