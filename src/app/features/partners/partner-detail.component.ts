import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PartnerService } from '../../core/services/partner.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../shared/services/notification.service';
import { Partner } from '../../core/models/partner.model';

@Component({
  selector: 'app-partner-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './partner-detail.component.html'
})
export class PartnerDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private partnerService = inject(PartnerService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private destroyRef = inject(DestroyRef);

  partner: Partner | null = null;
  loading = true;
  participantId: string = '';

  ngOnInit(): void {
    this.authService.loadUserProfile().subscribe({
      next: (profile) => {
        this.participantId = profile.participant.id;
        this.loadPartner();
      },
      error: () => {
        this.loading = false;
        this.notificationService.showError('Error', 'Failed to load user profile');
      }
    });
  }

  loadPartner(): void {
    this.route.params.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (params) => {
        const partnerId = params['id'];
        if (partnerId && this.participantId) {
          this.partnerService.getPartner(this.participantId, partnerId).subscribe({
            next: (partner) => {
              this.partner = partner;
              this.loading = false;
            },
            error: () => {
              this.loading = false;
              this.notificationService.showError('Error', 'Failed to load partner details');
            }
          });
        } else {
          this.loading = false;
        }
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/partners']);
  }
}
