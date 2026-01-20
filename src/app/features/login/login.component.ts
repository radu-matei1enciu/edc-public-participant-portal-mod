import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TenantService } from '../../core/services/tenant.service';
import { ConfigService } from '../../core/services/config.service';
import { AuthService } from '../../core/services/auth.service';
import { TenantResource, ParticipantResource } from '../../core/models/tenant.model';
import { SelectedParticipant } from '../../core/models/auth.model';

interface ParticipantOption {
  tenantId: number;
  participantId: number;
  tenantName: string;
  participantIdentifier: string;
  displayName: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  private tenantService = inject(TenantService);
  private configService = inject(ConfigService);
  private authService = inject(AuthService);
  private router = inject(Router);

  tenants: TenantResource[] = [];
  participantOptions: ParticipantOption[] = [];
  filteredOptions: ParticipantOption[] = [];
  searchControl = new FormControl('');
  selectedParticipant: ParticipantOption | null = null;
  isLoading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadTenants();
    
    this.searchControl.valueChanges.subscribe(() => {
      this.filterParticipants();
    });
  }

  loadTenants(): void {
    this.isLoading = true;
    this.errorMessage = '';
    const providerId = this.configService.config?.defaultServiceProviderId || 1;

    this.tenantService.getTenants(providerId).subscribe({
      next: (tenants) => {
        this.tenants = tenants;
        this.buildParticipantOptions();
        this.filterParticipants();
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load participants. Please try again.';
        console.error('Error loading tenants:', error);
      }
    });
  }

  private buildParticipantOptions(): void {
    this.participantOptions = [];
    
    this.tenants.forEach(tenant => {
      tenant.participants.forEach(participant => {
        this.participantOptions.push({
          tenantId: tenant.id,
          participantId: participant.id,
          tenantName: tenant.name,
          participantIdentifier: participant.identifier,
          displayName: `${tenant.name} - ${participant.identifier}`
        });
      });
    });

    this.participantOptions.sort((a, b) => {
      if (a.tenantName !== b.tenantName) {
        return a.tenantName.localeCompare(b.tenantName);
      }
      return a.participantIdentifier.localeCompare(b.participantIdentifier);
    });
  }

  filterParticipants(): void {
    const searchTerm = this.searchControl.value || '';
    if (!searchTerm.trim()) {
      this.filteredOptions = [...this.participantOptions];
      return;
    }

    const term = searchTerm.toLowerCase();
    this.filteredOptions = this.participantOptions.filter(option =>
      option.tenantName.toLowerCase().includes(term) ||
      option.participantIdentifier.toLowerCase().includes(term) ||
      option.displayName.toLowerCase().includes(term)
    );
  }

  selectParticipant(option: ParticipantOption): void {
    this.selectedParticipant = option;
  }

  login(): void {
    if (!this.selectedParticipant) {
      this.errorMessage = 'Please select a participant';
      return;
    }

    const selected: SelectedParticipant = {
      tenantId: this.selectedParticipant.tenantId,
      participantId: this.selectedParticipant.participantId,
      tenantName: this.selectedParticipant.tenantName,
      participantIdentifier: this.selectedParticipant.participantIdentifier
    };

    this.authService.setSelectedParticipant(selected);
    
    const returnUrl = localStorage.getItem('returnUrl') || '/dashboard';
    localStorage.removeItem('returnUrl');
    this.router.navigate([returnUrl]);
  }

  cancel(): void {
    this.router.navigate(['/']);
  }
}
