import {Component, inject, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ActivatedRoute, Router} from '@angular/router';
import {FormBuilder, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {PartnerService} from '../../core/services/partner.service';
import {AuthService} from '../../core/services/auth.service';
import {NotificationService} from '../../shared/services/notification.service';
import {ModalService} from '../../core/services/modal.service';
import {Partner} from '../../core/models/partner.model';
import {formatFileSize} from '../../shared/utils/format.utils';
import {DataspaceService} from "../../core/services/dataspace.service";
import {DataspaceResource} from "../../core/models/dataspace.model";
import {getAccessRestrictionPolicy, PARTNER_ACCESS_EXPRESSION} from "../../shared/utils/policy.utils";
import {RedlineUploadService} from "../../core/services/redline-upload.service";
import {firstValueFrom} from "rxjs";

@Component({
    selector: 'app-file-upload',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './file-upload.component.html'
})
export class FileUploadComponent implements OnInit {
    formatFileSize = formatFileSize;

    private partnerService = inject(PartnerService);
    private authService = inject(AuthService);
    private notificationService = inject(NotificationService);
    private modalService = inject(ModalService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private fb = inject(FormBuilder);
    private dataspaceService = inject(DataspaceService);
    private redlineUploadService = inject(RedlineUploadService);

    participantId: number | null = null;

    // Dataspaces the current participant belongs to
    dataspaces: DataspaceResource[] = [];
    partners: Partner[] = [];
    loadingPartners = false;

    uploadStep = 1;
    selectedFiles: File[] = [];
    uploadForm!: FormGroup;
    uploading = false;
    filePreviewData: Array<{ name: string; size: number; type: string; dataspace?: string; partner?: string }> = [];

    uploadSteps = [
        { label: 'Select File', number: 1 },
        { label: 'Select Dataspace', number: 2 },
        { label: 'Manage Access', number: 3 },
        { label: 'Upload', number: 4 }
    ];

    constructor() {
        this.uploadForm = this.fb.group({
            dataspaceId: [''],
            partnerId: ['']
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
            // Auto-select if participant is only in one dataspace
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
            next: (partners) => {
                this.partners = partners;
                this.loadingPartners = false;
            },
            error: () => {
                this.partners = [];
                this.loadingPartners = false;
            }
        });
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files) {
            this.selectedFiles = Array.from(input.files);
        }
    }

    nextStep(): void {
        if (!this.canProceed()) return;

        if (this.uploadStep === 3) {
            this.prepareFilePreview();
        }

        this.uploadStep++;
    }

    previousStep(): void {
        if (this.uploadStep > 1) {
            this.uploadStep--;
        }
    }

    goToStep(stepNumber: number): void {
        if (!this.canNavigateToStep(stepNumber)) return;

        if (stepNumber === 4) {
            this.prepareFilePreview();
        }

        this.uploadStep = stepNumber;
    }

    canNavigateToStep(stepNumber: number): boolean {
        if (stepNumber === 1) return true;
        if (this.selectedFiles.length === 0) return false;
        if (stepNumber >= 3 && !this.uploadForm.get('dataspaceId')?.value) return false;
        return true;
    }

    canProceed(): boolean {
        if (this.uploadStep === 1) return this.selectedFiles.length > 0;
        if (this.uploadStep === 2) return !!this.uploadForm.get('dataspaceId')?.value;
        return true;
    }

    getSelectedDataspace(): DataspaceResource | undefined {
        const id = this.uploadForm.get('dataspaceId')?.value;
        return this.dataspaces.find(ds => ds.id.toString() === id);
    }

    prepareFilePreview(): void {
        this.filePreviewData = this.selectedFiles.map(file => {
            const dataspaceId = this.uploadForm.get('dataspaceId')?.value;
            const partnerId = this.uploadForm.get('partnerId')?.value;
            const dataspace = this.dataspaces.find(ds => ds.id.toString() === dataspaceId);
            const partner = this.partners.find(p => p.identifier === partnerId);

            return {
                name: file.name,
                size: file.size,
                type: file.type || 'application/octet-stream',
                dataspace: dataspace?.name,
                partner: partner?.nickname
            };
        });
    }

    async uploadFiles(): Promise<void> {
        if (!this.participantId || this.selectedFiles.length === 0) {
            this.notificationService.showError('Error', 'Please select at least one file');
            return;
        }

        const dataspaceId = parseInt(this.uploadForm.get('dataspaceId')?.value);
        if (isNaN(dataspaceId)) {
            this.notificationService.showError('Error', 'Please select a dataspace');
            return;
        }

        const confirmed = await this.modalService.confirm({
            title: 'Confirm Upload',
            message: 'Do you want to upload the file?',
            confirmText: 'Confirm',
            cancelText: 'Cancel'
        });

        if (!confirmed) return;

        this.uploading = true;
        const uploadMetadata = this.uploadForm.value;
        const userIds = this.authService.getRedlineUser()!;

        const publicMetadata = {
            size: this.selectedFiles[0].size,
        };
        const privateMetadata = {
            partnerId: uploadMetadata.partnerId,
            origin: 'owned',
            dataspaceId: dataspaceId   // stored so the file list can resolve partner names correctly
        };

        this.redlineUploadService.uploadFile(
            userIds.providerId,
            dataspaceId,
            userIds.tenantId,
            userIds.participantId,
            publicMetadata,
            privateMetadata,
            this.selectedFiles[0],
            uploadMetadata.partnerId ? [PARTNER_ACCESS_EXPRESSION] : undefined,
            uploadMetadata.partnerId ? getAccessRestrictionPolicy(uploadMetadata.partnerId) : undefined
        ).subscribe({
            next: () => {
                this.uploading = false;
                this.notificationService.showSuccess('Success', `Successfully uploaded ${this.selectedFiles.length} file(s)`);
                this.router.navigate(['/files']);
            },
            error: (error) => {
                this.uploading = false;
                this.notificationService.showError('Error', error.message || 'Failed to upload files');
            }
        });
    }

    closeUpload(): void {
        this.router.navigate(['/files']);
    }
}
