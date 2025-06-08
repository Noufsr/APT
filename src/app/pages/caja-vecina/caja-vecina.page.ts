import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { FirestoreService } from '../../services/firestore.service';
import { CajaVecina } from '../../models/cajavecina.models';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-caja-vecina',
  templateUrl: './caja-vecina.page.html',
  styleUrls: ['./caja-vecina.page.scss'],
  standalone: false
})
export class CajaVecinaPage implements OnInit {
  tipoTransaccion: 'giro' | 'deposito' | 'pago' = 'giro';
  monto: number | null = null;
  metodoPago: 'efectivo' | 'tarjeta' = 'efectivo';
  saldoCajaVecinaActual: number = 0;
  efectivoActual: number = 0;
  historialCajaVecina: CajaVecina[] = [];
  cajero: string = '';
  cajeroId: string = '';
  aperturaActual: any = null;

  constructor(
    private firestoreService: FirestoreService,
    private alertController: AlertController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.cargarDatosUsuario();
    this.cargarSaldosActuales();
    this.cargarHistorialDelDia();
  }

  cargarDatosUsuario() {
    const usuarioGuardado = localStorage.getItem('usuario');
    if (usuarioGuardado) {
      const usuario = JSON.parse(usuarioGuardado);
      this.cajero = usuario.nombre || 'Usuario';
      this.cajeroId = usuario.id || '';
    }
  }

  async cargarSaldosActuales() {
    try {
      const aperturasAbiertas = await this.firestoreService.getAperturasAbiertas()
        .pipe(take(1))
        .toPromise();

      if (aperturasAbiertas && aperturasAbiertas.length > 0) {
        this.aperturaActual = aperturasAbiertas[0];

        // Saldos iniciales de la apertura
        this.saldoCajaVecinaActual = this.aperturaActual.saldoCajaVecina || 0;
        this.efectivoActual = this.aperturaActual.efectivo || 0;

        // Obtener transacciones del día para calcular saldos actuales
        const transaccionesHoy = await this.firestoreService.getCajaVecinaDesde(this.aperturaActual.fecha)
          .pipe(take(1))
          .toPromise();

        if (transaccionesHoy) {
          transaccionesHoy.forEach(trans => {
            if (trans.tipo_trans === 'giro') {
              this.saldoCajaVecinaActual += trans.monto;
              this.efectivoActual -= trans.monto;
            } else if (trans.tipo_trans === 'deposito') {
              this.saldoCajaVecinaActual -= trans.monto;
              this.efectivoActual += trans.monto;
            } else if (trans.tipo_trans === 'pago' && trans.metodo_pago === 'efectivo') {
              this.saldoCajaVecinaActual -= trans.monto;
              this.efectivoActual += trans.monto;
            }
          });
        }

        // También considerar ventas y pagos del día
        await this.actualizarEfectivoConMovimientos();

      } else {
        this.presentToast('No hay apertura de caja activa', 'warning');
      }
    } catch (error) {
      console.error('Error al cargar saldos:', error);
      this.presentToast('Error al cargar los saldos', 'danger');
    }
  }

  async actualizarEfectivoConMovimientos() {
    try {
      // Obtener ventas en efectivo del día
      const ventasHoy = await this.firestoreService.getVentasDesde(this.aperturaActual.fecha)
        .pipe(take(1))
        .toPromise();

      if (ventasHoy) {
        const ventasEfectivo = ventasHoy
          .filter(v => v.metodo_pago === 'efectivo')
          .reduce((total, v) => total + v.total, 0);
        this.efectivoActual += ventasEfectivo;
      }

      // Obtener pagos a proveedores en efectivo
      const pedidosHoy = await this.firestoreService.getPedidosDesde(this.aperturaActual.fecha)
        .pipe(take(1))
        .toPromise();

      if (pedidosHoy) {
        const pagosEfectivo = pedidosHoy
          .filter(p => p.metodoPago === 'efectivo')
          .reduce((total, p) => total + p.montoPagado, 0);
        this.efectivoActual -= pagosEfectivo;
      }
    } catch (error) {
      console.error('Error actualizando efectivo:', error);
    }
  }

  async cargarHistorialDelDia() {
    try {
      const aperturasAbiertas = await this.firestoreService.getAperturasAbiertas()
        .pipe(take(1))
        .toPromise();

      if (aperturasAbiertas && aperturasAbiertas.length > 0) {
        const aperturaActual = aperturasAbiertas[0];

        const transaccionesHoy = await this.firestoreService.getCajaVecinaDesde(aperturaActual.fecha)
          .pipe(take(1))
          .toPromise();

        if (transaccionesHoy) {
          this.historialCajaVecina = transaccionesHoy.sort((a, b) => {
            const fechaA = a.fecha instanceof Date ? a.fecha : new Date(a.fecha);
            const fechaB = b.fecha instanceof Date ? b.fecha : new Date(b.fecha);
            return fechaB.getTime() - fechaA.getTime();
          });
        }
      }
    } catch (error) {
      console.error('Error al cargar historial:', error);
    }
  }

  async procesarTransaccion() {
    if (!this.monto || this.monto <= 0) {
      this.presentToast('Por favor ingrese un monto válido', 'warning');
      return;
    }

    // Validaciones según tipo de transacción
    if (this.tipoTransaccion === 'giro' && this.monto > this.efectivoActual) {
      this.presentToast('No hay suficiente efectivo disponible para el giro', 'danger');
      return;
    }

    if ((this.tipoTransaccion === 'deposito' ||
        (this.tipoTransaccion === 'pago' && this.metodoPago === 'efectivo'))
        && this.monto > this.saldoCajaVecinaActual) {
      this.presentToast('Saldo insuficiente en Caja Vecina', 'danger');
      return;
    }

    const mensaje = this.construirMensajeConfirmacion();

    const alert = await this.alertController.create({
      header: 'Confirmar Transacción',
      message: mensaje,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Confirmar',
          handler: () => {
            this.guardarTransaccion();
          }
        }
      ]
    });

    await alert.present();
  }

  construirMensajeConfirmacion(): string {
    const montoFormateado = this.formatCurrency(this.monto!);

    switch (this.tipoTransaccion) {
      case 'giro':
        return `¿Confirmar giro de ${montoFormateado}?`;
      case 'deposito':
        return `¿Confirmar depósito de ${montoFormateado}?`;
      case 'pago':
        if (this.metodoPago === 'efectivo') {
          return `¿Confirmar pago/recarga de ${montoFormateado} en efectivo?`;
        } else {
          return `¿Confirmar pago/recarga de ${montoFormateado} con tarjeta?`;
        }
      default:
        return '';
    }
  }

  async guardarTransaccion() {
    try {
      const transaccion: CajaVecina = {
        id: '',
        fecha: new Date(),
        monto: this.monto!,
        metodo_pago: this.tipoTransaccion === 'pago' ? this.metodoPago : 'efectivo',
        tipo_trans: this.tipoTransaccion,
        cajero: this.cajero
      };

      await this.firestoreService.agregarCajaVecina(transaccion);

      // Actualizar saldos locales
      if (this.tipoTransaccion === 'giro') {
        this.saldoCajaVecinaActual += this.monto!;
        this.efectivoActual -= this.monto!;
      } else if (this.tipoTransaccion === 'deposito') {
        this.saldoCajaVecinaActual -= this.monto!;
        this.efectivoActual += this.monto!;
      } else if (this.tipoTransaccion === 'pago' && this.metodoPago === 'efectivo') {
        this.saldoCajaVecinaActual -= this.monto!;
        this.efectivoActual += this.monto!;
      }

      this.presentToast('Transacción registrada exitosamente', 'success');

      // Limpiar campos
      this.monto = null;
      this.metodoPago = 'efectivo';

      // Recargar historial
      this.cargarHistorialDelDia();

    } catch (error) {
      console.error('Error al guardar transacción:', error);
      this.presentToast('Error al procesar la transacción', 'danger');
    }
  }

  // Métodos auxiliares para la UI
  getColorBoton(): string {
    switch (this.tipoTransaccion) {
      case 'giro': return 'tertiary';
      case 'deposito': return 'success';
      case 'pago': return 'warning';
      default: return 'primary';
    }
  }

  getIconoBoton(): string {
    switch (this.tipoTransaccion) {
      case 'giro': return 'arrow-up-circle-outline';
      case 'deposito': return 'arrow-down-circle-outline';
      case 'pago': return 'card-outline';
      default: return 'cash-outline';
    }
  }

  getTextoBoton(): string {
    switch (this.tipoTransaccion) {
      case 'giro': return 'Registrar Giro';
      case 'deposito': return 'Registrar Depósito';
      case 'pago': return 'Registrar Pago/Recarga';
      default: return 'Procesar';
    }
  }

  getIconoTransaccion(tipo: string): string {
    switch (tipo) {
      case 'giro': return 'arrow-up-circle';
      case 'deposito': return 'arrow-down-circle';
      case 'pago': return 'card';
      default: return 'cash';
    }
  }

  getColorTransaccion(tipo: string): string {
    switch (tipo) {
      case 'giro': return 'tertiary';
      case 'deposito': return 'success';
      case 'pago': return 'warning';
      default: return 'medium';
    }
  }

  getTituloTransaccion(trans: CajaVecina): string {
    switch (trans.tipo_trans) {
      case 'giro': return 'Giro';
      case 'deposito': return 'Depósito';
      case 'pago': return 'Pago/Recarga';
      default: return 'Transacción';
    }
  }

  getSignoMonto(trans: CajaVecina): string {
    if (trans.tipo_trans === 'giro') {
      return '+'; // Se suma a caja vecina
    } else if (trans.tipo_trans === 'deposito' ||
              (trans.tipo_trans === 'pago' && trans.metodo_pago === 'efectivo')) {
      return '-'; // Se resta de caja vecina
    }
    return '';
  }

  getColorMonto(trans: CajaVecina): string {
    if (trans.tipo_trans === 'giro') {
      return 'success';
    } else if (trans.tipo_trans === 'deposito' ||
              (trans.tipo_trans === 'pago' && trans.metodo_pago === 'efectivo')) {
      return 'danger';
    }
    return 'medium';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  async presentToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}
