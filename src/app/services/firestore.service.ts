import { Injectable, NgZone } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError, switchMap, take } from 'rxjs/operators';
import { Producto } from '../models/producto.models';
import { Proveedor } from '../models/proveedor.models';

import { Pedido } from '../models/pedido.models';

import firebase from 'firebase/compat/app';

export interface ProductoConProveedor extends Producto {
  nombreProveedor: string;
}

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private productosCollection: AngularFirestoreCollection<Producto>;

  private proveedoresCollection: AngularFirestoreCollection<Proveedor>;
  private pedidosCollection: AngularFirestoreCollection<Pedido>;
  private firestore: firebase.firestore.Firestore;

  constructor(private afs: AngularFirestore, private zone: NgZone) {
    console.log('FirestoreService inicializado');
    this.productosCollection = this.afs.collection<Producto>('productos');
    this.proveedoresCollection = this.afs.collection<Proveedor>('proveedores');
    this.pedidosCollection = this.afs.collection<Pedido>('pedidos');

    this.firestore = firebase.firestore();
  }

  // Métodos para productos
  getProductos(): Observable<Producto[]> {
    return this.productosCollection.valueChanges({ idField: 'id' });
  }

  buscarProductoPorCodigoBarras(codigoBarras: number): Observable<Producto | null> {
    return this.afs.collection<Producto>('productos', ref =>
      ref.where('cod_barras', '==', codigoBarras)
    ).valueChanges({ idField: 'id' }).pipe(
      map(productos => productos.length > 0 ? productos[0] : null),
      take(1)
    );
  }

  guardarProducto(producto: Producto): Promise<string> {
    if (producto.id) {
      // Actualizar producto existente
      return this.productosCollection.doc(producto.id.toString()).update(producto)
        .then(() => producto.id.toString());
    } else {
      // Crear nuevo producto
      return this.productosCollection.add(producto)
        .then(docRef => docRef.id);
    }
  }

  actualizarStockProducto(id: string | number, nuevoStock: number): Promise<void> {
    return this.productosCollection.doc(id.toString()).update({ stock: nuevoStock });
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
  guardarPedido(pedido: Pedido): Promise<string> {
    if (pedido.id!) {  // Usamos el operador ! para asegurar a TypeScript que no es null/undefined
      // Actualizar pedido existente
      return this.pedidosCollection.doc(pedido.id.toString()).update(pedido)
        .then(() => pedido.id!.toString());
    } else {
      // Crear nuevo pedido
      return this.pedidosCollection.add(pedido)
        .then(docRef => docRef.id);
    }
}

getPedidosPendientes(): Promise<Pedido[]> {
  return this.afs.collection<Pedido>('pedidos', ref =>
    ref.where('estado', '==', 'pendiente')
  ).valueChanges({ idField: 'id' }).pipe(
    take(1),
    map(pedidos => pedidos || []) // Garantiza que siempre retorne un array
  ).toPromise() as Promise<Pedido[]>; // Type assertion para asegurar el tipo
}

getPedido(id: string): Promise<Pedido> {
  return this.pedidosCollection.doc<Pedido>(id).valueChanges({ idField: 'id' }).pipe(
    take(1),
    map(pedido => {
      if (!pedido) {
        throw new Error(`Pedido con ID ${id} no encontrado`);
      }
      return pedido;
    })
  ).toPromise() as Promise<Pedido>; // Type assertion para asegurar el tipo
}

  actualizarPagoPedido(id: string, montoPagado: number, estado: 'pagado' | 'pendiente'): Promise<void> {
    return this.pedidosCollection.doc(id).update({
      montoPagado: montoPagado,
      estado: estado
    });

  }

  getInventarioConProveedor(): Observable<ProductoConProveedor[]> {
    console.log('Obteniendo inventario con proveedores');

    return this.productosCollection.valueChanges({ idField: 'id' }).pipe(
      switchMap(productos => {
        console.log('Productos cargados:', productos.length);

        if (productos.length === 0) {
          return of([]);
        }

        const observables = productos.map(producto => {
          if (producto.idproveedor) {
            const proveedorId = String(producto.idproveedor);

            return new Observable<ProductoConProveedor>(observer => {
              this.firestore.collection('proveedores').doc(proveedorId).get()
                .then(doc => {

                  this.zone.run(() => {
                    if (doc.exists) {
                      const proveedor = doc.data() as Proveedor;
                      observer.next({
                        ...producto,
                        nombreProveedor: proveedor.nombreProveedor || 'Sin nombre'
                      });
                    } else {
                      observer.next({
                        ...producto,
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
                      ...producto,
                      nombreProveedor: 'Error al cargar proveedor'
                    });
                    observer.complete();
                  });
                });
            }).pipe(take(1));
          } else {
            return of({
              ...producto,
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
