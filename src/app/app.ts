import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { UserPreferencesService } from './core/services/user-preferences.service';
import { UserProfile } from './core/models/participant.model';
import { ModalComponent } from './shared/components/modal/modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private preferencesService = inject(UserPreferencesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroy$ = new Subject<void>();
  
  title = 'DataSpace Portal';
  isMobileMenuOpen = false;
  isUserMenuOpen = false;
  isNotificationsOpen = false;
  userProfile: UserProfile | null = null;
  showAppShell = false;

  ngOnInit(): void {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        this.isUserMenuOpen = false;
        this.isNotificationsOpen = false;
      }
    });

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: NavigationEnd) => {
      const url = event.urlAfterRedirects.split('?')[0];
      const hideShellPaths = ['/', '/customers', '/customers/', '/registration', '/customers/registration', '/success', '/customers/success', '/login', '/customers/login', '/role-error', '/customers/role-error'];
      this.showAppShell = !hideShellPaths.includes(url) && !url.startsWith('/customers/registration') && !url.startsWith('/customers/success') && !url.startsWith('/customers/login') && !url.startsWith('/login');
      
      if (this.authService.isAuthEnabled() && this.authService.isAuthenticatedSync()) {
        this.loadUserProfile();
        
        const returnUrl = localStorage.getItem('returnUrl');
        if (returnUrl) {
          localStorage.removeItem('returnUrl');
          const cleanReturnUrl = returnUrl.startsWith('/customers/') ? returnUrl.replace('/customers', '') : returnUrl;
          if (cleanReturnUrl !== url) {
            this.router.navigate([cleanReturnUrl]);
          }
        } else {
          const behavior = this.authService.getPostLoginBehavior();
          if (behavior === 'user-dashboard' && (url === '/' || url === '/customers' || url === '/customers/')) {
            this.router.navigate(['/dashboard']);
          }
        }
      } else {
        this.userProfile = null;
      }
    });

    const currentUrl = this.router.url.split('?')[0];
    const hideShellPaths = ['/', '/customers', '/customers/', '/registration', '/customers/registration', '/success', '/customers/success', '/login', '/customers/login', '/role-error', '/customers/role-error'];
    this.showAppShell = !hideShellPaths.includes(currentUrl) && !currentUrl.startsWith('/customers/registration') && !currentUrl.startsWith('/customers/success') && !currentUrl.startsWith('/customers/login') && !currentUrl.startsWith('/login');

    this.loadUserProfile();
  }

  private loadUserProfile(): void {
    if (this.authService.isAuthEnabled() && this.authService.isAuthenticatedSync()) {
      this.authService.loadUserProfile().subscribe({
        next: (profile) => {
          this.userProfile = profile;
        },
        error: () => {
          this.userProfile = null;
        }
      });
    } else {
      this.userProfile = null;
    }
  }

  toggleTheme(): void {
    const currentTheme = this.preferencesService.currentPreferences.theme;
    let newTheme: 'light' | 'dark' | 'system';
    
    if (currentTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      newTheme = prefersDark ? 'light' : 'dark';
    } else {
      newTheme = currentTheme === 'light' ? 'dark' : 'light';
    }
    
    this.preferencesService.updatePreferences({ theme: newTheme });
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    document.body.classList.toggle('overflow-hidden', this.isMobileMenuOpen);
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
    this.isNotificationsOpen = false;
  }

  toggleNotifications(): void {
    this.isNotificationsOpen = !this.isNotificationsOpen;
    this.isUserMenuOpen = false;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
    document.body.classList.remove('overflow-hidden');
  }

  closeUserMenu(): void {
    this.isUserMenuOpen = false;
  }

  getUserInitials(): string {
    if (this.userProfile?.user) {
      const user = this.userProfile.user;
      const firstName = user.metadata?.firstName || '';
      const lastName = user.metadata?.lastName || '';
      const name = `${firstName} ${lastName}`.trim() || user.username;
      if (name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      }
    }
    
    const selected = this.authService.getSelectedParticipant();
    if (selected) {
      const name = selected.tenantName || selected.participantIdentifier || 'U';
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    
    return 'U';
  }

  getUserDisplayName(): string {
    if (this.userProfile?.user) {
      const user = this.userProfile.user;
      const firstName = user.metadata?.firstName || '';
      const lastName = user.metadata?.lastName || '';
      const name = `${firstName} ${lastName}`.trim();
      if (name) return name;
      if (user.username) return user.username;
    }
    
    const selected = this.authService.getSelectedParticipant();
    if (selected) {
      return selected.tenantName || selected.participantIdentifier || 'User';
    }
    
    return 'User';
  }

  getUserEmail(): string {
    if (!this.userProfile?.user) return '';
    return this.userProfile.user.metadata?.email || this.userProfile.user.username;
  }

  logout(): void {
    this.authService.logout();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
