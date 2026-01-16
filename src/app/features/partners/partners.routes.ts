import { Routes } from '@angular/router';

export const PARTNERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./partners-list.component').then(m => m.PartnersListComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./partner-detail.component').then(m => m.PartnerDetailComponent)
  }
];
