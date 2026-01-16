import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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
  private notificationService = inject(NotificationService);

  partner: Partner | null = null;
  loading = false;

  ngOnInit(): void {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state && navigation.extras.state['partner']) {
      this.partner = navigation.extras.state['partner'] as Partner;
    } else {
      const historyState = history.state;
      if (historyState && historyState['partner']) {
        this.partner = historyState['partner'] as Partner;
      } else {
        this.loading = false;
        this.notificationService.showError('Error', 'Partner data not available');
        this.goBack();
      }
    }
  }

  goBack(): void {
    this.router.navigate(['/partners']);
  }
}
