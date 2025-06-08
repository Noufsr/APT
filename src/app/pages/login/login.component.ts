import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { ModalController } from '@ionic/angular';
import { RecuperarPasswordComponent } from 'src/app/components/recuperar-password/recuperar-password.component';
import { filter, take } from 'rxjs/operators';
import { LoadingService } from 'src/app/services/loading.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: false
})
export class LoginComponent  {
  email = '';
  password = '';
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router,
    private modalCtrl: ModalController,
      private loadingService: LoadingService

  ) {}

async login() {
  this.errorMessage = '';
  await this.loadingService.present('Iniciando sesión...');
  try {
    await this.authService.login(this.email, this.password);

    this.authService.currentUser.pipe(
      filter(user => user !== null && user.activo === true),
      take(1)
    ).subscribe(() => {
      this.loadingService.dismiss();
      this.router.navigate(['/home']);
    });
  } catch (error: any) {
    this.loadingService.dismiss();
    this.errorMessage = error.message;
  }
}
  async abrirModalRecuperarPassword() {
    const modal = await this.modalCtrl.create({
      component: RecuperarPasswordComponent,
    });
    await modal.present();
  }


}


