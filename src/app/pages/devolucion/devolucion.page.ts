import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { AlertController, ToastController, NavController } from '@ionic/angular';
import { FirestoreService } from '../../services/firestore.service';
import { AuthService } from '../../services/auth.service';
import { Boleta } from '../../models/venta.models';
import { Devolucion } from '../../models/devolucion.models';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-devolucion',
  templateUrl: './devolucion.page.html',
  styleUrls: ['./devolucion.page.scss'],
  standalone: false
})
export class DevolucionPage implements OnInit, OnDestroy {
  @ViewChild('folioInput') folioInput!: ElementRef;

  // Variables para la búsqueda
  folioVenta: number | null = null;
  ventaEncontrada: Boleta | null = null;
  busquedaRealizada: boolean = false;
  buscandoVenta: boolean = false;
  devolucionExistente: boolean = false;

  // Variables para la devolución
  montoDevolucion: number | null = null;
  descripcionDevolucion: string = '';
  cajero: string = '';

  // Variables para historial
  historialDevoluciones: Devolucion[] = [];
  aperturaActual: any = null;

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
    this.obtenerCajeroLogueado();
    this.cargarHistorialDelDia();
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
      // Enfocar el input de folio después de establecer el cajero
      setTimeout(() => {
        if (this.folioInput && this.folioInput.nativeElement) {
          this.folioInput.nativeElement.focus();
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
            if (this.folioInput && this.folioInput.nativeElement) {
              this.folioInput.nativeElement.focus();
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
                if (this.folioInput && this.folioInput.nativeElement) {
                  this.folioInput.nativeElement.focus();
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

  async cargarHistorialDelDia() {
    try {
      // Obtener la apertura de caja activa
      const aperturasAbiertas = await this.firestoreService.getAperturasAbiertas()
        .pipe(take(1))
        .toPromise();

      if (aperturasAbiertas && aperturasAbiertas.length > 0) {
        this.aperturaActual = aperturasAbiertas[0];

        // Obtener devoluciones desde la apertura
        const devolucionesHoy = await this.firestoreService.getDevolucionesDesde(this.aperturaActual.fecha)
          .pipe(take(1))
          .toPromise();

        if (devolucionesHoy) {
          // Ordenar por fecha descendente (más recientes primero)
          this.historialDevoluciones = devolucionesHoy.sort((a, b) => {
            const fechaA = a.fecha instanceof Date ? a.fecha : new Date(a.fecha);
            const fechaB = b.fecha instanceof Date ? b.fecha : new Date(b.fecha);
            return fechaB.getTime() - fechaA.getTime();
          });
        }
      }
    } catch (error) {
      console.error('Error al cargar historial de devoluciones:', error);
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
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  async buscarVenta() {
    if (!this.folioVenta) {
      this.presentToast('Debe ingresar un número de folio');
      return;
    }

    this.buscandoVenta = true;
    this.busquedaRealizada = false;
    this.ventaEncontrada = null;
    this.devolucionExistente = false;

    console.log('Buscando venta con folio:', this.folioVenta);

    try {
      // Simular un pequeño delay para mejor UX
      await new Promise(resolve => setTimeout(resolve, 800));

      const venta = await this.firestoreService.getVentaPorFolio(this.folioVenta)
        .pipe(take(1))
        .toPromise();

      if (venta) {
        // Verificar si ya existe una devolución para este folio
        const existeDevolucion = await this.firestoreService.verificarDevolucionExistente(this.folioVenta)
          .pipe(take(1))
          .toPromise();

        if (existeDevolucion) {
          this.devolucionExistente = true;
          this.ventaEncontrada = venta; // Mostramos la venta pero no permitimos devolución
          this.presentToast(`Ya existe una devolución para el folio ${this.folioVenta}`);
        } else {
          this.ventaEncontrada = venta;
          this.devolucionExistente = false;
          console.log('Venta encontrada:', venta);
          this.presentToast(`Venta encontrada. Total: ${venta.total}`);

          // Limpiar campos de devolución
          this.montoDevolucion = null;
          this.descripcionDevolucion = '';
        }

      } else {
        this.ventaEncontrada = null;
        console.log('No se encontró venta con folio:', this.folioVenta);
      }
    } catch (error) {
      console.error('Error al buscar venta:', error);
      this.buscandoVenta = false;
      this.busquedaRealizada = true;
      this.presentToast('Error al buscar la venta');
    }
    this.buscandoVenta = false;
    this.busquedaRealizada = true;
  }

  async confirmarDevolucion() {
    if (!this.ventaEncontrada || !this.montoDevolucion || !this.descripcionDevolucion) {
      this.presentToast('Debe completar todos los campos');
      return;
    }

    if (this.montoDevolucion <= 0 || this.montoDevolucion > this.ventaEncontrada.total) {
      this.presentToast(`El monto debe ser mayor a 0 y menor o igual a $${this.ventaEncontrada.total}`);
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirmar Devolución',
      message: `¿Está seguro de procesar la devolución de $${this.montoDevolucion} para el folio ${this.ventaEncontrada.folio}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Confirmar',
          handler: () => {
            this.procesarDevolucion();
          }
        }
      ]
    });

    await alert.present();
  }

  async procesarDevolucion() {
    try {
      if (!this.ventaEncontrada || !this.montoDevolucion || !this.descripcionDevolucion) {
        return;
      }

      const devolucion: Devolucion = {
        id: '', // Se asignará automáticamente por Firestore
        folio: this.ventaEncontrada.folio,
        fecha: new Date(),
        monto: this.montoDevolucion,
        descripcion: this.descripcionDevolucion.trim(),
        cajero: this.cajero
      };

      console.log('Procesando devolución:', devolucion);

      // Guardar la devolución
      const devolucionId = await this.firestoreService.guardarDevolucion(devolucion);
      console.log('Devolución guardada con ID:', devolucionId);

      // Mostrar toast de éxito
      this.presentToast('Devolución procesada correctamente');

      // Limpiar formulario
      this.limpiarFormulario();

      // Recargar historial
      this.cargarHistorialDelDia();

    } catch (error) {
      console.error('Error al procesar devolución:', error);
      this.presentToast('Error al procesar la devolución');
    }
  }

  limpiarFormulario() {
    this.folioVenta = null;
    this.ventaEncontrada = null;
    this.busquedaRealizada = false;
    this.buscandoVenta = false;
    this.devolucionExistente = false;
    this.montoDevolucion = null;
    this.descripcionDevolucion = '';

    setTimeout(() => {
      if (this.folioInput && this.folioInput.nativeElement) {
        this.folioInput.nativeElement.focus();
      }
    }, 100);
  }

  // Métodos para validación de monto
  mostrarErrorMonto(): boolean {
    return this.montoDevolucion !== null &&
           (this.montoDevolucion <= 0 ||
            (this.ventaEncontrada && this.montoDevolucion > this.ventaEncontrada.total)) || false;
  }

  getMensajeErrorMonto(): string {
    if (!this.montoDevolucion || this.montoDevolucion <= 0) {
      return 'El monto debe ser mayor a $0';
    }
    if (this.ventaEncontrada && this.montoDevolucion > this.ventaEncontrada.total) {
      return `El monto no puede ser mayor al total de la venta (${this.ventaEncontrada.total})`;
    }
    return '';
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
