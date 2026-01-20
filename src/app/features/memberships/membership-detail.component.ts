import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MembershipService } from '../../core/services/membership.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../shared/services/notification.service';
import { Membership } from '../../core/models/membership.model';

@Component({
  selector: 'app-membership-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './membership-detail.component.html'
})
export class MembershipDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private membershipService = inject(MembershipService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private destroyRef = inject(DestroyRef);

  membership: Membership | null = null;
  loading = true;

  ngOnInit(): void {
    this.authService.loadUserProfile().subscribe({
      next: () => {
        this.loadMembership();
      },
      error: () => {
        this.loading = false;
        this.notificationService.showError('Error', 'Failed to load user profile');
      }
    });
  }

  loadMembership(): void {
    this.route.params.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (params) => {
        const membershipId = params['id'];
        if (membershipId) {
          this.membershipService.getMembershipDetails(membershipId).subscribe({
            next: (membership) => {
              this.membership = membership;
              this.loading = false;
            },
            error: () => {
              this.loading = false;
              this.notificationService.showError('Error', 'Failed to load membership details');
            }
          });
        } else {
          this.loading = false;
        }
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/memberships']);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active':
        return 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'inactive':
        return 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  }

  getCredentialStatusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'ISSUED':
        return 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'REQUESTED':
        return 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'EXPIRED':
      case 'REVOKED':
        return 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
