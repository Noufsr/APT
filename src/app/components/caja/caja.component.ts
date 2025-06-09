import { Component, OnInit, Input } from '@angular/core';
import { ModalController, AlertController, ToastController } from '@ionic/angular';
import { FirestoreService } from '../../services/firestore.service';
import { AuthService } from '../../services/auth.service';
import { AperturaCaja, CierreCaja, PagoResumen } from '../../models/caja.models';
import { Pedido } from '../../models/pedido.models';
import { Boleta } from '../../models/venta.models';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-caja',
  templateUrl: './caja.component.html',
  styleUrls: ['./caja.component.scss'],
  standalone: false
})
export class CajaComponent implements OnInit {
  @Input() accion: 'apertura' | 'cierre' = 'apertura';

  // Variables comunes
  cajero: string = '';
  cajeroId: string = '';

  // Variables para apertura
  efectivoApertura: number = 0;
  saldoBipApertura: number = 0;
  saldoCajaVecinaApertura: number = 0;

  // Variables para cierre
  aperturaActual: AperturaCaja | null = null;
  pagosProveedores: PagoResumen[] = [];
  totalPagosProveedores: number = 0;
  totalVentasEfectivo: number = 0;
  totalVentasTarjeta: number = 0;
  totalDevoluciones: number = 0; // NUEVO

  // Montos esperados (calculados)
  efectivoEsperado: number = 0;
  saldoBipEsperado: number = 0;
  saldoCajaVecinaEsperado: number = 0;

  // Montos ingresados por el usuario
  efectivoCierre: number = 0;
  montoMaquinaTarjeta: number = 0;
  saldoBipCierre: number = 0;
  saldoCajaVecinaCierre: number = 0;

  // Control de vistas
  mostrarResumen: boolean = false;

  // Resumen final
  resumenCierre: CierreCaja | null = null;

  constructor(
    private modalController: ModalController,
    private firestoreService: FirestoreService,
    private authService: AuthService,
    private alertController: AlertController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.obtenerUsuarioActual();

    if (this.accion === 'apertura') {
      this.verificarCierrePendiente();
      this.cargarUltimosCierres();
    } else {
      this.cargarDatosParaCierre();
    }
  }

  obtenerUsuarioActual() {
    this.authService.currentUser.pipe(take(1)).subscribe(user => {
      if (user) {
        this.cajero = user.nombre || '';
        this.cajeroId = user.uid || '';
      }
    });
  }

  async verificarCierrePendiente() {
    try {
      const aperturas = await this.firestoreService.getAperturasAbiertas().pipe(take(1)).toPromise();

      if (aperturas && aperturas.length > 0) {
        await this.presentToast('Debe realizar el cierre de caja antes de hacer una nueva apertura', 'warning');
        this.cerrar();
      }
    } catch (error) {
      console.error('Error verificando cierre pendiente:', error);
    }
  }

  async cargarUltimosCierres() {
    try {
      const ultimoCierre = await this.firestoreService.getUltimoCierre().pipe(take(1)).toPromise();

      if (ultimoCierre) {
        this.efectivoApertura = ultimoCierre.efectivoCierre;
        this.saldoBipApertura = ultimoCierre.saldoBipCierre;
        this.saldoCajaVecinaApertura = ultimoCierre.saldoCajaVecinaCierre;
      }
    } catch (error) {
      console.error('Error cargando último cierre:', error);
    }
  }

  async cargarDatosParaCierre() {
    try {
      // Obtener apertura actual
      const aperturas = await this.firestoreService.getAperturasAbiertas().pipe(take(1)).toPromise();

      if (!aperturas || aperturas.length === 0) {
        await this.presentToast('No hay apertura de caja activa', 'warning');
        this.cerrar();
        return;
      }

      this.aperturaActual = aperturas[0];

      // Cargar pagos a proveedores
      await this.cargarPagosProveedores();

      // Cargar ventas del día
      await this.cargarVentasDelDia();

      // Cargar devoluciones del día - NUEVO
      await this.cargarDevolucionesDelDia();

      // Calcular montos esperados
      this.calcularMontosEsperados();

    } catch (error) {
      console.error('Error cargando datos para cierre:', error);
    }
  }

  async cargarPagosProveedores() {
    if (!this.aperturaActual) return;

    console.log('Cargando pagos desde:', this.aperturaActual.fecha);

    const pedidos = await this.firestoreService.getPedidosDesde(this.aperturaActual.fecha).pipe(take(1)).toPromise();

    if (pedidos) {
      console.log('Pedidos encontrados:', pedidos);

      this.pagosProveedores = pedidos.map(pedido => ({
        nombreProveedor: pedido.nombreProveedor || 'Sin nombre',
        montoPagado: pedido.montoPagado,
        metodoPago: pedido.metodoPago
      }));

      this.totalPagosProveedores = pedidos.reduce((total, pedido) => total + pedido.montoPagado, 0);

      console.log('Total pagos proveedores:', this.totalPagosProveedores);
    } else {
      console.log('No se encontraron pedidos');
    }
  }

  async cargarVentasDelDia() {
    if (!this.aperturaActual) return;

    const ventas = await this.firestoreService.getVentasDesde(this.aperturaActual.fecha).pipe(take(1)).toPromise();

    if (ventas) {
      this.totalVentasEfectivo = ventas
        .filter(venta => venta.metodo_pago === 'efectivo')
        .reduce((total, venta) => total + venta.total, 0);

      this.totalVentasTarjeta = ventas
        .filter(venta => venta.metodo_pago === 'tarjeta')
        .reduce((total, venta) => total + venta.total, 0);
    }
  }

  // NUEVO MÉTODO
  async cargarDevolucionesDelDia() {
    if (!this.aperturaActual) return;

    try {
      const devoluciones = await this.firestoreService.getDevolucionesDesde(this.aperturaActual.fecha)
        .pipe(take(1))
        .toPromise();

      if (devoluciones) {
        this.totalDevoluciones = devoluciones.reduce((total, devolucion) => total + devolucion.monto, 0);
        console.log('Total devoluciones del día:', this.totalDevoluciones);
      } else {
        this.totalDevoluciones = 0;
      }
    } catch (error) {
      console.error('Error cargando devoluciones:', error);
      this.totalDevoluciones = 0;
    }
  }

  async calcularMontosEsperados() {
    if (!this.aperturaActual) return;

    // Efectivo esperado = efectivo apertura + ventas efectivo - pagos proveedores en efectivo - devoluciones
    const pagosProveedoresEfectivo = this.pagosProveedores
      .filter(p => p.metodoPago === 'efectivo')
      .reduce((total, p) => total + p.montoPagado, 0);

    let efectivoCalculado = this.aperturaActual.efectivo + this.totalVentasEfectivo - pagosProveedoresEfectivo - this.totalDevoluciones; // MODIFICADO

    // Calcular saldo BIP esperado considerando las operaciones del día
    try {
      const operacionesBip = await this.firestoreService.getBipDesde(this.aperturaActual.fecha).pipe(take(1)).toPromise();

      let saldoBipCalculado = this.aperturaActual.saldoBip;

      if (operacionesBip) {
        operacionesBip.forEach(op => {
          if (op.tipo === 'recarga') {
            saldoBipCalculado -= op.monto;
          } else if (op.tipo === 'deposito') {
            saldoBipCalculado += op.monto;
          }
        });
      }

      this.saldoBipEsperado = saldoBipCalculado;
    } catch (error) {
      console.error('Error calculando saldo BIP esperado:', error);
      this.saldoBipEsperado = this.aperturaActual.saldoBip;
    }

    // Calcular saldo Caja Vecina esperado considerando las transacciones del día
    try {
      const transaccionesCajaVecina = await this.firestoreService.getCajaVecinaDesde(this.aperturaActual.fecha).pipe(take(1)).toPromise();

      let saldoCajaVecinaCalculado = this.aperturaActual.saldoCajaVecina;

      if (transaccionesCajaVecina) {
        transaccionesCajaVecina.forEach(trans => {
          if (trans.tipo_trans === 'giro') {
            saldoCajaVecinaCalculado += trans.monto;
            efectivoCalculado -= trans.monto;
          } else if (trans.tipo_trans === 'deposito') {
            saldoCajaVecinaCalculado -= trans.monto;
            efectivoCalculado += trans.monto;
          } else if (trans.tipo_trans === 'pago' && trans.metodo_pago === 'efectivo') {
            saldoCajaVecinaCalculado -= trans.monto;
            efectivoCalculado += trans.monto;
          }
        });
      }

      this.saldoCajaVecinaEsperado = saldoCajaVecinaCalculado;
      this.efectivoEsperado = efectivoCalculado;

    } catch (error) {
      console.error('Error calculando saldo Caja Vecina esperado:', error);
      this.saldoCajaVecinaEsperado = this.aperturaActual.saldoCajaVecina;
    }

    // Establecer valores esperados como valores por defecto en los inputs - MODIFICADO
    this.efectivoCierre = this.efectivoEsperado;
    this.montoMaquinaTarjeta = this.totalVentasTarjeta;
    this.saldoBipCierre = this.saldoBipEsperado;
    this.saldoCajaVecinaCierre = this.saldoCajaVecinaEsperado;
  }

  async realizarApertura() {
    if (!this.cajero) {
      await this.presentToast('Error: No se pudo identificar al cajero', 'danger');
      return;
    }

    const apertura: AperturaCaja = {
      fecha: new Date(),
      cajero: this.cajero,
      cajeroId: this.cajeroId,
      efectivo: this.efectivoApertura,
      saldoBip: this.saldoBipApertura,
      saldoCajaVecina: this.saldoCajaVecinaApertura,
      estado: 'abierta'
    };

    try {
      await this.firestoreService.guardarAperturaCaja(apertura);
      await this.presentToast('Apertura de caja realizada correctamente', 'success');
      this.cerrar();
    } catch (error) {
      console.error('Error al realizar apertura:', error);
      await this.presentToast('Error al realizar apertura de caja', 'danger');
    }
  }

  mostrarResumenCierre() {
    if (!this.aperturaActual) return;

    // Calcular diferencias
    const diferenciaEfectivo = this.efectivoCierre - this.efectivoEsperado;
    const diferenciaTarjeta = this.montoMaquinaTarjeta - this.totalVentasTarjeta;
    const diferenciaBip = this.saldoBipCierre - this.saldoBipEsperado;
    const diferenciaCajaVecina = this.saldoCajaVecinaCierre - this.saldoCajaVecinaEsperado;

    // Total cierre = efectivo + bip + caja vecina
    const totalEfectivoCierre = this.efectivoCierre + this.saldoBipCierre + this.saldoCajaVecinaCierre;
    const totalEfectivoApertura = this.aperturaActual.efectivo + this.aperturaActual.saldoBip + this.aperturaActual.saldoCajaVecina;

    // Total pagos ahora incluye las ventas con tarjeta
    const totalPagosConTarjeta = this.totalPagosProveedores + this.totalVentasTarjeta;

    // Venta diaria = total pagos (incluyendo tarjetas) + total cierre - total apertura
    const ventaDiaria = totalPagosConTarjeta + totalEfectivoCierre - totalEfectivoApertura;

    this.resumenCierre = {
      aperturaId: this.aperturaActual.id!,
      fecha: new Date(),
      cajero: this.cajero,
      cajeroId: this.cajeroId,
      efectivoApertura: this.aperturaActual.efectivo,
      saldoBipApertura: this.aperturaActual.saldoBip,
      saldoCajaVecinaApertura: this.aperturaActual.saldoCajaVecina,
      totalPagosProveedores: totalPagosConTarjeta,
      totalVentasEfectivo: this.totalVentasEfectivo,
      totalVentasTarjeta: this.totalVentasTarjeta,
      totalDevoluciones: this.totalDevoluciones, // NUEVO
      efectivoCierre: this.efectivoCierre,
      saldoBipCierre: this.saldoBipCierre,
      saldoCajaVecinaCierre: this.saldoCajaVecinaCierre,
      montoMaquinaTarjeta: this.montoMaquinaTarjeta,
      diferenciaEfectivo: diferenciaEfectivo,
      diferenciaTarjeta: diferenciaTarjeta,
      diferenciaBip: diferenciaBip,
      diferenciaCajaVecina: diferenciaCajaVecina,
      diferenciaTotal: diferenciaEfectivo + diferenciaTarjeta + diferenciaBip + diferenciaCajaVecina,
      ventaDiaria: ventaDiaria
    };

    this.mostrarResumen = true;
  }

  async confirmarCierre() {
    if (!this.resumenCierre || !this.aperturaActual) return;

    try {
      // Guardar cierre
      await this.firestoreService.guardarCierreCaja(this.resumenCierre);

      // Actualizar estado de apertura
      await this.firestoreService.actualizarEstadoApertura(this.aperturaActual.id!, 'cerrada');

      // Mostrar venta del día
      const alert = await this.alertController.create({
        header: 'Cierre de Caja Exitoso',
        message: `Venta del día: $${this.resumenCierre.ventaDiaria.toLocaleString('es-CL')}`,
        buttons: ['OK']
      });

      await alert.present();
      await alert.onDidDismiss();

      this.cerrar();
    } catch (error) {
      console.error('Error al confirmar cierre:', error);
      await this.presentToast('Error al realizar cierre de caja', 'danger');
    }
  }

  cerrar() {
    this.modalController.dismiss();
  }

  async presentToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  // Helpers para formateo
  formatCurrency(value: number): string {
    return `$${value.toLocaleString('es-CL')}`;
  }

  getTotalApertura(): number {
    if (this.accion === 'apertura') {
      return this.efectivoApertura + this.saldoBipApertura + this.saldoCajaVecinaApertura;
    } else if (this.aperturaActual) {
      return this.aperturaActual.efectivo + this.aperturaActual.saldoBip + this.aperturaActual.saldoCajaVecina;
    }
    return 0;
  }

  getTotalCierre(): number {
    return this.efectivoCierre + this.saldoBipCierre + this.saldoCajaVecinaCierre;
  }

  getCurrentDate(): string {
    return new Date().toLocaleString('es-CL');
  }
}
