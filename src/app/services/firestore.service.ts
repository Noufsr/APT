import { Injectable, NgZone } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError, switchMap, take } from 'rxjs/operators';
import { Producto } from '../models/producto.models';
import { Proveedor } from '../models/proveedor.models';
import firebase from 'firebase/compat/app';

export interface ProductoConProveedor extends Producto {
  nombreProveedor: string;
}

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private productosCollection: AngularFirestoreCollection<Producto>;
  private firestore: firebase.firestore.Firestore;


  constructor(private afs: AngularFirestore, private zone: NgZone) {
    console.log('FirestoreService inicializado');
    this.productosCollection = this.afs.collection<Producto>('productos');

    this.firestore = firebase.firestore();
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
