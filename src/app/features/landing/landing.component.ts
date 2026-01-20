import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ConfigService } from '../../core/services/config.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
  imports: [CommonModule]
})
export class LandingComponent implements OnInit {
  isAuthenticated$: Observable<boolean>;
  showAdminPortal$: Observable<boolean>;
  showUserDashboard$: Observable<boolean>;

  private configService = inject(ConfigService);

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    this.isAuthenticated$ = this.authService.currentUser$.pipe(
      map(user => user !== null)
    );
    
    this.showAdminPortal$ = this.authService.currentUser$.pipe(
      map(user => user ? this.authService.getPostLoginBehavior() === 'admin-portal' : false)
    );
    
    this.showUserDashboard$ = this.authService.currentUser$.pipe(
      map(user => user ? this.authService.getPostLoginBehavior() === 'user-dashboard' : false)
    );
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        const returnUrl = localStorage.getItem('returnUrl');
        if (returnUrl) {
          localStorage.removeItem('returnUrl');
          this.router.navigate([returnUrl]);
        } else {
          const behavior = this.authService.getPostLoginBehavior();
          if (behavior === 'user-dashboard') {
            this.router.navigate(['/dashboard']);
          }
        }
      }
    });
  }

  navigateToSignUp(): void {
    this.router.navigate(['/registration']);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  login(): void {
    this.router.navigate(['/login']);
  }

  logout(): void {
    this.authService.logout()
  }

  scrollToFeatures(): void {
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  }
}