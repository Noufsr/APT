import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BipPage } from './bip.page';

describe('BipPage', () => {
  let component: BipPage;
  let fixture: ComponentFixture<BipPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BipPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
