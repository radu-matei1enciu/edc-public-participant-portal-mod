import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PartnerService } from '../../core/services/partner.service';
import { DataspaceService } from '../../core/services/dataspace.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../shared/services/notification.service';
import { DataspaceResource } from '../../core/models/dataspace.model';

@Component({
  selector: 'app-partner-add',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './partner-add.component.html'
})
export class PartnerAddComponent implements OnInit {
  partnerForm!: FormGroup;
  dataspaces: DataspaceResource[] = [];
  loading = false;
  submitting = false;

  private partnerService = inject(PartnerService);
  private dataspaceService = inject(DataspaceService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  ngOnInit(): void {
    this.partnerForm = this.fb.group({
      dataspaceId: ['', [Validators.required]],
      nickname: ['', [Validators.required, Validators.minLength(2)]],
      identifier: ['', [Validators.required, Validators.minLength(2)]],
      region: [''],
      industry: [''],
      contactEmail: ['', [Validators.email]],
      status: ['']
    });

    this.loadDataspaces();
  }

  loadDataspaces(): void {
    this.loading = true;
    const userIds = this.authService.getCurrentUserIds();
    if (!userIds) {
      this.loading = false;
      this.notificationService.showError('Error', 'Failed to load user profile');
      this.router.navigate(['/partners']);
      return;
    }

    this.dataspaceService.getParticipantDataspaces(userIds.providerId, userIds.tenantId, userIds.participantId).subscribe({
      next: (dataspaces) => {
        this.dataspaces = dataspaces;
        this.loading = false;
        if (dataspaces.length === 0) {
          this.notificationService.showError('Error', 'No dataspaces available');
          this.router.navigate(['/partners']);
        }
      },
      error: () => {
        this.loading = false;
        this.notificationService.showError('Error', 'Failed to load dataspaces');
        this.router.navigate(['/partners']);
      }
    });
  }

  onSubmit(): void {
    if (this.partnerForm.invalid) {
      this.partnerForm.markAllAsTouched();
      return;
    }

    const userIds = this.authService.getCurrentUserIds();
    if (!userIds) {
      this.notificationService.showError('Error', 'Failed to load user profile');
      return;
    }

    const formValue = this.partnerForm.value;
    const dataspaceId = parseInt(formValue.dataspaceId);
    
    if (!dataspaceId || isNaN(dataspaceId)) {
      this.notificationService.showError('Error', 'Please select a valid dataspace');
      return;
    }

    const propertyKeys = ['region', 'industry', 'contactEmail', 'status'];
    const properties = propertyKeys.reduce((acc, key) => {
      const value = formValue[key];
      if (value) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, unknown>);

    const partnerData = {
      nickname: formValue.nickname,
      identifier: formValue.identifier,
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
