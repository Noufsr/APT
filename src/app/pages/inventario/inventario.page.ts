import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { FirestoreService, ProductoConProveedor } from 'src/app/services/firestore.service';

@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.page.html',
  styleUrls: ['./inventario.page.scss'],
  standalone: false
})
export class InventarioPage implements OnInit, OnDestroy {
  inventario$!: Observable<ProductoConProveedor[]>;
  private subscription?: Subscription;
  error: string | null = null;

  constructor(private firestoreService: FirestoreService) {}

  ngOnInit() {
    console.log('Inicializando página de inventario');
    this.cargarInventario();
  }

  cargarInventario() {
    try {
      this.inventario$ = this.firestoreService.getInventarioConProveedor();

      // Opcional: Para depuración
      this.subscription = this.inventario$.subscribe(
        productos => {
          console.log('Datos de inventario cargados:', productos.length);
        },
        error => {
          console.error('Error al cargar inventario:', error);
          this.error = error.message || 'Error al cargar datos';
        }
      );
    } catch (error: any) {
      console.error('Error en cargarInventario:', error);
      this.error = error.message || 'Error al inicializar la carga de datos';
    }
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
