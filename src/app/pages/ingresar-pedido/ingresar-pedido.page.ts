
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { AlertController, ModalController, NavController, ToastController } from '@ionic/angular';
import { FirestoreService } from '../../services/firestore.service';
import { Producto } from '../../models/producto.models';
import { Proveedor } from '../../models/proveedor.models';
import { Pedido, ProductoPedido } from '../../models/pedido.models';
import { NuevoProveedorComponent } from '../../components/nuevo-proveedor/nuevo-proveedor.component';
import { NuevoProductoComponent } from '../../components/nuevo-producto/nuevo-producto.component';

interface ProductoEnPedido extends ProductoPedido {
  codBarras?: number;
}

@Component({
  selector: 'app-ingresar-pedido',
  templateUrl: './ingresar-pedido.page.html',
  styleUrls: ['./ingresar-pedido.page.scss'],
  standalone:false
})
export class IngresarPedidoPage implements OnInit {
  @ViewChild('codigoBarrasInput') codigoBarrasInput!: ElementRef;
  @ViewChild('cantidadInput') cantidadInput!: ElementRef;

  // Variables para la búsqueda y selección de proveedor
  busquedaProveedor: string = '';
  proveedores: Proveedor[] = [];
  proveedoresFiltrados: Proveedor[] = [];
  proveedorSeleccionado: Proveedor | null = null;

  // Variables para productos
  productos: Producto[] = [];
  productosEnPedido: ProductoEnPedido[] = [];
  productoActual: Producto | null = null;
  nuevoCodBarras: number | null = null;
  nuevaCantidad: number = 1;
  nuevoPrecio: number | null = null;
  montoTotal: number = 0;

  constructor(
    private firestoreService: FirestoreService,
    private alertController: AlertController,
    private modalController: ModalController,
    private toastController: ToastController,
    private navController: NavController
  ) { }

  ngOnInit() {
    this.cargarProveedores();
    this.cargarProductos();
  }

  cargarProveedores() {
    console.log('Cargando proveedores...');
    this.firestoreService.getProveedores().subscribe(
      (proveedores: Proveedor[]) => {
        console.log('Proveedores cargados:', proveedores);
        this.proveedores = proveedores;
      },
      error => {
        console.error('Error al cargar proveedores:', error);
      }
    );
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

  buscarProveedor() {
    if (!this.busquedaProveedor.trim()) {
      this.proveedoresFiltrados = [];
      return;
    }

    const termino = this.busquedaProveedor.toLowerCase();
    this.proveedoresFiltrados = this.proveedores.filter(
      proveedor => proveedor.nombreProveedor.toLowerCase().includes(termino)
    );
  }

  seleccionarProveedor(proveedor: Proveedor) {
    console.log('Proveedor seleccionado:', proveedor);
    this.proveedorSeleccionado = proveedor;
    this.busquedaProveedor = '';
    this.proveedoresFiltrados = [];
    setTimeout(() => {
      if (this.codigoBarrasInput && this.codigoBarrasInput.nativeElement) {
        this.codigoBarrasInput.nativeElement.focus();
      }
    }, 100);
  }

  cambiarProveedor() {
    if (this.productosEnPedido.length > 0) {
      this.presentAlert(
        'Confirmar cambio',
        '¿Está seguro de cambiar el proveedor? Se perderán los productos ingresados.',
        [
          {
            text: 'Cancelar',
            role: 'cancel'
          },
          {
            text: 'Aceptar',
            handler: () => {
              this.proveedorSeleccionado = null;
              this.productosEnPedido = [];
              this.montoTotal = 0;
            }
          }
        ]
      );
    } else {
      this.proveedorSeleccionado = null;
    }
  }

  async abrirModalNuevoProveedor() {
    const modal = await this.modalController.create({
      component: NuevoProveedorComponent
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data && data.proveedor) {
      this.cargarProveedores();
      this.seleccionarProveedor(data.proveedor);
    }
  }

  buscarProducto() {
    if (!this.nuevoCodBarras) {
      return;
    }

    console.log('Buscando producto con código:', this.nuevoCodBarras);
    const productoEncontrado = this.productos.find(p => p.cod_barras === this.nuevoCodBarras);

    if (productoEncontrado) {
      console.log('Producto encontrado:', productoEncontrado);
      this.productoActual = productoEncontrado;
      this.nuevoPrecio = productoEncontrado.precio_compra;

      setTimeout(() => {
        if (this.cantidadInput && this.cantidadInput.nativeElement) {
          this.cantidadInput.nativeElement.focus();
        }
      }, 100);
    } else {
      console.log('Producto no encontrado');
      this.productoActual = null;
      this.nuevoPrecio = null;
      this.presentAlert(
        'Producto no encontrado',
        `No se encontró ningún producto con código ${this.nuevoCodBarras}`,
        [
          {
            text: 'Cancelar',
            role: 'cancel'
          },
          {
            text: 'Crear Nuevo',
            handler: () => {
              this.abrirModalNuevoProducto(this.nuevoCodBarras || undefined);
            }
          }
        ]
      );
    }
  }

  async abrirModalNuevoProducto(codBarras?: number) {
    const modal = await this.modalController.create({
      component: NuevoProductoComponent,
      componentProps: {
        idProveedor: this.proveedorSeleccionado?.id,
        codBarras: codBarras
      }
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data && data.producto) {
      this.cargarProductos();

      // Seleccionar el producto recién creado
      this.productoActual = data.producto;
      this.nuevoCodBarras = data.producto.cod_barras;
      this.nuevoPrecio = data.producto.precio_compra;

      setTimeout(() => {
        if (this.cantidadInput && this.cantidadInput.nativeElement) {
          this.cantidadInput.nativeElement.focus();
        }
      }, 100);
    }
  }

  agregarProductoAlPedido() {
    if (!this.productoActual || !this.nuevaCantidad || !this.nuevoPrecio) {
      this.presentToast('Por favor complete todos los campos');
      return;
    }

    // Verificar si el producto ya está en el pedido
    const index = this.productosEnPedido.findIndex(p => p.idProducto === this.productoActual?.id);

    if (index >= 0) {
      // Actualizar cantidad y precio si ya existe
      this.productosEnPedido[index].cantidad += this.nuevaCantidad;
      this.productosEnPedido[index].precioCompra = this.nuevoPrecio;
      this.calcularSubtotal(index);
    } else {
      // Agregar nuevo producto al pedido
      const nuevoProducto: ProductoEnPedido = {
        idProducto: this.productoActual.id,
        nombre: this.productoActual.nombre,
        codBarras: this.productoActual.cod_barras,
        cantidad: this.nuevaCantidad,
        precioCompra: this.nuevoPrecio,
        subtotal: this.nuevaCantidad * this.nuevoPrecio
      };

      this.productosEnPedido.push(nuevoProducto);
    }

    // Limpiar campos para un nuevo producto
    this.productoActual = null;
    this.nuevoCodBarras = null;
    this.nuevaCantidad = 1;
    this.nuevoPrecio = null;

    // Calcular total
    this.calcularMontoTotal();

    // Establecer foco en el campo de código de barras
    setTimeout(() => {
      if (this.codigoBarrasInput && this.codigoBarrasInput.nativeElement) {
        this.codigoBarrasInput.nativeElement.focus();
      }
    }, 100);
  }

  eliminarProducto(index: number) {
    this.productosEnPedido.splice(index, 1);
    this.calcularMontoTotal();
  }

  calcularSubtotal(index: number) {
    const item = this.productosEnPedido[index];
    item.subtotal = item.cantidad * item.precioCompra;
    this.calcularMontoTotal();
  }

  calcularMontoTotal() {
    this.montoTotal = this.productosEnPedido.reduce(
      (total, item) => total + (item.subtotal || 0),
      0
    );
  }

  async confirmarPedido() {
    if (!this.proveedorSeleccionado) {
      this.presentToast('Debe seleccionar un proveedor');
      return;
    }

    if (this.productosEnPedido.length === 0) {
      this.mostrarPedidosPendientes();
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirmar Pedido',
      message: 'Seleccione el método de pago',
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
          label: 'Crédito',
          value: 'credito'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Confirmar',
          handler: async (data) => {
            const metodoPago = data;

            if (metodoPago === 'efectivo') {
              await this.guardarPedido(metodoPago, this.montoTotal, 'pagado');
            } else {
              const montoPagadoAlert = await this.alertController.create({
                header: 'Pago Inicial',
                message: 'Ingrese el monto pagado inicialmente (0 si no hay pago inicial)',
                inputs: [
                  {
                    name: 'montoPagado',
                    type: 'number',
                    placeholder: 'Monto inicial',
                    value: '0'
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
                      const montoPagado = parseFloat(data.montoPagado) || 0;
                      const estado = montoPagado >= this.montoTotal ? 'pagado' : 'pendiente';
                      this.guardarPedido(metodoPago, montoPagado, estado);
                    }
                  }
                ]
              });

              await montoPagadoAlert.present();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async guardarPedido(metodoPago: 'efectivo' | 'credito', montoPagado: number, estado: 'pagado' | 'pendiente') {
    const pedido: Pedido = {
      idProveedor: this.proveedorSeleccionado!.id,
      nombreProveedor: this.proveedorSeleccionado!.nombreProveedor,
      fechaRecepcion: new Date().toISOString(),
      montoPagado: montoPagado,
      montoTotal: this.montoTotal,
      metodoPago: metodoPago,
      estado: estado,
      productos: this.productosEnPedido.map(p => ({
        idProducto: p.idProducto,
        nombre: p.nombre,
        cantidad: p.cantidad,
        precioCompra: p.precioCompra,
        subtotal: p.subtotal
      }))
    };

    try {
      console.log('Guardando pedido:', pedido);
      await this.firestoreService.guardarPedido(pedido);
      await this.actualizarStockProductos();

      this.presentToast('Pedido guardado correctamente');
      this.volver();
    } catch (error) {
      console.error('Error al guardar pedido:', error);
      this.presentToast('Error al guardar el pedido');
    }
  }

  async actualizarStockProductos() {
    console.log('Actualizando stock de productos...');
    for (const item of this.productosEnPedido) {
      const producto = this.productos.find(p => p.id === item.idProducto);
      if (producto) {
        const nuevoStock = producto.stock + item.cantidad;
        await this.firestoreService.actualizarStockProducto(producto.id, nuevoStock);
      }
    }
  }

  async mostrarPedidosPendientes() {
    console.log('Buscando pedidos pendientes...');
    try {
      const pedidosPendientes = await this.firestoreService.getPedidosPendientes();
      console.log('Pedidos pendientes:', pedidosPendientes);

      if (pedidosPendientes.length === 0) {
        this.presentToast('No hay pedidos pendientes de pago');
        return;
      }

      const inputs = pedidosPendientes.map(pedido => ({
        name: 'pedidoId',
        type: 'radio' as const,
        label: `${pedido.nombreProveedor} - $${pedido.montoTotal} (Pagado: $${pedido.montoPagado})`,
        value: pedido.id
      }));

      const alert = await this.alertController.create({
        header: 'Pedidos Pendientes',
        inputs,
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel'
          },
          {
            text: 'Seleccionar',
            handler: (pedidoId) => {
              if (pedidoId) {
                this.procesarPagoPendiente(pedidoId);
              }
            }
          }
        ]
      });

      await alert.present();
    } catch (error) {
      console.error('Error al obtener pedidos pendientes:', error);
      this.presentToast('Error al obtener pedidos pendientes');
    }
  }

  async procesarPagoPendiente(pedidoId: string) {
    try {
      console.log('Procesando pago pendiente para pedido:', pedidoId);
      const pedido = await this.firestoreService.getPedido(pedidoId);
      const montoPendiente = pedido.montoTotal - pedido.montoPagado;

      const alert = await this.alertController.create({
        header: 'Procesar Pago',
        message: `Monto pendiente: $${montoPendiente}`,
        inputs: [
          {
            name: 'montoPagado',
            type: 'number',
            placeholder: 'Monto a pagar',
            value: montoPendiente.toString()
          }
        ],
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel'
          },
          {
            text: 'Confirmar Pago',
            handler: async (data) => {
              const montoPagado = parseFloat(data.montoPagado) || 0;
              const nuevoMontoPagado = pedido.montoPagado + montoPagado;
              const nuevoEstado = nuevoMontoPagado >= pedido.montoTotal ? 'pagado' : 'pendiente';

              try {
                console.log(`Actualizando pago: ID=${pedidoId}, Monto=${nuevoMontoPagado}, Estado=${nuevoEstado}`);
                await this.firestoreService.actualizarPagoPedido(pedidoId, nuevoMontoPagado, nuevoEstado);
                this.presentToast('Pago registrado correctamente');
              } catch (error) {
                console.error('Error al registrar pago:', error);
                this.presentToast('Error al registrar el pago');
              }
            }
          }
        ]
      });

      await alert.present();
    } catch (error) {
      console.error('Error al procesar pago pendiente:', error);
      this.presentToast('Error al procesar el pago pendiente');
    }
  }

  async presentAlert(header: string, message: string, buttons: any[]) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons
    });

    await alert.present();
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

