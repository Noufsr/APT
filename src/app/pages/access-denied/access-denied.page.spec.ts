import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccessDeniedPage } from './access-denied.page';

describe('AccessDeniedPage', () => {
  let component: AccessDeniedPage;
  let fixture: ComponentFixture<AccessDeniedPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AccessDeniedPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
