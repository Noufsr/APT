import { Injectable, NgZone } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, switchMap, take } from 'rxjs/operators';
import { Producto } from '../models/producto.models';
import { Proveedor } from '../models/proveedor.models';
import { Pedido } from '../models/pedido.models';
import firebase from 'firebase/compat/app';
import { User } from '../models/user.models'; // Assuming User is defined in this file

export interface ProductoConProveedor extends Producto {
  cad: any;
  nombreProveedor: string;
}

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private ProductoCollection: AngularFirestoreCollection<Producto>;
  private proveedoresCollection: AngularFirestoreCollection<Proveedor>;
  private pedidosCollection: AngularFirestoreCollection<Pedido>;
  private firestore: firebase.firestore.Firestore;
  private usersCollection: AngularFirestoreCollection<User>;

  constructor(private afs: AngularFirestore, private zone: NgZone) {
    console.log('FirestoreService inicializado');
    this.ProductoCollection = this.afs.collection<Producto>('Producto');
    this.proveedoresCollection = this.afs.collection<Proveedor>('proveedores');
    this.pedidosCollection = this.afs.collection<Pedido>('pedidos');
    this.usersCollection = this.afs.collection<User>('users');
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
      return this.pedidosCollection.doc(pedido.id).update(pedido)
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
        const producto = productosActuales.find(p => p.cod_barras === item.cod_barras);
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
          console.warn(`Producto con código ${item.cod_barras} no encontrado en la lista actual`);
        }
      }

      return pedidoId;
    } catch (error) {
      console.error('Error al procesar el pedido:', error);
      throw error;
    }
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
}
