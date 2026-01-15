import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MembershipService } from '../../../core/services/membership.service';
import { Membership } from '../../../core/models/membership.model';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-membership-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './membership-details.component.html',
  })
export class MembershipDetailsComponent implements OnInit {
  @Input() participantId: string = '';
  @Input() membershipId: string = '';
  @Output() close = new EventEmitter<void>();

  membership: Membership | null = null;
  loading = false;

  private membershipService = inject(MembershipService);
  private notificationService = inject(NotificationService);

  ngOnInit(): void {
    if (this.participantId && this.membershipId) {
      this.loadMembership();
    }
  }

  loadMembership(): void {
    this.loading = true;
    this.membershipService.getMembershipDetails(this.participantId, this.membershipId).subscribe({
      next: (membership) => {
        this.membership = membership;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notificationService.showError('Error', 'Failed to load membership details');
      }
    });
  }

  editMembership(): void {
    this.notificationService.showInfo('Info', 'Edit functionality coming soon');
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'inactive':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
