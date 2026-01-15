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
      const url = event.urlAfterRedirects;
      this.showAppShell = !['/', '/registration', '/success', '/role-error'].includes(url);
    });

    const currentUrl = this.router.url;
    this.showAppShell = !['/', '/registration', '/success', '/role-error'].includes(currentUrl);

    this.authService.loadUserProfile().subscribe({
      next: (profile) => {
        this.userProfile = profile;
      },
      error: () => {
        this.userProfile = null;
      }
    });
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
    if (!this.userProfile?.user) return 'U';
    const user = this.userProfile.user;
    const firstName = user.metadata?.firstName || '';
    const lastName = user.metadata?.lastName || '';
    const name = `${firstName} ${lastName}`.trim() || user.username;
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getUserDisplayName(): string {
    if (!this.userProfile?.user) return 'User';
    const user = this.userProfile.user;
    const firstName = user.metadata?.firstName || '';
    const lastName = user.metadata?.lastName || '';
    return `${firstName} ${lastName}`.trim() || user.username;
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
