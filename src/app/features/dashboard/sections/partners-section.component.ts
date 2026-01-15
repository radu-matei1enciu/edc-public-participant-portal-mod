import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { PartnerService } from '../../../core/services/partner.service';
import { Partner } from '../../../core/models/partner.model';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-partners-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './partners-section.component.html',
  })
export class PartnersSectionComponent implements OnInit {
  @Input() participantId: string = '';

  partners: Partner[] = [];
  loading = false;
  showAddPartnerModal = false;
  addingPartner = false;
  partnerForm!: FormGroup;

  private partnerService = inject(PartnerService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);

  ngOnInit(): void {
    this.partnerForm = this.fb.group({
      name: ['', [Validators.required]],
      description: [''],
      companyIdentifier: ['']
    });

    if (this.participantId) {
      this.loadPartners();
    }
  }

  loadPartners(): void {
    this.loading = true;
    this.partnerService.getPartners(this.participantId).subscribe({
      next: (partners) => {
        this.partners = partners;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notificationService.showError('Error', 'Failed to load partners');
      }
    });
  }

  addPartner(): void {
    if (this.partnerForm.invalid) return;

    this.addingPartner = true;
    this.partnerService.addPartner(this.participantId, this.partnerForm.value).subscribe({
      next: () => {
        this.addingPartner = false;
        this.showAddPartnerModal = false;
        this.partnerForm.reset();
        this.loadPartners();
        this.notificationService.showSuccess('Success', 'Partner added successfully');
      },
      error: () => {
        this.addingPartner = false;
        this.notificationService.showError('Error', 'Failed to add partner');
      }
    });
  }

  closeAddPartnerModal(): void {
    this.showAddPartnerModal = false;
    this.partnerForm.reset();
  }
}
