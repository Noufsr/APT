import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, of, forkJoin, BehaviorSubject } from 'rxjs';
import { map, catchError, switchMap, filter, take } from 'rxjs/operators';
import { Producto } from '../models/producto.models';
import { Proveedor } from '../models/proveedor.models';

export interface ProductoConProveedor extends Producto {
  nombreProveedor: string;
}

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private afsReady = new BehaviorSubject<boolean>(false);

  constructor(private afs: AngularFirestore) {
    console.log('FirestoreService inicializado');
    // Indicamos que AngularFirestore está listo para usar
    setTimeout(() => {
      this.afsReady.next(true);
    });
  }

  getInventarioConProveedor(): Observable<ProductoConProveedor[]> {
    console.log('Obteniendo inventario con proveedores');

    // Esperamos a que AngularFirestore esté listo
    return this.afsReady.pipe(
      filter(ready => ready),
      take(1),
      switchMap(() => {
        try {
          return this.afs.collection<Producto>('productos').valueChanges({ idField: 'id' })
            .pipe(
              switchMap(productos => {
                console.log('Productos cargados:', productos.length);

                if (productos.length === 0) {
                  return of([]);
                }

                const observables = productos.map(producto => {
                  if (producto.idproveedor) {
                    return this.afs.doc<Proveedor>(`proveedores/${producto.idproveedor}`)
                      .valueChanges()
                      .pipe(
                        map(proveedor => ({
                          ...producto,
                          nombreProveedor: proveedor ? proveedor.nombreProveedor : 'Sin proveedor'
                        })),
                        catchError(() => of({
                          ...producto,
                          nombreProveedor: 'Error al cargar proveedor'
                        }))
                      );
                  } else {
                    return of({
                      ...producto,
                      nombreProveedor: 'Sin proveedor'
                    });
                  }
                });

                // Combinar todos los observables en uno solo
                return forkJoin(observables);
              }),
              catchError(error => {
                console.error('Error al cargar productos:', error);
                return of([]);
              })
            );
        } catch (error) {
          console.error('Error general:', error);
          return of([]);
        }
      })
    );
  }
}
