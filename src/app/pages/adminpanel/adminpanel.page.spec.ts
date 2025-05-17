import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminpanelPage } from './adminpanel.page';

describe('AdminpanelPage', () => {
  let component: AdminpanelPage;
  let fixture: ComponentFixture<AdminpanelPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminpanelPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
