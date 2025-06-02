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
}

@Component({
  selector: 'app-ingresar-pedido',
  templateUrl: './ingresar-pedido.page.html',
  styleUrls: ['./ingresar-pedido.page.scss'],
  standalone: false
})
export class IngresarPedidoPage implements OnInit {
  @ViewChild('codigoInput') codigoInput!: ElementRef;
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
  nuevaCantidad: number = 1;
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

  buscarProducto() {
    if (!this.nuevoCodigo) {
      return;
    }

    console.log('Buscando producto con código de barras:', this.nuevoCodigo);
    // Buscar primero por cod_barras
    const productoEncontrado = this.productos.find(p => p.cod_barras === this.nuevoCodigo);

    if (productoEncontrado) {
      console.log('Producto encontrado:', productoEncontrado);
      this.productoActual = productoEncontrado;

      setTimeout(() => {
        if (this.cantidadInput && this.cantidadInput.nativeElement) {
          this.cantidadInput.nativeElement.focus();
        }
      }, 100);
    } else {
      console.log('Producto no encontrado');
      this.productoActual = null;
      this.presentAlert(
        'Producto no encontrado',
        `No se encontró ningún producto con código ${this.nuevoCodigo}`,
        [
          {
            text: 'Cancelar',
            role: 'cancel'
          },
          {
            text: 'Crear Nuevo',
            handler: () => {
              this.abrirModalNuevoProducto();
            }
          }
        ]
      );
    }
  }

  agregarProductoAlPedido() {
    if (!this.productoActual || !this.nuevaCantidad) {
      this.presentToast('Por favor complete todos los campos');
      return;
    }

    // Verificar si el producto ya está en el pedido
    const index = this.productosEnPedido.findIndex(p => p.cod_barras === this.productoActual?.cod_barras);

    if (index >= 0) {
      // Actualizar cantidad si ya existe
      this.productosEnPedido[index].cantidad += this.nuevaCantidad;
    } else {
      // Agregar nuevo producto al pedido
      const nuevoProducto: ProductoEnPedido = {
        cod_barras: this.productoActual.cod_barras,
        nombre: this.productoActual.nombre,
        cantidad: this.nuevaCantidad
      };

      this.productosEnPedido.push(nuevoProducto);
    }

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
                                console.log('monto pagado:' + montoPagado.toString());
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
              await metodoPagoAlert.present();
            } else {
              this.presentToast('Debe ingresar cantidad mayor a 0');
            }
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
        cod_barras: p.cod_barras,
        nombre: p.nombre,
        cantidad: p.cantidad
      }))
    };

    try {
      console.log('Guardando pedido:', pedido);

      // Usamos el nuevo método que maneja el proceso completo
      const pedidoId = await this.firestoreService.procesarPedido(pedido, this.productos);

      console.log('Pedido guardado con ID:', pedidoId);
      this.presentToast('Pedido guardado correctamente');
    } catch (error) {
      console.error('Error al guardar pedido:', error);
      this.presentToast('Error al guardar el pedido');
    }
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

