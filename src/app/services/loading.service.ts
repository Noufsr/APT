// src/app/services/loading.service.ts
import { Injectable } from '@angular/core';
import { LoadingController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loading: HTMLIonLoadingElement | null = null;

  constructor(private loadingCtrl: LoadingController) {}

  async present(message = 'Cargando...') {
    if (!this.loading) {
      this.loading = await this.loadingCtrl.create({
        message,
        spinner: 'crescent'
      });
      await this.loading.present();
    }
  }

  async dismiss() {
    if (this.loading) {
      await this.loading.dismiss();
      this.loading = null;
    }
  }
}
