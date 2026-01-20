import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'registration',
    loadComponent: () => import('./features/registration/registration.component').then(m => m.RegistrationComponent)
  },
  {
    path: 'success',
    loadComponent: () => import('./features/success/success.component').then(m => m.SuccessComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent)
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
    path: 'memberships',
    loadChildren: () => import('./features/memberships/memberships.routes').then(m => m.MEMBERSHIPS_ROUTES),
    canActivate: [AuthGuard]
  },
  {
    path: 'partners',
    loadChildren: () => import('./features/partners/partners.routes').then(m => m.PARTNERS_ROUTES),
    canActivate: [AuthGuard]
  },
  {
    path: 'files',
    loadChildren: () => import('./features/files/files.routes').then(m => m.FILES_ROUTES),
    canActivate: [AuthGuard]
  },
  {
    path: 'explore',
    loadChildren: () => import('./features/explore/explore.routes').then(m => m.EXPLORE_ROUTES),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
