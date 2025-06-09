import { FirestoreService } from 'src/app/services/firestore.service';
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Observable, take } from 'rxjs';
import { User } from '../../models/user.models';
import { CajaComponent } from '../../components/caja/caja.component';
import { AlertController, ModalController, NavController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {
  currentUser$: Observable<User | null> = this.authService.currentUser;
  constructor(
    private authService: AuthService,
    private modalController: ModalController,
    private alertController: AlertController,
    private firestoreService: FirestoreService,
  ) {}

  ngOnInit() {
    this.currentUser$.subscribe(user => {
      if (user) {
        console.log('Usuario autenticado:', user);
      } else {
        console.log('No hay usuario autenticado');
      }
    });

    this.verificarApertura();

  }

  async verificarApertura() {
  const aperturas = await this.firestoreService.getAperturasAbiertas().pipe(take(1)).toPromise();
  if (!aperturas || aperturas.length === 0) {
    this.abrirModalCaja('apertura');
  }
}

  async abrirModalCaja(accion: 'apertura' | 'cierre') {
  const modal = await this.modalController.create({
    component: CajaComponent,
    componentProps: {accion: accion},
    backdropDismiss: false,
    showBackdrop: true,

  });

  return await modal.present();
}
}
