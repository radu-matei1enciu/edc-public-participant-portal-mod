import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserProfile } from '../../core/models/participant.model';
import { NotificationService } from '../../shared/services/notification.service';
import { NotificationsComponent } from '../../shared/services/notifications.component';
import { FileAssetService } from '../../core/services/file-asset.service';
import { UseCaseService } from '../../core/services/use-case.service';
import { MembershipService } from '../../core/services/membership.service';
import { PartnerService } from '../../core/services/partner.service';
import { UseCase } from '../../core/models/use-case.model';
import { Membership } from '../../core/models/membership.model';

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
  useCases: UseCase[] = [];
  membershipsCount = 0;
  partnersCount = 0;
  filesCount = 0;
  lastUpdateTime = new Date();
  recentMemberships: Membership[] = [];

  private authService = inject(AuthService);
  private router = inject(Router);
  private fileAssetService = inject(FileAssetService);
  private useCaseService = inject(UseCaseService);
  private membershipService = inject(MembershipService);
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
    this.loadUseCases();
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

  loadUseCases(): void {
    this.useCaseService.getUseCases().subscribe({
      next: (useCases) => {
        this.useCases = useCases;
      },
      error: () => {
        this.useCases = [];
      }
    });
  }

  loadStats(): void {
    if (!this.userProfile?.participant?.id) return;

    const participantId = this.userProfile.participant.id;

    this.membershipService.getMemberships(participantId).subscribe({
      next: (memberships) => {
        this.membershipsCount = memberships.length;
        this.recentMemberships = [...memberships].reverse().slice(0, 6);
        this.lastUpdateTime = new Date();
      }
    });


    this.fileAssetService.getFiles(participantId).subscribe({
      next: (files) => {
        this.filesCount = files.length;
        this.lastUpdateTime = new Date();
      }
    });
  }
}
