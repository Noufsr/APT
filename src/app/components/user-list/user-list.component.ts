import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { User } from 'src/app/models/user.models';
import { FirestoreService } from '../../services/firestore.service'; // Ajusta la ruta según sea necesario
import { ModalController } from '@ionic/angular';
import { UserDetailModalComponent } from '../user-detail-modal/user-detail-modal.component';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
  standalone: false
})
export class UserListComponent implements OnInit {
  users: User[] = [];
  loading = true;

  @Output() selectUser = new EventEmitter<User>();



  // Usa tu servicio existente
  constructor(
    private modalCtrl: ModalController,
    private firestoreService: FirestoreService,
    private cdr: ChangeDetectorRef)
   {}

  ngOnInit() {

      this.firestoreService.getUsers().subscribe({
        next: (users) => {
          this.users = users;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading users:', error);
          this.loading = false;
        }
      });


  }



  async openUserDetail(user: User) {
    const modal = await this.modalCtrl.create({
      component: UserDetailModalComponent,
      componentProps: { user }
    });
    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data) {
      // Actualizar la lista si hay cambios
    }
  }

}
