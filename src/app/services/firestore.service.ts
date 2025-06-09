import { Injectable, NgZone } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, switchMap, take, map } from 'rxjs/operators';
import { Producto } from '../models/producto.models';
import { Proveedor } from '../models/proveedor.models';
import { Pedido } from '../models/pedido.models';
import firebase from 'firebase/compat/app';
import { Boleta } from '../models/venta.models';

import { User } from '../models/user.models';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore'; // <-- importante// Assuming User is defined in this file

import { AperturaCaja, CierreCaja } from '../models/caja.models';

import { Bip } from '../models/bip.models';
import { CajaVecina } from '../models/cajavecina.models';


export interface ProductoConProveedor extends Producto {
  cad: any;
  nombreProveedor: string;
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

  constructor(private afs: AngularFirestore, private zone: NgZone) {
    console.log('FirestoreService inicializado');
    this.ProductoCollection = this.afs.collection<Producto>('Producto');
    this.proveedoresCollection = this.afs.collection<Proveedor>('proveedores');
    this.pedidosCollection = this.afs.collection<Pedido>('pedidos');
    this.usersCollection = this.afs.collection<User>('users');
    this.ventasCollection = this.afs.collection<Boleta>('ventas');
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

}
