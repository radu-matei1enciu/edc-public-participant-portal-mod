import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PartnerService } from '../../core/services/partner.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../shared/services/notification.service';
import { ModalService } from '../../core/services/modal.service';
import { Partner } from '../../core/models/partner.model';
import { DataspaceService } from '../../core/services/dataspace.service';
import { DataspaceResource } from '../../core/models/dataspace.model';
import { getAccessRestrictionPolicy, PARTNER_ACCESS_EXPRESSION } from '../../shared/utils/policy.utils';
import { RedlineUploadService } from '../../core/services/redline-upload.service';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-file-upload',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './file-upload.component.html'
})
export class FileUploadComponent implements OnInit {

    private partnerService     = inject(PartnerService);
    private authService        = inject(AuthService);
    private notificationService = inject(NotificationService);
    private modalService       = inject(ModalService);
    private router             = inject(Router);
    private route              = inject(ActivatedRoute);
    private fb                 = inject(FormBuilder);
    private dataspaceService   = inject(DataspaceService);
    private redlineUploadService = inject(RedlineUploadService);

    participantId: number | null = null;
    dataspaces: DataspaceResource[] = [];
    partners: Partner[] = [];
    loadingPartners = false;
    uploading = false;   // true while the POST is in-flight (label: "Sharing...")

    uploadStep = 1;
    uploadForm!: FormGroup;

    // Step 1 controls — bound directly in the template
    endpointUrlControl  = new FormControl('', [Validators.required, Validators.pattern('https?://.+')]);
    endpointNameControl = new FormControl('', [Validators.required]);

    uploadSteps = [
        { label: 'Endpoint Details', number: 1 },
        { label: 'Select Dataspace', number: 2 },
        { label: 'Manage Access',    number: 3 },
        { label: 'Share',            number: 4 }
    ];

    constructor() {
        this.uploadForm = this.fb.group({
            dataspaceId: [''],
            partnerId:   ['']
        });
    }

    ngOnInit(): void {
        const redlineUser = this.authService.getRedlineUser();
        if (!redlineUser) {
            this.notificationService.showError('Error', 'Failed to load user profile');
            this.router.navigate(['/files']);
            return;
        }

        this.participantId = redlineUser.participantId;
        this.loadDataspaces(redlineUser);

        // Reload partners whenever the selected dataspace changes
        this.uploadForm.get('dataspaceId')?.valueChanges.subscribe(dataspaceId => {
            this.uploadForm.patchValue({ partnerId: '' }, { emitEvent: false });
            this.partners = [];
            if (dataspaceId) {
                this.loadPartners(parseInt(dataspaceId));
            }
        });
    }

    async loadDataspaces(redlineUser: { providerId: number; tenantId: number; participantId: number }): Promise<void> {
        try {
            this.dataspaces = await firstValueFrom(
                this.dataspaceService.getParticipantDataspaces(
                    redlineUser.providerId,
                    redlineUser.tenantId,
                    redlineUser.participantId
                )
            );
            if (this.dataspaces.length === 1) {
                this.uploadForm.patchValue({ dataspaceId: this.dataspaces[0].id.toString() });
            }
        } catch {
            this.notificationService.showError('Error', 'Failed to load your dataspaces');
        }
    }

    loadPartners(dataspaceId: number): void {
        const redlineUser = this.authService.getRedlineUser();
        if (!redlineUser) return;

        this.loadingPartners = true;
        this.partnerService.getPartners(
            redlineUser.providerId,
            redlineUser.tenantId,
            redlineUser.participantId,
            dataspaceId
        ).subscribe({
            next: (partners) => { this.partners = partners; this.loadingPartners = false; },
            error: () => { this.partners = []; this.loadingPartners = false; }
        });
    }

    // ── Navigation ────────────────────────────────────────────────────────

    nextStep(): void {
        if (!this.canProceed()) return;
        if (this.uploadStep === 3) this.preparePreview();
        this.uploadStep++;
    }

    previousStep(): void {
        if (this.uploadStep > 1) this.uploadStep--;
    }

    goToStep(stepNumber: number): void {
        if (!this.canNavigateToStep(stepNumber)) return;
        if (stepNumber === 4) this.preparePreview();
        this.uploadStep = stepNumber;
    }

    canNavigateToStep(stepNumber: number): boolean {
        if (stepNumber === 1) return true;
        if (!this.endpointUrlControl.valid || !this.endpointNameControl.valid) return false;
        if (stepNumber >= 3 && !this.uploadForm.get('dataspaceId')?.value) return false;
        return true;
    }

    canProceed(): boolean {
        if (this.uploadStep === 1) return this.endpointUrlControl.valid && this.endpointNameControl.valid;
        if (this.uploadStep === 2) return !!this.uploadForm.get('dataspaceId')?.value;
        return true;
    }

    getSelectedDataspace(): DataspaceResource | undefined {
        const id = this.uploadForm.get('dataspaceId')?.value;
        return this.dataspaces.find(ds => ds.id.toString() === id);
    }

    // Preview data shown in the summary step
    previewData: { name: string; url: string; dataspace?: string; partner?: string } | null = null;

    preparePreview(): void {
        const dataspaceId = this.uploadForm.get('dataspaceId')?.value;
        const partnerId   = this.uploadForm.get('partnerId')?.value;
        this.previewData = {
            name:      this.endpointNameControl.value ?? '',
            url:       this.endpointUrlControl.value  ?? '',
            dataspace: this.dataspaces.find(ds => ds.id.toString() === dataspaceId)?.name,
            partner:   this.partners.find(p => p.identifier === partnerId)?.nickname
        };
    }

    // ── Submit ────────────────────────────────────────────────────────────

    async registerEndpoint(): Promise<void> {
        if (!this.endpointUrlControl.valid || !this.endpointNameControl.valid) {
            this.notificationService.showError('Error', 'Please fill in the endpoint details');
            return;
        }

        const dataspaceId = parseInt(this.uploadForm.get('dataspaceId')?.value);
        if (isNaN(dataspaceId)) {
            this.notificationService.showError('Error', 'Please select a dataspace');
            return;
        }

        const confirmed = await this.modalService.confirm({
            title:       'Confirm Endpoint Registration',
            message:     `Register "${this.endpointNameControl.value}" as a shared data endpoint?`,
            confirmText: 'Confirm',
            cancelText:  'Cancel'
        });
        if (!confirmed) return;

        this.uploading = true;
        const userIds    = this.authService.getRedlineUser()!;
        const partnerId  = this.uploadForm.get('partnerId')?.value;

        const publicMetadata:  Record<string, any> = {};
        const privateMetadata: Record<string, any> = { dataspaceId };

        this.redlineUploadService.registerEndpoint(
            userIds.providerId,
            dataspaceId,
            userIds.tenantId,
            userIds.participantId,
            this.endpointUrlControl.value!,
            this.endpointNameControl.value!,
            publicMetadata,
            privateMetadata,
            partnerId ? [PARTNER_ACCESS_EXPRESSION] : undefined,
            partnerId ? getAccessRestrictionPolicy(partnerId) : undefined
        ).subscribe({
            next: () => {
                this.uploading = false;
                this.notificationService.showSuccess('Success', `"${this.endpointNameControl.value}" registered successfully`);
                this.router.navigate(['/files']);
            },
            error: (error) => {
                this.uploading = false;
                this.notificationService.showError('Error', error.message || 'Failed to register endpoint');
            }
        });
    }

    closeUpload(): void {
        this.router.navigate(['/files']);
    }
}
