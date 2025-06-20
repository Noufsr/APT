import { Producto } from './../../models/producto.models';
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { AlertController, ModalController, NavController, ToastController } from '@ionic/angular';
import { FirestoreService } from '../../services/firestore.service';
import { Proveedor } from '../../models/proveedor.models';
import { Pedido, ProductoPedido } from '../../models/pedido.models';
import { NuevoProveedorComponent } from '../../components/nuevo-proveedor/nuevo-proveedor.component';
import { NuevoProductoComponent } from '../../components/nuevo-producto/nuevo-producto.component';

interface ProductoEnPedido extends ProductoPedido {
  nombre?: string;
  cad?: number;
}

@Component({
  selector: 'app-ingresar-pedido',
  templateUrl: './ingresar-pedido.page.html',
  styleUrls: ['./ingresar-pedido.page.scss'],
  standalone: false
})
export class IngresarPedidoPage implements OnInit {
  @ViewChild('codigoInput') codigoInput!: ElementRef;
  @ViewChild('cadInput') cadInput!: ElementRef;
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
  nuevoCodigo: number | null = null;
  nuevoCAD: number | null = null;
  nuevaCantidad: number = 1;
  montoTotal: number = 0;

  // Variables para pedidos pendientes
  pedidosPendientes: Pedido[] = [];

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
    this.cargarPedidosPendientes();
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

  cargarPedidosPendientes() {
    this.firestoreService.getPedidos().subscribe(
      (pedidos: Pedido[]) => {
        this.pedidosPendientes = pedidos.filter(p => p.estado === 'pendiente');
      },
      error => {
        console.error('Error al cargar pedidos pendientes:', error);
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
      if (this.codigoInput && this.codigoInput.nativeElement) {
        this.codigoInput.nativeElement.focus();
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

  async abrirModalNuevoProducto() {
    const modal = await this.modalController.create({
      component: NuevoProductoComponent
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data && data.producto) {
      this.cargarProductos();
    }
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


    // Buscar primero por cod_barras
    const productoEncontrado = this.productos.find(p => p.cod_barras === this.nuevoCodigo);

    if (productoEncontrado) {
      this.procesarProductoEncontrado(productoEncontrado);
    } else {

      this.productoActual = null;
      this.presentToast(`No se encontró ningún producto con código ${this.nuevoCodigo}`);
      this.nuevoCodigo = null;
    }
  }

  buscarProductoPorCAD() {
    if (!this.nuevoCAD) {
      return;
    }



    const productoEncontrado = this.productos.find(p => {
      // Verificar si el producto tiene la propiedad cad y si coincide
      return p.cad && Number(p.cad) === Number(this.nuevoCAD);
    });

    if (productoEncontrado) {

      this.procesarProductoEncontrado(productoEncontrado);
    } else {

      this.productoActual = null;
      this.presentToast(`No se encontró ningún producto con CAD ${this.nuevoCAD}`);
      this.nuevoCAD = null;
    }
  }

  private procesarProductoEncontrado(producto: Producto) {

    this.productoActual = producto;
    // Actualizar ambos campos con la información del producto
    this.nuevoCodigo = producto.cod_barras;
    this.nuevoCAD = producto.cad;

    // Agregar directamente con cantidad 1
    this.nuevaCantidad = 1;
    this.agregarProductoAlPedido();
  }

  agregarProductoAlPedido() {
    if (!this.productoActual) {
      this.presentToast('Por favor busque un producto primero');
      return;
    }

    // Verificar si el producto ya está en el pedido
    const index = this.productosEnPedido.findIndex(p => p.idProducto === this.productoActual?.id);

    if (index >= 0) {
      // Actualizar cantidad si ya existe
      this.productosEnPedido[index].cantidad += this.nuevaCantidad;
    } else {
      // Agregar nuevo producto al pedido
      const nuevoProducto: ProductoEnPedido = {
        idProducto: this.productoActual.id,
        cad: this.productoActual.cad,
        nombre: this.productoActual.nombre,
        cantidad: this.nuevaCantidad
      };

      this.productosEnPedido.push(nuevoProducto);
    }

    // Limpiar campos para un nuevo producto
    this.productoActual = null;
    this.nuevoCodigo = null;
    this.nuevoCAD = null;
    this.nuevaCantidad = 1;

    // Establecer foco en el campo de código de barras
    setTimeout(() => {
      if (this.codigoInput && this.codigoInput.nativeElement) {
        this.codigoInput.nativeElement.focus();
      }
    }, 100);
  }

  eliminarProducto(index: number) {
    this.productosEnPedido.splice(index, 1);
  }

  async confirmarPedido() {
    if (!this.proveedorSeleccionado) {
      this.presentToast('Debe seleccionar un proveedor');
      return;
    }

    if (this.productosEnPedido.length === 0) {
      this.presentToast('Debe agregar al menos un producto al pedido');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Monto total',
      message: 'Ingrese el monto total (no puede ser 0)',
      inputs: [
        {
          name: 'montoTotal',
          type: 'number',
          placeholder: 'Monto total',
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
          handler: async (data) => {
            const montoTotal = parseFloat(data.montoTotal) || 0;
            console.log('monto total:' + montoTotal.toString());

            if (montoTotal > 0) {
              this.montoTotal = montoTotal;
              this.mostrarOpcionesPago();
            } else {
              this.presentToast('Debe ingresar cantidad mayor a 0');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async mostrarOpcionesPago() {
              const metodoPagoAlert = await this.alertController.create({
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
                    handler: async (metodoPago) => {
                      console.log('metodo:' + metodoPago);
                      if (metodoPago === 'efectivo') {
              await this.mostrarResumenPedido(metodoPago, this.montoTotal);
                      } else {
              await this.solicitarMontoPagadoInicial(metodoPago);
            }
          }
        }
      ]
    });
    await metodoPagoAlert.present();
  }

  async solicitarMontoPagadoInicial(metodoPago: string) {
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
          handler: async (data) => {
                                const montoPagado = parseFloat(data.montoPagado) || 0;
                                console.log('monto pagado:' + montoPagado.toString());
                                const estado = montoPagado >= this.montoTotal ? 'pagado' : 'pendiente';
            await this.guardarPedido(metodoPago, montoPagado, estado);
                              }
                            }
                          ]
                        });

                        await montoPagadoAlert.present();
                      }

  async mostrarResumenPedido(metodoPago: string, montoPagado: number) {
    let resumenHTML = '<ion-list>';
    resumenHTML += '<ion-list-header><h3>Resumen del Pedido</h3></ion-list-header>';

    this.productosEnPedido.forEach(p => {
      resumenHTML += `
        <ion-item>
          <ion-label>
            <h3>${p.nombre}</h3>
            <p>Cantidad: ${p.cantidad} | CAD: ${p.cad}</p>
          </ion-label>
        </ion-item>
      `;
    });

    resumenHTML += '</ion-list>';
    resumenHTML += `<ion-item><ion-label><strong>Total: ${this.montoTotal.toFixed(2)}</strong></ion-label></ion-item>`;

    const alert = await this.alertController.create({
      header: 'Confirmar Pedido',
      message: resumenHTML,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Confirmar',
          handler: () => {
            this.guardarPedido(metodoPago, montoPagado, 'pagado');
          }
        }
      ]
    });

    await alert.present();
  }

  async presentAlert(header: string, message: string, buttons: any[]) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons
    });

    await alert.present();
  }

  async guardarPedido(metodoPago: string, montoPagado: number, estado: string) {
    if (!this.proveedorSeleccionado) {
      this.presentToast('Debe seleccionar un proveedor');
      return;
    }

    const pedido: Pedido = {
      idProveedor: this.proveedorSeleccionado.id.toString(),
      nombreProveedor: this.proveedorSeleccionado.nombreProveedor,
      fechaRecepcion: new Date().toISOString(),
      montoPagado: montoPagado,
      montoTotal: this.montoTotal,
      metodoPago: metodoPago,
      estado: estado,
      productos: this.productosEnPedido.map(p => ({
        idProducto: p.idProducto,
        nombre: p.nombre,
        cantidad: p.cantidad
      }))
    };

    try {
      console.log('Guardando pedido:', pedido);

      // Usamos el nuevo método que maneja el proceso completo
      const pedidoId = await this.firestoreService.procesarPedido(pedido, this.productos);


      this.presentToast('Pedido guardado correctamente');

      // Limpiar el formulario
      this.proveedorSeleccionado = null;
      this.productosEnPedido = [];
      this.montoTotal = 0;

    } catch (error) {
      console.error('Error al guardar pedido:', error);
      this.presentToast('Error al guardar el pedido');
    }
  }

  async abrirPagosPendientes() {
    if (this.pedidosPendientes.length === 0) {
      this.presentToast('No hay pedidos pendientes de pago');
      return;
    }

    const inputs = this.pedidosPendientes.map(pedido => ({
      name: pedido.id,
      type: 'radio' as const,
      label: `${pedido.nombreProveedor} - Total: ${pedido.montoTotal} - Pagado: ${pedido.montoPagado} - Saldo: ${pedido.montoTotal - pedido.montoPagado}`,
      value: pedido
    }));

    const alert = await this.alertController.create({
      header: 'Pedidos Pendientes',
      message: 'Seleccione el pedido a pagar o abonar',
      inputs: inputs,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Seleccionar',
          handler: (pedidoSeleccionado) => {
            if (pedidoSeleccionado) {
              this.procesarPagoPedido(pedidoSeleccionado);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async procesarPagoPedido(pedido: Pedido) {
    const saldoPendiente = pedido.montoTotal - pedido.montoPagado;

    const alert = await this.alertController.create({
      header: 'Pagar/Abonar Pedido',
      message: `Proveedor: ${pedido.nombreProveedor}\nSaldo pendiente: ${saldoPendiente.toFixed(2)}`,
      inputs: [
        {
          name: 'montoAbono',
          type: 'number',
          placeholder: 'Monto a abonar',
          value: saldoPendiente.toString()
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
            const montoAbono = parseFloat(data.montoAbono) || 0;

            if (montoAbono <= 0) {
              this.presentToast('El monto debe ser mayor a 0');
              return;
            }

            if (montoAbono > saldoPendiente) {
              this.presentToast('El monto no puede ser mayor al saldo pendiente');
              return;
            }

            try {
              const nuevoMontoPagado = pedido.montoPagado + montoAbono;
              const nuevoEstado = nuevoMontoPagado >= pedido.montoTotal ? 'pagado' : 'pendiente';

              pedido.montoPagado = nuevoMontoPagado;
              pedido.estado = nuevoEstado;

              await this.firestoreService.guardarPedido(pedido);

              this.presentToast(`Pago registrado correctamente. ${nuevoEstado === 'pagado' ? 'Pedido completamente pagado.' : `Nuevo saldo: ${(pedido.montoTotal - nuevoMontoPagado).toFixed(2)}`}`);

              this.cargarPedidosPendientes();
            } catch (error) {
              console.error('Error al procesar pago:', error);
              this.presentToast('Error al procesar el pago');
            }
          }
        }
      ]
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

