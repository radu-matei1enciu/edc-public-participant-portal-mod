import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { UserProfile } from '../../core/models/participant.model';
import { NotificationService } from '../../shared/services/notification.service';
import { NotificationsComponent } from '../../shared/services/notifications.component';
import { FileAssetService } from '../../core/services/file-asset.service';
import { DataspaceService } from '../../core/services/dataspace.service';
import { PartnerService } from '../../core/services/partner.service';
import { DataspaceResource } from '../../core/models/dataspace.model';
import { Partner } from '../../core/models/partner.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    RouterLink,
    NotificationsComponent
  ],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit, OnDestroy {
  userProfile: UserProfile | null = null;
  loading = true;
  error: string | null = null;
  isAuthenticated = false;
  membershipsCount = 0;
  partnersCount = 0;
  filesCount = 0;
  lastUpdateTime = new Date();
  recentMemberships: DataspaceResource[] = [];

  private authService = inject(AuthService);
  private router = inject(Router);
  private fileAssetService = inject(FileAssetService);
  private dataspaceService = inject(DataspaceService);
  private partnerService = inject(PartnerService);
  private notificationService = inject(NotificationService);

  ngOnInit(): void {
    const loggedIn = this.authService.isAuthenticated();
    this.isAuthenticated = loggedIn;
    
    if (!loggedIn) {
      this.authService.login();
      return;
    }
    
    this.loadUserProfile();
  }

  ngOnDestroy(): void {
  }

  loadUserProfile(): void {
    this.loading = true;
    this.error = null;

    this.authService.loadUserProfile().subscribe({
      next: (profile) => {
        this.userProfile = profile;
        this.loading = false;
        this.loadStats();
      },
      error: (error) => {
        this.loading = false;
        this.error = 'Failed to load user profile';
        this.notificationService.showError('Error', 'Failed to load user profile');
      }
    });
  }

  loadStats(): void {
    const userIds = this.authService.getCurrentUserIds();
    if (!userIds) {
      return;
    }

    const dataspaces$ = this.dataspaceService.getParticipantDataspaces(
      userIds.providerId,
      userIds.tenantId,
      userIds.participantId
    ).pipe(
      catchError(() => of([] as DataspaceResource[]))
    );

    const files$ = this.userProfile?.participant?.id
      ? this.fileAssetService.getFiles(this.userProfile.participant.id).pipe(
          catchError(() => of([]))
        )
      : of([]);

    dataspaces$.subscribe({
      next: (memberships) => {
        this.membershipsCount = memberships.length;
        this.recentMemberships = [...memberships].reverse().slice(0, 6);
        this.lastUpdateTime = new Date();

        if (memberships.length > 0) {
          const partnerRequests = memberships.map(dataspace =>
            this.partnerService.getPartners(
              userIds.providerId,
              userIds.tenantId,
              userIds.participantId,
              dataspace.id
            ).pipe(
              catchError(() => of([] as Partner[]))
            )
          );

          forkJoin(partnerRequests).subscribe({
            next: (partnersArrays) => {
              const allPartners = partnersArrays.flat();
              const uniquePartners = Array.from(
                new Map(allPartners.map(p => [p.identifier, p])).values()
              );
              this.partnersCount = uniquePartners.length;
              this.lastUpdateTime = new Date();
            },
            error: () => {
              this.partnersCount = 0;
            }
          });
        } else {
          this.partnersCount = 0;
        }
      }
    });

    files$.subscribe({
      next: (files) => {
        this.filesCount = files.length;
        this.lastUpdateTime = new Date();
      },
      error: () => {
        this.filesCount = 0;
      }
    });
  }
}
