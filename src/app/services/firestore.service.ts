import { Injectable, NgZone } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, switchMap, take, map } from 'rxjs/operators';
import { Producto } from '../models/producto.models';
import { Proveedor } from '../models/proveedor.models';
import { Pedido } from '../models/pedido.models';
import firebase from 'firebase/compat/app';
import { Boleta } from '../models/venta.models';
import { Devolucion } from '../models/devolucion.models';
import { User } from '../models/user.models';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore'; // <-- importante// Assuming User is defined in this file
import { AperturaCaja, CierreCaja } from '../models/caja.models';
import { Bip } from '../models/bip.models';
import { startAfter, limit, orderBy, where } from 'firebase/firestore';
import { CajaVecina } from '../models/cajavecina.models';

export interface ProductoConProveedor extends Producto {
  cad: any;
  nombreProveedor: string;
}

export interface PaginacionConfig {
  limite: number;
  ultimoDocumento?: any;
}

export interface ResultadoPaginado<T> {
  datos: T[];
  hayMas: boolean;
  ultimoDocumento?: any;
}

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private aperturaCajaCollection: AngularFirestoreCollection<AperturaCaja>;
  private cierreCajaCollection: AngularFirestoreCollection<CierreCaja>;
  private ProductoCollection: AngularFirestoreCollection<Producto>;
  private proveedoresCollection: AngularFirestoreCollection<Proveedor>;
  private pedidosCollection: AngularFirestoreCollection<Pedido>;
  private firestore: firebase.firestore.Firestore;
  private usersCollection: AngularFirestoreCollection<User>;
  private ventasCollection: AngularFirestoreCollection<Boleta>;
  private devolucionesCollection: AngularFirestoreCollection<Devolucion>;

  constructor(private afs: AngularFirestore, private zone: NgZone) {
    console.log('FirestoreService inicializado');
    this.ProductoCollection = this.afs.collection<Producto>('Producto');
    this.proveedoresCollection = this.afs.collection<Proveedor>('proveedores');
    this.pedidosCollection = this.afs.collection<Pedido>('pedidos');
    this.usersCollection = this.afs.collection<User>('users');
    this.ventasCollection = this.afs.collection<Boleta>('ventas');
    this.devolucionesCollection = this.afs.collection<Devolucion>('devoluciones');
    this.aperturaCajaCollection = this.afs.collection<AperturaCaja>('aperturas_caja');
    this.cierreCajaCollection = this.afs.collection<CierreCaja>('cierres_caja');
    this.firestore = firebase.firestore();
    this.firestore.enablePersistence()
  .then(() => {
    console.log('🔥 Persistencia offline activada');
  })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('⚠️ Persistencia no disponible: otra pestaña ya la está usando.');
    } else if (err.code === 'unimplemented') {
      console.warn('⚠️ Persistencia no soportada en este navegador.');
    } else {
      console.error('❌ Error activando persistencia:', err);
    }
  });

  }

  // Métodos para usuarios
  getUsers(): Observable<User[]> {
    return this.usersCollection.valueChanges({ idField: 'uid' });
  }

  updateUser(user: User): Promise<void> {
    if (!user.uid) {
      return Promise.reject('User ID missing');
    }

    // Usando firestore nativo en lugar de AngularFire para evitar problemas de inyección
    return this.firestore.collection('users').doc(user.uid).update({
      nombre: user.nombre,
      telefono: user.telefono,
      direccion: user.direccion,
      role: user.role,
      activo: user.activo
      // NO actualizar email aquí
    });
  }

  updateUserEmail(userId: string, newEmail: string): Promise<void> {
    // 1. Actualiza el email en Firebase Authentication
    return this.firestore.app.auth().currentUser!.updateEmail(newEmail)
      .then(() => {
        // 2. También actualiza el email en la colección de usuarios
        return this.firestore.collection('users').doc(userId).update({
          email: newEmail
        });
      });
    }

  // Métodos para productos
  getProductos(): Observable<Producto[]> {
    return this.ProductoCollection.valueChanges({ idField: 'id' });
  }

  guardarProducto(Producto: Producto): Promise<string> {
    if (Producto.id) {
      // Actualizar producto
      return this.ProductoCollection.doc(Producto.id.toString()).update(Producto)
        .then(() => Producto.id.toString());
    } else {
      // Crear nuevo producto
      return this.ProductoCollection.add(Producto)
        .then(docRef => docRef.id);
    }
  }

  // Métodos para proveedores
  getProveedores(): Observable<Proveedor[]> {
    return this.proveedoresCollection.valueChanges({ idField: 'id' });
  }

  guardarProveedor(proveedor: Proveedor): Promise<string> {
    if (proveedor.id) {
      // Actualizar proveedor existente
      return this.proveedoresCollection.doc(proveedor.id.toString()).update(proveedor)
        .then(() => proveedor.id.toString());
    } else {
      // Crear nuevo proveedor
      return this.proveedoresCollection.add(proveedor)
        .then(docRef => docRef.id);
    }
  }

  // Métodos para pedidos
  getPedidos(): Observable<Pedido[]> {
    return this.pedidosCollection.valueChanges({idField: 'id'});
  }

  guardarPedido(pedido: Pedido): Promise<string>{
    if (pedido.id) {
      // Actualizar pedido existente
      return this.firestore.collection('pedidos').doc(pedido.id).update(pedido)
        .then(() => pedido.id!.toString());
    } else {
      // Crear nuevo pedido
      return this.pedidosCollection.add(pedido)
        .then(docRef => docRef.id);
    }
  }

  // MÉTODO CORREGIDO: Evitamos completamente los problemas de inyección
  actualizarStockProducto(id: string, nuevoStock: number): Promise<void> {
    // Usamos la API de Firebase directamente para evitar problemas de inyección
    return this.firestore.collection('Producto').doc(id).update({
      stock: nuevoStock
    });
  }

  // Método para procesar el pedido completo (guardar pedido y actualizar stocks)
  async procesarPedido(pedido: Pedido, productosActuales: Producto[]): Promise<string> {
    try {
      // Guardar el pedido primero
      const pedidoId = await this.guardarPedido(pedido);
      console.log('Pedido guardado con ID:', pedidoId);

      // Ahora actualizamos el stock de los productos uno por uno
      for (const item of pedido.productos) {
        const producto = productosActuales.find(p => p.id === item.idProducto);
        if (producto) {
          const nuevoStock = producto.stock + item.cantidad;
          console.log(`Actualizando stock del producto ${producto.nombre} de ${producto.stock} a ${nuevoStock}`);

          try {
            await this.actualizarStockProducto(producto.id, nuevoStock);
            console.log(`Stock actualizado correctamente para ${producto.nombre}`);
          } catch (updateError) {
            console.error(`Error al actualizar stock para ${producto.nombre}:`, updateError);
            // Continuamos con el siguiente producto aunque falle la actualización
          }
        } else {
          console.warn(`Producto con código ${item.idProducto} no encontrado en la lista actual`);
        }
      }

      return pedidoId;
    } catch (error) {
      console.error('Error al procesar el pedido:', error);
      throw error;
    }
  }

  // Métodos para ventas
getVentas(): Observable<Boleta[]> {
  return this.ventasCollection.valueChanges({ idField: 'id' });
}

guardarVenta(venta: Boleta): Promise<string> {
  if (venta.id) {
    // Actualizar venta existente
    return this.ventasCollection.doc(venta.id).update(venta)
      .then(() => venta.id!.toString());
  } else {
    // Crear nueva venta
    return this.ventasCollection.add(venta)
      .then(docRef => docRef.id);
  }
}

// Método para procesar la venta completa (guardar venta y actualizar stocks)
async procesarVentaCompleta(venta: Boleta, productosActuales: Producto[]): Promise<string> {
  try {
    // Guardar la venta primero
    const ventaId = await this.guardarVenta(venta);
    console.log('Venta guardada con ID:', ventaId);

    // Ahora actualizamos el stock de los productos uno por uno
    for (const item of venta.productosVendidos) {
      const producto = productosActuales.find(p => p.id === item.idProducto);
      if (producto) {
        const nuevoStock = producto.stock - item.cantidad;
        console.log(`Actualizando stock del producto ${producto.nombre} de ${producto.stock} a ${nuevoStock}`);

        try {
          await this.actualizarStockProducto(producto.id, nuevoStock);
          console.log(`Stock actualizado correctamente para ${producto.nombre}`);
        } catch (updateError) {
          console.error(`Error al actualizar stock para ${producto.nombre}:`, updateError);
          // Continuamos con el siguiente producto aunque falle la actualización
        }
      } else {
        console.warn(`Producto con ID ${item.idProducto} no encontrado en la lista actual`);
      }
    }

    return ventaId;
  } catch (error) {
    console.error('Error al procesar la venta:', error);
    throw error;
  }
  }

  // Métodos para Apertura de Caja
getAperturasAbiertas(): Observable<AperturaCaja[]> {
  return new Observable(observer => {
    this.firestore.collection('aperturas_caja')
      .where('estado', '==', 'abierta')
      .get()
      .then(snapshot => {
        const aperturas: AperturaCaja[] = [];
        snapshot.forEach(doc => {
          aperturas.push({ id: doc.id, ...doc.data() } as AperturaCaja);
        });
        // Ordenar manualmente por fecha
        aperturas.sort((a, b) => {
          const fechaA = a.fecha instanceof Date ? a.fecha : new Date(a.fecha);
          const fechaB = b.fecha instanceof Date ? b.fecha : new Date(b.fecha);
          return fechaB.getTime() - fechaA.getTime();
        });
        // Tomar solo la primera (más reciente)
        observer.next(aperturas.slice(0, 1));
        observer.complete();
      })
      .catch(error => {
        console.error('Error obteniendo aperturas abiertas:', error);
        observer.next([]);
        observer.complete();
      });
  });
}

guardarAperturaCaja(apertura: AperturaCaja): Promise<string> {
  return this.aperturaCajaCollection.add(apertura)
    .then(docRef => docRef.id);
}

actualizarEstadoApertura(aperturaId: string, estado: 'abierta' | 'cerrada'): Promise<void> {
  return this.firestore.collection('aperturas_caja').doc(aperturaId).update({ estado });
}

// Métodos para Cierre de Caja
getUltimoCierre(): Observable<CierreCaja | null> {
  return new Observable(observer => {
    this.firestore.collection('cierres_caja')
      .orderBy('fecha', 'desc')
      .limit(1)
      .get()
      .then(snapshot => {
        if (snapshot.empty) {
          observer.next(null);
        } else {
          const doc = snapshot.docs[0];
          observer.next({ id: doc.id, ...doc.data() } as CierreCaja);
        }
        observer.complete();
      })
      .catch(error => {
        console.error('Error obteniendo último cierre:', error);
        observer.next(null);
        observer.complete();
      });
  });
}

guardarCierreCaja(cierre: CierreCaja): Promise<string> {
  return this.cierreCajaCollection.add(cierre)
    .then(docRef => docRef.id);
}

// Métodos para obtener pedidos y ventas por fecha
getPedidosDesde(fecha: Date): Observable<Pedido[]> {
  return new Observable(observer => {
    console.log('Buscando pedidos desde:', fecha);

    // Manejar diferentes tipos de fecha
    let fechaComparar: any;
    if (fecha instanceof Date) {
      fechaComparar = firebase.firestore.Timestamp.fromDate(fecha);
    } else if (fecha && typeof fecha === 'object' && 'toDate' in fecha) {
      // Ya es un Timestamp, usarlo directamente
      fechaComparar = fecha;
    } else {
      // Intentar convertir a Date
      fechaComparar = firebase.firestore.Timestamp.fromDate(new Date(fecha));
    }

    console.log('Fecha comparación (Timestamp):', fechaComparar);

    this.firestore.collection('pedidos')
      .get()
      .then(snapshot => {
        const pedidos: Pedido[] = [];
        snapshot.forEach(doc => {
          const data = doc.data() as any; // Usar any temporalmente para manejar el tipo
          const pedidoConId: Pedido = { ...data, id: doc.id };

          // Verificar si el pedido es posterior a la fecha de apertura
          let fechaPedido = data.fechaRecepcion;

          // Convertir la fecha del pedido para comparación
          if (fechaPedido && typeof fechaPedido === 'object' && 'toDate' in fechaPedido) {
            // Es un Timestamp
            const fechaPedidoDate = (fechaPedido as firebase.firestore.Timestamp).toDate();
            const fechaCompararDate = fechaComparar.toDate();

            if (fechaPedidoDate >= fechaCompararDate) {
              pedidos.push(pedidoConId);
              console.log('Pedido incluido:', pedidoConId.nombreProveedor, fechaPedidoDate);
            }
          } else if (fechaPedido instanceof Date) {
            // Es una Date
            const fechaCompararDate = fechaComparar.toDate();

            if (fechaPedido >= fechaCompararDate) {
              pedidos.push(pedidoConId);
              console.log('Pedido incluido:', pedidoConId.nombreProveedor, fechaPedido);
            }
          } else if (typeof fechaPedido === 'string') {
            // Es un string, convertir a Date
            const fechaPedidoDate = new Date(fechaPedido);
            const fechaCompararDate = fechaComparar.toDate();

            if (fechaPedidoDate >= fechaCompararDate) {
              pedidos.push(pedidoConId);
              console.log('Pedido incluido:', pedidoConId.nombreProveedor, fechaPedidoDate);
            }
          }
        });

        console.log('Total pedidos encontrados:', pedidos.length);
        observer.next(pedidos);
        observer.complete();
      })
      .catch(error => {
        console.error('Error obteniendo pedidos desde fecha:', error);
        observer.next([]);
        observer.complete();
      });
  });
}

getVentasDesde(fecha: Date): Observable<Boleta[]> {
  return new Observable(observer => {
    // Manejar diferentes tipos de fecha
    let fechaComparar: any;
    if (fecha instanceof Date) {
      fechaComparar = firebase.firestore.Timestamp.fromDate(fecha);
    } else if (fecha && typeof fecha === 'object' && 'toDate' in fecha) {
      // Ya es un Timestamp
      fechaComparar = fecha;
    } else {
      // Intentar convertir a Date
      fechaComparar = firebase.firestore.Timestamp.fromDate(new Date(fecha));
    }

    this.firestore.collection('ventas')
      .where('fecha', '>=', fechaComparar)
      .get()
      .then(snapshot => {
        const ventas: Boleta[] = [];
        snapshot.forEach(doc => {
          const data = doc.data() as Boleta;
          ventas.push({ ...data, id: doc.id });
        });
        observer.next(ventas);
        observer.complete();
      })
      .catch(error => {
        console.error('Error obteniendo ventas desde fecha:', error);
        observer.next([]);
        observer.complete();
      });
  });
}

// Métodos para BIP
agregarBip(bip: Bip): Promise<string> {
  return this.firestore.collection('bip').add(bip).then(docRef => docRef.id);
}

getBipDesde(fecha: Date): Observable<Bip[]> {
  return new Observable(observer => {
    // Manejar diferentes tipos de fecha
    let fechaComparar: any;
    if (fecha instanceof Date) {
      fechaComparar = firebase.firestore.Timestamp.fromDate(fecha);
    } else if (fecha && typeof fecha === 'object' && 'toDate' in fecha) {
      // Ya es un Timestamp
      fechaComparar = fecha;
    } else {
      // Intentar convertir a Date
      fechaComparar = firebase.firestore.Timestamp.fromDate(new Date(fecha));
    }

    this.firestore.collection('bip')
      .where('fecha', '>=', fechaComparar)
      .get()
      .then(snapshot => {
        const operaciones: Bip[] = [];
        snapshot.forEach(doc => {
          const data = doc.data() as Bip;
          operaciones.push({ ...data, id: doc.id });
        });
        observer.next(operaciones);
        observer.complete();
      })
      .catch(error => {
        console.error('Error obteniendo operaciones BIP:', error);
        observer.next([]);
        observer.complete();
      });
  });
}

// Métodos para Caja Vecina
agregarCajaVecina(transaccion: CajaVecina): Promise<string> {
  return this.firestore.collection('caja_vecina').add(transaccion).then(docRef => docRef.id);
}

getCajaVecinaDesde(fecha: Date): Observable<CajaVecina[]> {
  return new Observable(observer => {
    // Manejar diferentes tipos de fecha
    let fechaComparar: any;
    if (fecha instanceof Date) {
      fechaComparar = firebase.firestore.Timestamp.fromDate(fecha);
    } else if (fecha && typeof fecha === 'object' && 'toDate' in fecha) {
      // Ya es un Timestamp
      fechaComparar = fecha;
    } else {
      // Intentar convertir a Date
      fechaComparar = firebase.firestore.Timestamp.fromDate(new Date(fecha));
    }

    this.firestore.collection('caja_vecina')
      .where('fecha', '>=', fechaComparar)
      .get()
      .then(snapshot => {
        const transacciones: CajaVecina[] = [];
        snapshot.forEach(doc => {
          const data = doc.data() as CajaVecina;
          transacciones.push({ ...data, id: doc.id });
        });
        observer.next(transacciones);
        observer.complete();
      })
      .catch(error => {
        console.error('Error obteniendo transacciones Caja Vecina:', error);
        observer.next([]);
        observer.complete();
      });
  });
}

  //Métodos para inventario
  getInventarioConProveedor(): Observable<ProductoConProveedor[]> {
    console.log('Obteniendo inventario con proveedores');

    return this.ProductoCollection.valueChanges({ idField: 'id' }).pipe(
      switchMap(Producto => {
        console.log('Productos cargados:', Producto.length);

        if (Producto.length === 0) {
          return of([]);
        }

        const observables = Producto.map(Producto => {
          if (Producto.idproveedor) {
            const proveedorId = String(Producto.idproveedor);

            return new Observable<ProductoConProveedor>(observer => {
              this.firestore.collection('proveedores').doc(proveedorId).get()
                .then(doc => {
                  this.zone.run(() => {
                    if (doc.exists) {
                      const proveedor = doc.data() as Proveedor;
                      observer.next({
                        ...Producto,
                        nombreProveedor: proveedor.nombreProveedor || 'Sin nombre'
                      });
                    } else {
                      observer.next({
                        ...Producto,
                        nombreProveedor: 'Proveedor no encontrado'
                      });
                    }
                    observer.complete();
                  });
                })
                .catch(error => {
                  console.error('Error al obtener proveedor:', error);
                  this.zone.run(() => {
                    observer.next({
                      ...Producto,
                      nombreProveedor: 'Error al cargar proveedor'
                    });
                    observer.complete();
                  });
                });
            }).pipe(take(1));
          } else {
            return of({
              ...Producto,
              nombreProveedor: 'Sin proveedor'
            });
          }
        });

        return forkJoin(observables);
      }),
      catchError(error => {
        console.error('Error al cargar productos:', error);
        return of([]);
      })
    );
  }

  getInventarioPaginado(config: PaginacionConfig, terminoBusqueda?: string): Observable<ResultadoPaginado<ProductoConProveedor>> {
    return new Observable(observer => {
      let query: any = this.firestore.collection('Producto');

      // Siempre ordenar por CAD
      query = query.orderBy('cad', 'asc');

      // Si hay un último documento, empezar después de él
      if (config.ultimoDocumento) {
        query = query.startAfter(config.ultimoDocumento);
      }

      // Limitar resultados + 1 para saber si hay más
      query = query.limit(config.limite + 1);

      query.get().then((snapshot: any) => {
        const productos: Producto[] = [];
        const docs = snapshot.docs;

        // Verificar si hay más páginas
        const hayMas = docs.length > config.limite;
        const ultimoDoc = docs[Math.min(docs.length - 1, config.limite - 1)];

        // Tomar solo el límite de documentos
        const docsToProcess = docs.slice(0, config.limite);

        docsToProcess.forEach((doc: any) => {
          productos.push({ ...doc.data(), id: doc.id } as Producto);
        });

        // Obtener información de proveedores
        const observables = productos.map(producto => {
          if (producto.idproveedor) {
            const proveedorId = String(producto.idproveedor);
            return new Observable<ProductoConProveedor>(obs => {
              this.firestore.collection('proveedores').doc(proveedorId).get()
                .then(doc => {
                  if (doc.exists) {
                    const proveedor = doc.data() as Proveedor;
                    obs.next({
                      ...producto,
                      nombreProveedor: proveedor.nombreProveedor || 'Sin nombre'
                    });
                  } else {
                    obs.next({
                      ...producto,
                      nombreProveedor: 'Proveedor no encontrado'
                    });
                  }
                  obs.complete();
                })
                .catch(() => {
                  obs.next({
                    ...producto,
                    nombreProveedor: 'Error al cargar proveedor'
                  });
                  obs.complete();
                });
            });
          } else {
            return of({
              ...producto,
              nombreProveedor: 'Sin proveedor'
            });
          }
        });

        forkJoin(observables).subscribe(productosConProveedor => {
          // Si hay búsqueda, filtrar y reordenar
          let productosFiltrados = productosConProveedor;

          if (terminoBusqueda && terminoBusqueda.trim()) {
            const termino = terminoBusqueda.toLowerCase();
            productosFiltrados = productosConProveedor.filter(p =>
              p.cad?.toString().includes(termino) ||
              p.cod_barras?.toString().includes(termino) ||
              p.nombre?.toLowerCase().includes(termino) ||
              p.marca?.toLowerCase().includes(termino) ||
              p.nombreProveedor?.toLowerCase().includes(termino)
            );
          }

          // Ordenar: primero productos con stock crítico, luego por CAD
          productosFiltrados.sort((a, b) => {
            const aEsCritico = a.aviso_stock && a.stock <= a.aviso_stock;
            const bEsCritico = b.aviso_stock && b.stock <= b.aviso_stock;

            if (aEsCritico && !bEsCritico) return -1;
            if (!aEsCritico && bEsCritico) return 1;

            // Si ambos son críticos o ninguno lo es, ordenar por CAD
            return (a.cad || 0) - (b.cad || 0);
          });

          observer.next({
            datos: productosFiltrados,
            hayMas: hayMas,
            ultimoDocumento: ultimoDoc
          });
          observer.complete();
        });
      }).catch((error: any) => {
        console.error('Error al obtener inventario paginado:', error);
        observer.error(error);
      });
    });
  }

  // Método auxiliar para determinar si un producto tiene stock crítico
  esStockCritico(producto: Producto): boolean {
    return producto.aviso_stock > 0 && producto.stock <= producto.aviso_stock;
  }


async eliminarProducto(productoId: string): Promise<void> {

  const docRef = doc(this.firestore, `Producto/${productoId}`)
  console.log('ID del producto a eliminar:', productoId);
;
  return deleteDoc(docRef);
}
  async actualizarProducto(producto: Producto): Promise<void> {
    const docRef = doc(this.firestore, `Producto/${producto.id}`);
    return updateDoc(docRef, { ...producto });
  }

  // Métodos para devoluciones
  getDevoluciones(): Observable<Devolucion[]> {
    return this.devolucionesCollection.valueChanges({ idField: 'id' });
  }

  guardarDevolucion(devolucion: Devolucion): Promise<string> {
    if (devolucion.id) {
      // Actualizar devolución existente
      return this.devolucionesCollection.doc(devolucion.id).update(devolucion)
        .then(() => devolucion.id!.toString());
    } else {
      // Crear nueva devolución
      return this.devolucionesCollection.add(devolucion)
        .then(docRef => docRef.id);
    }
  }

  getDevolucionesDesde(fecha: Date): Observable<Devolucion[]> {
    return new Observable(observer => {
      // Manejar diferentes tipos de fecha
      let fechaComparar: any;
      if (fecha instanceof Date) {
        fechaComparar = firebase.firestore.Timestamp.fromDate(fecha);
      } else if (fecha && typeof fecha === 'object' && 'toDate' in fecha) {
        // Ya es un Timestamp
        fechaComparar = fecha;
      } else {
        // Intentar convertir a Date
        fechaComparar = firebase.firestore.Timestamp.fromDate(new Date(fecha));
      }

      this.firestore.collection('devoluciones')
        .where('fecha', '>=', fechaComparar)
        .get()
        .then(snapshot => {
          const devoluciones: Devolucion[] = [];
          snapshot.forEach(doc => {
            const data = doc.data() as Devolucion;
            devoluciones.push({ ...data, id: doc.id });
          });
          observer.next(devoluciones);
          observer.complete();
        })
        .catch(error => {
          console.error('Error obteniendo devoluciones desde fecha:', error);
          observer.next([]);
          observer.complete();
        });
    });
  }

  // Método para buscar venta por folio
  getVentaPorFolio(folio: number): Observable<Boleta | null> {
    return new Observable(observer => {
      this.firestore.collection('ventas')
        .where('folio', '==', folio)
        .get()
        .then(snapshot => {
          if (snapshot.empty) {
            observer.next(null);
          } else {
            const doc = snapshot.docs[0];
            const data = doc.data() as Boleta;
            observer.next({ ...data, id: doc.id });
          }
          observer.complete();
        })
        .catch(error => {
          console.error('Error buscando venta por folio:', error);
          observer.next(null);
          observer.complete();
        });
    });
  }

  // Método para verificar si ya existe una devolución para un folio
  verificarDevolucionExistente(folio: number): Observable<boolean> {
    return new Observable(observer => {
      this.firestore.collection('devoluciones')
        .where('folio', '==', folio)
        .get()
        .then(snapshot => {
          observer.next(!snapshot.empty);
          observer.complete();
        })
        .catch(error => {
          console.error('Error verificando devolución existente:', error);
          observer.next(false);
          observer.complete();
        });
    });
  }

  async verificarAperturaAbiertaHoy(): Promise<boolean> {
  const hoy = new Date();
  // Establecer inicio y fin del día
  const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0);
  const finDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59);

  const snapshot = await this.aperturaCajaCollection.ref
    .where('estado', '==', 'abierta')
    .where('fecha', '>=', inicioDia)
    .where('fecha', '<=', finDia)
    .get();

  return !snapshot.empty; // true si hay alguna apertura abierta hoy
}

//Metodos para reportes
  getCierresEnRango(fechaInicio: Date, fechaFin: Date): Observable<CierreCaja[]> {
  return new Observable(observer => {
    const inicioTimestamp = firebase.firestore.Timestamp.fromDate(fechaInicio);
    const finTimestamp = firebase.firestore.Timestamp.fromDate(fechaFin);

    this.firestore.collection('cierres_caja')
      .where('fecha', '>=', inicioTimestamp)
      .where('fecha', '<=', finTimestamp)
      .orderBy('fecha', 'asc')
      .get()
      .then(snapshot => {
        const cierres: CierreCaja[] = [];
        snapshot.forEach(doc => {
          const data = doc.data() as CierreCaja;
          cierres.push({ ...data, id: doc.id });
        });
        observer.next(cierres);
        observer.complete();
      })
      .catch(error => {
        console.error('Error obteniendo cierres en rango:', error);
        observer.next([]);
        observer.complete();
      });
  });
}

// Obtener todos los cierres de caja ordenados por fecha
getTodosCierres(): Observable<CierreCaja[]> {
  return new Observable(observer => {
    this.firestore.collection('cierres_caja')
      .orderBy('fecha', 'desc')
      .get()
      .then(snapshot => {
        const cierres: CierreCaja[] = [];
        snapshot.forEach(doc => {
          const data = doc.data() as CierreCaja;
          cierres.push({ ...data, id: doc.id });
        });
        observer.next(cierres);
        observer.complete();
      })
      .catch(error => {
        console.error('Error obteniendo todos los cierres:', error);
        observer.next([]);
        observer.complete();
      });
  });
}
}
