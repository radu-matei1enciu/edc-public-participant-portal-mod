import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'registration',
    loadComponent: () => import('./features/registration/registration.component').then(m => m.RegistrationComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'success',
    loadComponent: () => import('./features/success/success.component').then(m => m.SuccessComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'role-error',
    loadComponent: () => import('./features/role-error/role-error.component').then(m => m.RoleErrorComponent)
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
