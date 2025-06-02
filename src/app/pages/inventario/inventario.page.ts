import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subscription, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { FirestoreService, ProductoConProveedor } from 'src/app/services/firestore.service';

@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.page.html',
  styleUrls: ['./inventario.page.scss'],
  standalone: false
})
export class InventarioPage implements OnInit, OnDestroy {
  inventario$!: Observable<ProductoConProveedor[]>;
  inventarioFiltrado$!: Observable<ProductoConProveedor[]>;
  private subscription?: Subscription;
  error: string | null = null;

  // Variables para búsqueda y filtrado
  terminoBusqueda: string = '';
  filtroSeleccionado: string = 'todos';
  private terminoBusqueda$ = new BehaviorSubject<string>('');
  private filtroSeleccionado$ = new BehaviorSubject<string>('todos');

  constructor(private firestoreService: FirestoreService) {}

  ngOnInit() {
    console.log('Inicializando página de inventario');
    this.cargarInventario();
    this.setupFiltrado();
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

  setupFiltrado() {
    // Combinar el observable de inventario con los filtros
    this.inventarioFiltrado$ = combineLatest([
      this.inventario$,
      this.terminoBusqueda$,
      this.filtroSeleccionado$
    ]).pipe(
      map(([productos, termino, filtro]) => {
        if (!termino.trim()) {
          return productos;
        }

        const terminoLower = termino.toLowerCase();

        return productos.filter(producto => {
          if (filtro === 'todos') {
            return producto.cad?.toString().toLowerCase().includes(terminoLower) ||
                   producto.cod_barras?.toString().toLowerCase().includes(terminoLower) ||
                   producto.nombre?.toLowerCase().includes(terminoLower) ||
                   producto.marca?.toLowerCase().includes(terminoLower) ||
                   producto.nombreProveedor?.toLowerCase().includes(terminoLower);
          } else if (filtro === 'cad') {
            return producto.cad?.toString().toLowerCase().includes(terminoLower);
          } else if (filtro === 'cod_barras') {
            return producto.cod_barras?.toString().toLowerCase().includes(terminoLower);
          } else if (filtro === 'nombre') {
            return producto.nombre?.toLowerCase().includes(terminoLower);
          } else if (filtro === 'marca') {
            return producto.marca?.toLowerCase().includes(terminoLower);
          } else if (filtro === 'proveedor') {
            return producto.nombreProveedor?.toLowerCase().includes(terminoLower);
          }
          return true;
        });
      })
    );
  }

  buscar() {
    this.terminoBusqueda$.next(this.terminoBusqueda);
    this.filtroSeleccionado$.next(this.filtroSeleccionado);
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
