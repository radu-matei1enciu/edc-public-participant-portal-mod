import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-success',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './success.component.html',
  styles: []
})
export class SuccessComponent implements OnInit {
  participantId: string | null = null;
  participantName: string | null = null;
  username: string | null = null;
  private authService = inject(AuthService);

  constructor(
      private route: ActivatedRoute,
      private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.participantId = params['participantId'] || null;
      this.participantName = params['participantName'] || null;
      this.username = params['username'] || null;
    });
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }

  goToRegistration(): void {
    this.router.navigate(['/registration']);
  }

  goToLogin(): void {
    localStorage.setItem('returnUrl', '/dashboard');
    this.authService.login();
  }
}
