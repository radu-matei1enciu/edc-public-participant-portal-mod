import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SelectedParticipant } from '../../core/models/auth.model';
import { TenantProperties } from '../../core/models/tenant.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.component.html'
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  selectedParticipant: SelectedParticipant | null = null;
  properties: TenantProperties | null = null;

  ngOnInit(): void {
    this.selectedParticipant = this.authService.getSelectedParticipant();
    if (this.selectedParticipant?.tenantProperties) {
      this.properties = this.selectedParticipant.tenantProperties;
    }
  }

  goBack(): void {
    this.router.navigate(['/settings']);
  }

  hasProperties(): boolean {
    return this.properties !== null && this.properties !== undefined && Object.keys(this.properties).length > 0;
  }
}
