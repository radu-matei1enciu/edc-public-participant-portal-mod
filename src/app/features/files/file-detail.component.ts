import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { FileAssetService } from '../../core/services/file-asset.service';
import { UseCaseService } from '../../core/services/use-case.service';
import { PartnerService } from '../../core/services/partner.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../shared/services/notification.service';
import { ModalService } from '../../core/services/modal.service';
import { FileAsset } from '../../core/models/file-asset.model';
import { UseCase } from '../../core/models/use-case.model';
import { Partner } from '../../core/models/partner.model';
import { formatFileSize } from '../../shared/utils/format.utils';

@Component({
  selector: 'app-file-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './file-detail.component.html'
})
export class FileDetailComponent implements OnInit {
  formatFileSize = formatFileSize;
  
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fileAssetService = inject(FileAssetService);
  private useCaseService = inject(UseCaseService);
  private partnerService = inject(PartnerService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private modalService = inject(ModalService);
  private destroyRef = inject(DestroyRef);

  file: FileAsset | null = null;
  loading = true;
  participantId: number | null = null;
  editing = false;
  editForm!: FormGroup;
  useCases: UseCase[] = [];
  partners: Partner[] = [];
  saving = false;
  private fb = inject(FormBuilder);

  ngOnInit(): void {
    this.editForm = this.fb.group({
      useCase: [''],
      partnerId: ['']
    });

    this.authService.loadUserProfile().pipe(
      switchMap((profile) => {
        this.participantId = profile.participant.id;
        const fileId = this.route.snapshot.params['id'];
        
        const useCases$ = this.useCaseService.getUseCases().pipe(
          catchError(() => of([] as UseCase[]))
        );
        
        const partners$ = this.participantId 
          ? this.partnerService.getPartnersByParticipant(this.participantId).pipe(
              catchError(() => of([] as Partner[]))
            )
          : of([] as Partner[]);
        
        const file$ = fileId && this.participantId
          ? this.fileAssetService.getFileDetails(this.participantId, fileId).pipe(
              catchError(() => {
                this.notificationService.showError('Error', 'Failed to load file details');
                return of(null);
              })
            )
          : of(null);

        return forkJoin({
          useCases: useCases$,
          partners: partners$,
          file: file$
        });
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (result) => {
        this.useCases = result.useCases;
        this.partners = result.partners;
        this.file = result.file;
        this.loading = false;
        if (this.file) {
          this.initializeEditForm();
        }
      },
      error: () => {
        this.loading = false;
        this.notificationService.showError('Error', 'Failed to load user profile');
      }
    });
  }


  goBack(): void {
    this.router.navigate(['/files']);
  }

  downloadAgreement(agreementId: string): void {
    this.notificationService.showInfo('Info', 'Download functionality coming soon');
  }

  getTransactionStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'success':
        return 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed':
        return 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pending':
        return 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }


  getAgreementStatusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'PENDING':
        return 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'EXPIRED':
      case 'CANCELLED':
        return 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  }


  startEditing(): void {
    this.editing = true;
    this.initializeEditForm();
  }

  cancelEditing(): void {
    this.editing = false;
    this.initializeEditForm();
  }

  initializeEditForm(): void {
    if (!this.file) return;

    const currentPartnerId = this.file.accessRestrictions?.[0]?.partnerId ?? '';
    
    this.editForm.patchValue({
      useCase: this.file.useCase ?? '',
      partnerId: currentPartnerId
    });
  }

  async saveChanges(): Promise<void> {
    if (!this.participantId || !this.file) return;

    const confirmed = await this.modalService.confirm({
      title: 'Confirm Edit',
      message: 'Do you want to edit this file?',
      confirmText: 'Confirm',
      cancelText: 'Cancel'
    });

    if (!confirmed) {
      return; 
    }

    this.saving = true;
    const formValue = this.editForm.value;
    
    const updates: { useCase: string; partnerId: string } = {
      useCase: formValue.useCase ?? '',
      partnerId: formValue.partnerId ?? ''
    };

    this.fileAssetService.updateFile(this.participantId, this.file.id, updates).subscribe({
      next: (updatedFile) => {
        this.file = updatedFile;
        this.editing = false;
        this.saving = false;
        this.notificationService.showSuccess('Success', 'File updated successfully');
      },
      error: (error) => {
        this.saving = false;
        this.notificationService.showError('Error', error.message || 'Failed to update file');
      }
    });
  }
}
