import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MembershipService } from '../../../core/services/membership.service';
import { Membership } from '../../../core/models/membership.model';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-memberships-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './memberships-section.component.html',
  })
export class MembershipsSectionComponent implements OnInit {
  @Input() participantId: string = '';
  @Output() viewDetails = new EventEmitter<string>();

  memberships: Membership[] = [];
  loading = false;

  private membershipService = inject(MembershipService);
  private notificationService = inject(NotificationService);

  ngOnInit(): void {
    if (this.participantId) {
      this.loadMemberships();
    }
  }

  loadMemberships(): void {
    this.loading = true;
    this.membershipService.getMemberships(this.participantId).subscribe({
      next: (memberships) => {
        this.memberships = memberships;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notificationService.showError('Error', 'Failed to load memberships');
      }
    });
  }

  onViewDetails(membershipId: string): void {
    this.viewDetails.emit(membershipId);
  }

  startRegistration(): void {
    window.location.href = '/registration';
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active':
        return 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'inactive':
        return 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
