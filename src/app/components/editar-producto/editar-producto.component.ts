import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Component, Input, NgModule } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { Producto } from 'src/app/models/producto.models';
import { Proveedor } from 'src/app/models/proveedor.models';
import { FirestoreService } from 'src/app/services/firestore.service';

@Component({
  selector: 'app-editar-producto',
  templateUrl: './editar-producto.component.html',
  styleUrls: ['./editar-producto.component.scss'],
  standalone: true,
  imports: [CommonModule,IonicModule,FormsModule], // Asegúrate de importar FormsModule si usas ngModel
    // Asegúrate de importar CommonModule, IonicModule y FormsModule

})
export class EditarProductoComponent {
  @Input() producto!: Producto;

  constructor(private modalCtrl: ModalController,
    private firestoreService: FirestoreService
  ) {}
  proveedores: Proveedor[] = [];
  ngOnInit() {
    this.cargarProveedores();
  }


  cerrar() {
    this.modalCtrl.dismiss();
  }

cargarProveedores() {
    this.firestoreService.getProveedores().subscribe(
      (proveedores) => {
        this.proveedores = proveedores;
      },
      (error) => {
        console.error('Error al cargar proveedores:', error);
      }
    );
  }

    guardar() {
  this.modalCtrl.dismiss({
    actualizado: true,
    producto: this.producto
  });
}

}
