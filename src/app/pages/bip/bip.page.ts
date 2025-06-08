import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { FirestoreService } from '../../services/firestore.service';
import { Bip } from '../../models/bip.models';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-bip',
  templateUrl: './bip.page.html',
  styleUrls: ['./bip.page.scss'],
  standalone: false
})
export class BipPage implements OnInit {
  tipoOperacion: 'recarga' | 'deposito' = 'recarga';
  monto: number | null = null;
  saldoBipActual: number = 0;
  efectivoActual: number = 0;
  saldoCajaVecinaActual: number = 0;
  historialBip: Bip[] = [];
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
      // Obtener la apertura de caja activa
      const aperturasAbiertas = await this.firestoreService.getAperturasAbiertas()
        .pipe(take(1))
        .toPromise();

      if (aperturasAbiertas && aperturasAbiertas.length > 0) {
        this.aperturaActual = aperturasAbiertas[0];

        // Saldos iniciales de la apertura
        this.saldoBipActual = this.aperturaActual.saldoBip || 0;
        this.efectivoActual = this.aperturaActual.efectivo || 0;
        this.saldoCajaVecinaActual = this.aperturaActual.saldoCajaVecina || 0;

        // Obtener todas las operaciones BIP del día
        const operacionesHoy = await this.firestoreService.getBipDesde(this.aperturaActual.fecha)
          .pipe(take(1))
          .toPromise();

        if (operacionesHoy) {
          // Calcular el saldo actual considerando las operaciones del día
          operacionesHoy.forEach(op => {
            if (op.tipo === 'recarga') {
              this.saldoBipActual -= op.monto;
              this.efectivoActual += op.monto;
            } else if (op.tipo === 'deposito') {
              this.saldoBipActual += op.monto;
              this.saldoCajaVecinaActual -= op.monto;
            }
          });
        }

        // También considerar otros movimientos del día
        await this.actualizarSaldosConMovimientos();

      } else {
        this.presentToast('No hay apertura de caja activa', 'warning');
      }
    } catch (error) {
      console.error('Error al cargar saldo BIP:', error);
      this.presentToast('Error al cargar el saldo BIP', 'danger');
    }
  }

  async actualizarSaldosConMovimientos() {
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

      // Obtener transacciones de Caja Vecina
      const transaccionesCajaVecina = await this.firestoreService.getCajaVecinaDesde(this.aperturaActual.fecha)
        .pipe(take(1))
        .toPromise();

      if (transaccionesCajaVecina) {
        transaccionesCajaVecina.forEach(trans => {
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
    } catch (error) {
      console.error('Error actualizando saldos:', error);
    }
  }

  async cargarHistorialDelDia() {
    try {
      const aperturasAbiertas = await this.firestoreService.getAperturasAbiertas()
        .pipe(take(1))
        .toPromise();

      if (aperturasAbiertas && aperturasAbiertas.length > 0) {
        const aperturaActual = aperturasAbiertas[0];

        const operacionesHoy = await this.firestoreService.getBipDesde(aperturaActual.fecha)
          .pipe(take(1))
          .toPromise();

        if (operacionesHoy) {
          this.historialBip = operacionesHoy.sort((a, b) => {
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

  async procesarOperacion() {
    if (!this.monto || this.monto <= 0) {
      this.presentToast('Por favor ingrese un monto válido', 'warning');
      return;
    }

    // Validaciones según tipo de operación
    if (this.tipoOperacion === 'recarga') {
      if (this.monto > this.saldoBipActual) {
        this.presentToast('Saldo BIP insuficiente para realizar la recarga', 'danger');
        return;
      }
    } else if (this.tipoOperacion === 'deposito') {
      if (this.monto > this.saldoCajaVecinaActual) {
        this.presentToast('Saldo Caja Vecina insuficiente para realizar el depósito', 'danger');
        return;
      }
    }

    const mensaje = this.construirMensajeConfirmacion();

    const alert = await this.alertController.create({
      header: `Confirmar ${this.tipoOperacion === 'recarga' ? 'Recarga' : 'Depósito'}`,
      message: mensaje,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Confirmar',
          handler: () => {
            this.guardarOperacion();
          }
        }
      ]
    });

    await alert.present();
  }

  construirMensajeConfirmacion(): string {
    const montoFormateado = this.formatCurrency(this.monto!);

    if (this.tipoOperacion === 'recarga') {
      return `¿Confirmar recarga de ${montoFormateado}?`;
    } else {
      return `¿Confirmar depósito de ${montoFormateado}?`;
    }
  }

  async guardarOperacion() {
    try {
      const operacionBip: Bip = {
        id: '', // Se generará en Firestore
        fecha: new Date(),
        monto: this.monto!,
        tipo: this.tipoOperacion,
        cajero: this.cajero
      };

      await this.firestoreService.agregarBip(operacionBip);

      // Actualizar los saldos locales
      if (this.tipoOperacion === 'recarga') {
        this.saldoBipActual -= this.monto!;
        this.efectivoActual += this.monto!;
        this.presentToast(`Recarga de ${this.formatCurrency(this.monto!)} realizada exitosamente`, 'success');
      } else {
        this.saldoBipActual += this.monto!;
        this.saldoCajaVecinaActual -= this.monto!;
        this.presentToast(`Depósito de ${this.formatCurrency(this.monto!)} registrado exitosamente`, 'success');
      }

      // Limpiar el campo y recargar historial
      this.monto = null;
      this.cargarHistorialDelDia();

    } catch (error) {
      console.error('Error al guardar operación:', error);
      this.presentToast('Error al procesar la operación', 'danger');
    }
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
