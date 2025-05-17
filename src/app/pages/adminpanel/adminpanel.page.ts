import { Component,  } from '@angular/core';
import { User } from 'src/app/models/user.models';


@Component({
  selector: 'app-adminpanel',
  templateUrl: './adminpanel.page.html',
  styleUrls: ['./adminpanel.page.scss'],
  standalone: false,

})
export class AdminpanelPage {

  selectedUser: User | null = null;

  onUserSelected(user: User) {
    this.selectedUser = user;

  }
}
