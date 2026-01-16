import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { PartnerService } from '../../../core/services/partner.service';
import { DataspaceService } from '../../../core/services/dataspace.service';
import { ConfigService } from '../../../core/services/config.service';
import { Partner } from '../../../core/models/partner.model';
import { DataspaceResource } from '../../../core/models/ecosystem.model';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-partners-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './partners-section.component.html',
  })
export class PartnersSectionComponent implements OnInit {
  @Input() participantId: number | null = null;

  partners: Partner[] = [];
  dataspaces: DataspaceResource[] = [];
  selectedDataspaceId: number | null = null;
  loading = false;
  filterForm!: FormGroup;
  providerId: number = 1;
  tenantId: number = 1;

  private partnerService = inject(PartnerService);
  private dataspaceService = inject(DataspaceService);
  private configService = inject(ConfigService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      dataspaceId: ['']
    });
    
    this.providerId = this.configService.config?.defaultServiceProviderId || 1;
    this.loadDataspaces();

  }

  onDataspaceChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const dataspaceId = target.value;
    if (dataspaceId) {
      this.selectedDataspaceId = parseInt(dataspaceId);
      this.filterForm.patchValue({ dataspaceId });
      this.loadPartners();
    }
  }

  loadDataspaces(): void {
    this.dataspaceService.getDataspaces().subscribe({
      next: (dataspaces) => {
        this.dataspaces = dataspaces;
        if (dataspaces.length > 0 && !this.selectedDataspaceId) {
          this.selectedDataspaceId = dataspaces[0].id;
          this.filterForm.patchValue({ dataspaceId: dataspaces[0].id.toString() });
        }
      },
      error: () => {
        this.notificationService.showError('Error', 'Failed to load dataspaces');
      }
    });
  }

  loadPartners(): void {
    if (!this.participantId || !this.selectedDataspaceId) return;
    
    this.loading = true;
    this.tenantId = this.participantId;
    
    this.partnerService.getPartners(
      this.providerId,
      this.tenantId,
      this.participantId,
      this.selectedDataspaceId
    ).subscribe({
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
}
