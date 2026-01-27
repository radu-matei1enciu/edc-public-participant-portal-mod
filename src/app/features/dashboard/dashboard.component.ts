import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { UserProfile } from '../../core/models/participant.model';
import { NotificationService } from '../../shared/services/notification.service';
import { DataspaceService } from '../../core/services/dataspace.service';
import { PartnerService } from '../../core/services/partner.service';
import { DataspaceResource } from '../../core/models/dataspace.model';
import { Partner } from '../../core/models/partner.model';
import { EDCDataOperationsService } from '../../core/redline';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    RouterLink
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
  private dataspaceService = inject(DataspaceService);
  private partnerService = inject(PartnerService);
  private edcDataOperationsService = inject(EDCDataOperationsService);
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
    const userIds = this.authService.getRedlineUser();
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

    const files$ = this.edcDataOperationsService.listFiles(
      userIds.participantId,
      userIds.tenantId,
      userIds.providerId
    ).pipe(
      catchError(() => of([]))
    );

    forkJoin({
      dataspaces: dataspaces$,
      files: files$
    }).pipe(
      switchMap(({ dataspaces, files }) => {
        this.membershipsCount = dataspaces.length;
        this.recentMemberships = [...dataspaces].reverse().slice(0, 6);
        this.filesCount = files.length;
        this.lastUpdateTime = new Date();

        if (dataspaces.length > 0) {
          const partnerRequests = dataspaces.map(dataspace =>
            this.partnerService.getPartners(
              userIds.providerId,
              userIds.tenantId,
              userIds.participantId,
              dataspace.id
            ).pipe(
              catchError(() => of([] as Partner[]))
            )
          );

          return forkJoin(partnerRequests).pipe(
            catchError(() => of([] as Partner[][]))
          );
        } else {
          return of([] as Partner[][]);
        }
      }),
      catchError(() => {
        this.membershipsCount = 0;
        this.filesCount = 0;
        this.partnersCount = 0;
        return of([] as Partner[][]);
      })
    ).subscribe({
      next: (partnersArrays) => {
        if (partnersArrays.length > 0) {
          const allPartners = partnersArrays.flat();
          const uniquePartners = Array.from(
            new Map(allPartners.map(p => [p.identifier, p])).values()
          );
          this.partnersCount = uniquePartners.length;
        } else {
          this.partnersCount = 0;
        }
        this.lastUpdateTime = new Date();
      },
      error: () => {
        this.partnersCount = 0;
      }
    });
  }
}
