import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataspaceService } from '../../../core/services/dataspace.service';
import { DataspaceResource } from '../../../core/models/dataspace.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfigService } from '../../../core/services/config.service';

@Component({
  selector: 'app-membership-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './membership-details.component.html',
  })
export class MembershipDetailsComponent implements OnInit {
  @Input() membershipId: number = 0;
  @Output() close = new EventEmitter<void>();

  membership: DataspaceResource | null = null;
  loading = false;

  private dataspaceService = inject(DataspaceService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private configService = inject(ConfigService);

  ngOnInit(): void {
    if (this.membershipId) {
      this.loadMembership();
    }
  }

  loadMembership(): void {
    const userIds = this.authService.getCurrentUserIds();
    if (!userIds) {
      this.loading = false;
      this.notificationService.showError('Error', 'Failed to load user profile');
      return;
    }

    this.loading = true;
    this.dataspaceService.getParticipantDataspaces(userIds.providerId, userIds.tenantId, userIds.participantId).subscribe({
      next: (dataspaces) => {
        const membership = dataspaces.find(m => m.id === this.membershipId);
        if (membership) {
          this.membership = membership;
        } else {
          this.notificationService.showError('Error', 'Membership not found');
        }
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
}
