import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DataspaceService } from '../../core/services/dataspace.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../shared/services/notification.service';
import { ConfigService } from '../../core/services/config.service';
import { DataspaceResource } from '../../core/models/dataspace.model';

@Component({
  selector: 'app-membership-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './membership-detail.component.html'
})
export class MembershipDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dataspaceService = inject(DataspaceService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private configService = inject(ConfigService);
  private destroyRef = inject(DestroyRef);

  membership: DataspaceResource | null = null;
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
    const userIds = this.authService.getRedlineUser();
    if (!userIds) {
      this.loading = false;
      this.notificationService.showError('Error', 'Failed to load user profile');
      return;
    }

    this.route.params.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (params) => {
        const membershipId = params['id'];
        if (membershipId) {
          this.dataspaceService.getParticipantDataspaces(userIds.providerId, userIds.tenantId, userIds.participantId).subscribe({
            next: (dataspaces) => {
              const membership = dataspaces.find(m => m.id.toString() === membershipId);
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
        } else {
          this.loading = false;
        }
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/memberships']);
  }

}
