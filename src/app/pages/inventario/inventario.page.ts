import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subscription, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { FirestoreService, ProductoConProveedor } from 'src/app/services/firestore.service';
import { ModalController } from '@ionic/angular';
import { EditarProductoComponent } from 'src/app/components/editar-producto/editar-producto.component';
import { AuthService } from 'src/app/services/auth.service';
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
   userRole: string | null = null;
  userName: string | null = null;
  error: string | null = null;

  // Variables para búsqueda y filtrado
  terminoBusqueda: string = '';
  filtroSeleccionado: string = 'todos';
  private terminoBusqueda$ = new BehaviorSubject<string>('');
  private filtroSeleccionado$ = new BehaviorSubject<string>('todos');

  constructor(private firestoreService: FirestoreService,
      private modalController: ModalController
  ) {}

  ngOnInit() {
    console.log('Inicializando página de inventario');
    this.cargarInventario();
    this.setupFiltrado();
    this.userName = localStorage.getItem('userName');
    this.userRole = localStorage.getItem('userRole');
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

  async abrirModalEditar(producto: ProductoConProveedor) {
  const modal = await this.modalController.create({
    component: EditarProductoComponent,
    componentProps: { producto }
  });

modal.onDidDismiss().then(({ data }) => {
  if (data && data.actualizado) {
    this.firestoreService.actualizarProducto(data.producto).then(() => {
      this.cargarInventario(); // Esto asegura que veas el cambio reflejado
    });
  }
});


  await modal.present();
}

async eliminarProducto(producto: ProductoConProveedor) {
  if (confirm(`¿Estás seguro de eliminar el producto "${producto.nombre}"?`)) {
    try {
      await this.firestoreService.eliminarProducto(producto.id);
      console.log('Producto eliminado correctamente');
      // Opcional: Aquí podrías actualizar la lista local si usas algún array local
      // Pero como usas observables con Firestore, la lista debería actualizarse automáticamente
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      alert('No se pudo eliminar el producto. Intenta nuevamente.');
    }
  }
}


  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
