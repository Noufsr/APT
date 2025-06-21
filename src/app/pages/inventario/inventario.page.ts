import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Subscription } from 'rxjs';
import { FirestoreService, ProductoConProveedor, ResultadoPaginado } from 'src/app/services/firestore.service';
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
  productos: ProductoConProveedor[] = [];
  productosFiltrados: ProductoConProveedor[] = [];
  productosPaginados: ProductoConProveedor[] = [];

  private subscription?: Subscription;
  userRole: string | null = null;
  userName: string | null = null;
  error: string | null = null;

  // Variables para búsqueda y filtrado
  terminoBusqueda: string = '';
  filtroSeleccionado: string = 'todos';

  // Variables para paginación
  paginaActual: number = 1;
  productosPorPagina: number = 20;
  totalPaginas: number = 1;
  esPantallaMovil: boolean = false;

  // Variables para control de paginación con Firestore
  ultimoDocumento: any = null;
  hayMasPaginas: boolean = false;
  cargando: boolean = false;

  constructor(
    private firestoreService: FirestoreService,
    private modalController: ModalController
  ) {
    this.verificarTamañoPantalla();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.verificarTamañoPantalla();
  }

  verificarTamañoPantalla() {
    this.esPantallaMovil = window.innerWidth < 768;
    this.productosPorPagina = this.esPantallaMovil ? 10 : 20;
    this.actualizarPaginacion();
  }

  ngOnInit() {
    this.cargarInventarioCompleto();
    this.userName = localStorage.getItem('userName');
    this.userRole = localStorage.getItem('userRole');
  }

  cargarInventarioCompleto() {
    this.cargando = true;
    try {
      this.subscription = this.firestoreService.getInventarioConProveedor().subscribe(
        productos => {
          console.log('Datos de inventario cargados:', productos.length);
          this.productos = productos;
          this.aplicarFiltrosYOrdenamiento();
          this.cargando = false;
        },
        error => {
          console.error('Error al cargar inventario:', error);
          this.error = error.message || 'Error al cargar datos';
          this.cargando = false;
        }
      );
    } catch (error: any) {
      console.error('Error en cargarInventario:', error);
      this.error = error.message || 'Error al inicializar la carga de datos';
      this.cargando = false;
    }
  }

  aplicarFiltrosYOrdenamiento() {
    // Aplicar filtro de búsqueda
    let productosFiltrados = this.productos;

    if (this.terminoBusqueda.trim()) {
      const terminoLower = this.terminoBusqueda.toLowerCase();

      productosFiltrados = this.productos.filter(producto => {
        if (this.filtroSeleccionado === 'todos') {
          return producto.cad?.toString().toLowerCase().includes(terminoLower) ||
                 producto.cod_barras?.toString().toLowerCase().includes(terminoLower) ||
                 producto.nombre?.toLowerCase().includes(terminoLower) ||
                 producto.marca?.toLowerCase().includes(terminoLower) ||
                 producto.nombreProveedor?.toLowerCase().includes(terminoLower);
        } else if (this.filtroSeleccionado === 'cad') {
          return producto.cad?.toString().toLowerCase().includes(terminoLower);
        } else if (this.filtroSeleccionado === 'cod_barras') {
          return producto.cod_barras?.toString().toLowerCase().includes(terminoLower);
        } else if (this.filtroSeleccionado === 'nombre') {
          return producto.nombre?.toLowerCase().includes(terminoLower);
        } else if (this.filtroSeleccionado === 'marca') {
          return producto.marca?.toLowerCase().includes(terminoLower);
        } else if (this.filtroSeleccionado === 'proveedor') {
          return producto.nombreProveedor?.toLowerCase().includes(terminoLower);
        }
        return true;
      });
    }

    // Ordenar productos
    if (this.terminoBusqueda.trim()) {
      // Si hay búsqueda: primero stock crítico, luego por CAD
      productosFiltrados.sort((a, b) => {
        const aEsCritico = this.esStockCritico(a);
        const bEsCritico = this.esStockCritico(b);

        if (aEsCritico && !bEsCritico) return -1;
        if (!aEsCritico && bEsCritico) return 1;

        return (a.cad || 0) - (b.cad || 0);
      });
    } else {
      // Si no hay búsqueda: solo ordenar por CAD
      productosFiltrados.sort((a, b) => (a.cad || 0) - (b.cad || 0));
    }

    this.productosFiltrados = productosFiltrados;
    this.actualizarPaginacion();
  }

  actualizarPaginacion() {
    this.totalPaginas = Math.ceil(this.productosFiltrados.length / this.productosPorPagina);

    // Asegurar que la página actual sea válida
    if (this.paginaActual > this.totalPaginas) {
      this.paginaActual = 1;
    }

    // Calcular índices para la paginación
    const inicio = (this.paginaActual - 1) * this.productosPorPagina;
    const fin = inicio + this.productosPorPagina;

    // Obtener productos de la página actual
    this.productosPaginados = this.productosFiltrados.slice(inicio, fin);
  }

  buscar() {
    this.paginaActual = 1; // Resetear a primera página al buscar
    this.aplicarFiltrosYOrdenamiento();
  }

  cambiarPagina(direccion: number) {
    const nuevaPagina = this.paginaActual + direccion;

    if (nuevaPagina >= 1 && nuevaPagina <= this.totalPaginas) {
      this.paginaActual = nuevaPagina;
      this.actualizarPaginacion();

      // Scroll al inicio de la página
      const content = document.querySelector('ion-content');
      if (content) {
        content.scrollToTop(300);
      }
    }
  }

  irAPagina(pagina: number) {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
      this.actualizarPaginacion();

      // Scroll al inicio de la página
      const content = document.querySelector('ion-content');
      if (content) {
        content.scrollToTop(300);
      }
    }
  }

  esStockCritico(producto: ProductoConProveedor): boolean {
    return producto.aviso_stock > 0 && producto.stock <= producto.aviso_stock;
  }

  async abrirModalEditar(producto: ProductoConProveedor) {
    const modal = await this.modalController.create({
      component: EditarProductoComponent,
      componentProps: { producto }
    });

    modal.onDidDismiss().then(({ data }) => {
      if (data && data.actualizado) {
        this.firestoreService.actualizarProducto(data.producto).then(() => {
          this.cargarInventarioCompleto();
        });
      }
    });

    await modal.present();
  }

  async eliminarProducto(producto: ProductoConProveedor) {
    if (confirm(`¿Estás seguro de eliminar el producto "${producto.nombre}"?`)) {
      try {
        await this.firestoreService.eliminarProducto(producto.id);
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
