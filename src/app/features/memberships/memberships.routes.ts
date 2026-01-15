import { Routes } from '@angular/router';

export const MEMBERSHIPS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./memberships-list.component').then(m => m.MembershipsListComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./membership-detail.component').then(m => m.MembershipDetailComponent)
  }
];
