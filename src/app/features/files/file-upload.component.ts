import {Component, DestroyRef, inject, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Router} from '@angular/router';
import {FormBuilder, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {FileAssetService} from '../../core/services/file-asset.service';
import {UseCaseService} from '../../core/services/use-case.service';
import {PartnerService} from '../../core/services/partner.service';
import {AuthService} from '../../core/services/auth.service';
import {NotificationService} from '../../shared/services/notification.service';
import {ModalService} from '../../core/services/modal.service';
import {UseCase} from '../../core/models/use-case.model';
import {Partner} from '../../core/models/partner.model';
import {formatFileSize} from '../../shared/utils/format.utils';
import {EDCDataOperationsService} from "../../core/redline";
import {DataspaceService} from "../../core/services/dataspace.service";
import {firstValueFrom} from "rxjs";

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './file-upload.component.html'
})
export class FileUploadComponent implements OnInit {
  formatFileSize = formatFileSize;
  
  private fileAssetService = inject(FileAssetService);
  private useCaseService = inject(UseCaseService);
  private partnerService = inject(PartnerService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private modalService = inject(ModalService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  private edcDataOperationsService = inject(EDCDataOperationsService);
  private dataspaceService = inject(DataspaceService);

  participantId: number | null = null;

  useCases: UseCase[] = [];
  partners: Partner[] = [];
  uploadStep = 1;
  selectedFiles: File[] = [];
  uploadForm!: FormGroup;
  uploading = false;
  filePreviewData: Array<{ name: string; size: number; type: string; useCase?: string; partner?: string }> = [];

  uploadSteps = [
    { label: 'Select File', number: 1 },
    { label: 'Add Details', number: 2 },
    { label: 'Manage Access', number: 3 },
    { label: 'Upload', number: 4 }
  ];

  constructor() {
    this.uploadForm = this.fb.group({
      useCase: [''],
      partnerId: ['']
    });
  }

  ngOnInit(): void {
    this.authService.loadUserProfile().subscribe({
      next: (profile) => {
        this.participantId = profile.participant.id;
        this.loadUseCases();
        this.loadPartners();
      },
      error: () => {
        this.notificationService.showError('Error', 'Failed to load user profile');
        this.router.navigate(['/files']);
      }
    });
  }

  loadUseCases(): void {
    this.useCaseService.getUseCases().subscribe({
      next: (useCases) => {
        this.useCases = useCases;
      },
      error: () => {
        this.useCases = [];
      }
    });
  }

  async loadPartners(): Promise<void> {
    if (!this.participantId) return;
    const ids = this.authService.getCurrentUserIds();
    if (!ids) return;
    
    const cx = (await firstValueFrom(this.dataspaceService.getDataspaces()))
        .find(ds => ds.name.toLowerCase().includes('catena'));
    this.partnerService.getPartners(ids.providerId, ids.tenantId, ids.participantId, cx!.id).subscribe({
      next: (partners) => {
        this.partners = partners;
      },
      error: () => {
        this.partners = [];
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
    if (!this.canNavigateToStep(stepNumber)) {
      return;
    }

    if (stepNumber === 4) {
      this.prepareFilePreview();
    }

    this.uploadStep = stepNumber;
  }

  canNavigateToStep(stepNumber: number): boolean {
    if (stepNumber === 1) {
      return true;
    }
    
    return this.selectedFiles.length > 0;
  }

  canProceed(): boolean {
    if (this.uploadStep === 1) {
      return this.selectedFiles.length > 0;
    }
    if (this.uploadStep === 2) {
      return true;
    }
    if (this.uploadStep === 3) {
      return true;
    }
    return true;
  }


  prepareFilePreview(): void {
    this.filePreviewData = this.selectedFiles.map(file => {
      const useCaseId = this.uploadForm.get('useCase')?.value;
      const partnerId = this.uploadForm.get('partnerId')?.value;
      const useCase = this.useCases.find(uc => uc.id === useCaseId);
      const partner = this.partners.find(p => p.identifier === partnerId);
      
      return {
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        useCase: useCase?.label,
        partner: partner?.nickname
      };
    });
  }

  async uploadFiles(): Promise<void> {
    if (!this.participantId || this.selectedFiles.length === 0) {
      this.notificationService.showError('Error', 'Please select at least one file');
      return;
    }

    const confirmed = await this.modalService.confirm({
      title: 'Confirm Upload',
      message: 'Do you want to upload the file?',
      confirmText: 'Confirm',
      cancelText: 'Cancel'
    });

    if (!confirmed) {
      return;
    }

    this.uploading = true;
    const uploadMetadata = this.uploadForm.value;


    const userIds = this.authService.getRedlineUser()!;
    const publicMetadata = {
      useCase: uploadMetadata.useCase,
      size: this.selectedFiles[0].size,
    }
    const privateMetadata = {
      partnerId: uploadMetadata.partnerId,
      origin: 'owned'
    }
    this.edcDataOperationsService.uploadFile(userIds.participantId, userIds.tenantId, userIds.providerId,
        JSON.stringify(publicMetadata),
        JSON.stringify(privateMetadata),
        this.selectedFiles[0])
        .subscribe({
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

    //
    // this.fileAssetService.uploadFiles(this.participantId, this.selectedFiles, {
    //   useCase: uploadMetadata.useCase || undefined,
    //   partnerId: uploadMetadata.partnerId || undefined,
    //   description: '',
    //   dataspace: undefined
    // }).subscribe({
    //   next: () => {
    //     this.uploading = false;
    //     this.notificationService.showSuccess('Success', `Successfully uploaded ${this.selectedFiles.length} file(s)`);
    //     this.router.navigate(['/files']);
    //   },
    //   error: (error) => {
    //     this.uploading = false;
    //     this.notificationService.showError('Error', error.message || 'Failed to upload files');
    //   }
    // });
  }

  closeUpload(): void {
    this.router.navigate(['/files']);
  }

}
