import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataspaceService } from '../../../core/services/dataspace.service';
import { DataspaceResource } from '../../../core/models/dataspace.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfigService } from '../../../core/services/config.service';

@Component({
  selector: 'app-memberships-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './memberships-section.component.html',
  })
export class MembershipsSectionComponent implements OnInit {
  @Output() viewDetails = new EventEmitter<number>();

  memberships: DataspaceResource[] = [];
  loading = false;

  private dataspaceService = inject(DataspaceService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private configService = inject(ConfigService);

  ngOnInit(): void {
    this.loadMemberships();
  }

  loadMemberships(): void {
    const userIds = this.authService.getCurrentUserIds();
    if (!userIds) {
      this.notificationService.showError('Error', 'Failed to load user profile');
      return;
    }

    this.loading = true;
    this.dataspaceService.getParticipantDataspaces(userIds.providerId, userIds.tenantId, userIds.participantId).subscribe({
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

  onViewDetails(membershipId: number): void {
    this.viewDetails.emit(membershipId);
  }

  startRegistration(): void {
    window.location.href = '/registration';
  }
}
