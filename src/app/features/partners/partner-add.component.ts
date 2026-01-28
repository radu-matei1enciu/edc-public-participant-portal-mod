import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PartnerService } from '../../core/services/partner.service';
import { DataspaceService } from '../../core/services/dataspace.service';
import { TenantService } from '../../core/services/tenant.service';
import { AuthService } from '../../core/services/auth.service';
import { ConfigService } from '../../core/services/config.service';
import { NotificationService } from '../../shared/services/notification.service';
import { DataspaceResource } from '../../core/models/dataspace.model';
import { TenantResource } from '../../core/models/tenant.model';

export interface PartnerParticipantOption {
  tenantId: number;
  participantId: number;
  tenantName: string;
  participantIdentifier: string;
  displayName: string;
}

@Component({
  selector: 'app-partner-add',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './partner-add.component.html'
})
export class PartnerAddComponent implements OnInit {
  partnerForm!: FormGroup;
  dataspaces: DataspaceResource[] = [];
  partnerParticipantOptions: PartnerParticipantOption[] = [];
  loading = false;
  submitting = false;

  private partnerService = inject(PartnerService);
  private dataspaceService = inject(DataspaceService);
  private tenantService = inject(TenantService);
  private authService = inject(AuthService);
  private configService = inject(ConfigService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  ngOnInit(): void {
    this.partnerForm = this.fb.group({
      dataspaceId: ['', [Validators.required]],
      partnerParticipantIdentifier: ['', [Validators.required]],
      nickname: ['', [Validators.required, Validators.minLength(2)]],
      region: [''],
      industry: [''],
      contactEmail: ['', [Validators.email]],
      status: ['']
    });

    this.loadData();
  }

  /** Carica dataspaces e lista partecipanti dello stesso tenant come nel login. */
  loadData(): void {
    this.loading = true;
    const userIds = this.authService.getRedlineUser();
    if (!userIds) {
      this.loading = false;
      this.notificationService.showError('Error', 'Failed to load user profile');
      this.router.navigate(['/partners']);
      return;
    }

    const providerId = this.configService.config?.defaultServiceProviderId ?? userIds.providerId;

    forkJoin({
      dataspaces: this.dataspaceService.getParticipantDataspaces(userIds.providerId, userIds.tenantId, userIds.participantId),
      tenants: this.tenantService.getTenants(providerId)
    }).subscribe({
      next: ({ dataspaces, tenants }) => {
        this.dataspaces = dataspaces;
        this.buildPartnerParticipantOptions(tenants, userIds.tenantId, userIds.participantId);
        this.loading = false;
        if (dataspaces.length === 0) {
          this.notificationService.showError('Error', 'No dataspaces available');
          this.router.navigate(['/partners']);
        }
      },
      error: () => {
        this.loading = false;
        this.notificationService.showError('Error', 'Failed to load data');
        this.router.navigate(['/partners']);
      }
    });
  }

  private buildPartnerParticipantOptions(tenants: TenantResource[], currentTenantId: number, currentParticipantId: number): void {
    this.partnerParticipantOptions = [];
    tenants.forEach(tenant => {
      tenant.participants
        .filter(p => !(tenant.id === currentTenantId && p.id === currentParticipantId))
        .forEach(participant => {
          this.partnerParticipantOptions.push({
            tenantId: tenant.id,
            participantId: participant.id,
            tenantName: tenant.name,
            participantIdentifier: participant.identifier,
            displayName: `${tenant.name} - ${participant.identifier}`
          });
        });
    });
    this.partnerParticipantOptions.sort((a, b) => {
      if (a.tenantName !== b.tenantName) return a.tenantName.localeCompare(b.tenantName);
      return a.participantIdentifier.localeCompare(b.participantIdentifier);
    });
  }

  onSubmit(): void {
    if (this.partnerForm.invalid) {
      this.partnerForm.markAllAsTouched();
      return;
    }

    const userIds = this.authService.getRedlineUser();
    if (!userIds) {
      this.notificationService.showError('Error', 'Failed to load user profile');
      return;
    }

    const formValue = this.partnerForm.value;
    const partnerIdentifier = formValue.partnerParticipantIdentifier as string;
    if (!partnerIdentifier) {
      this.notificationService.showError('Error', 'Please select the partner participant');
      return;
    }

    const dataspaceId = parseInt(formValue.dataspaceId);
    if (!dataspaceId || isNaN(dataspaceId)) {
      this.notificationService.showError('Error', 'Please select a valid dataspace');
      return;
    }

    const propertyKeys = ['region', 'industry', 'contactEmail', 'status'];
    const properties: Record<string, unknown> = {};
    propertyKeys.forEach(key => {
      const value = formValue[key];
      if (value) {
        properties[key] = value;
      }
    });

    const partnerData = {
      nickname: formValue.nickname,
      identifier: partnerIdentifier,
      ...(Object.keys(properties).length > 0 && { properties })
    };

    this.submitting = true;
    this.partnerService.addPartner(
      userIds.providerId,
      userIds.tenantId,
      userIds.participantId,
      dataspaceId,
      partnerData
    ).subscribe({
      next: () => {
        this.notificationService.showSuccess('Success', 'Partner added successfully');
        this.router.navigate(['/partners']);
      },
      error: (error) => {
        this.submitting = false;
        let errorMessage = 'Failed to add partner. Please try again.';
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        this.notificationService.showError('Error', errorMessage);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/partners']);
  }
}
