import { Routes } from '@angular/router';

export const PARTNERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./partners-list.component').then(m => m.PartnersListComponent)
  },
  {
    path: 'add',
    loadComponent: () => import('./partner-add.component').then(m => m.PartnerAddComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./partner-detail.component').then(m => m.PartnerDetailComponent)
  }
];
