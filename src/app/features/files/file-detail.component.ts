import {Component, DestroyRef, EventEmitter, inject, Input, OnInit, Output} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {CommonModule} from '@angular/common';
import {ActivatedRoute} from '@angular/router';
import {FormBuilder, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {firstValueFrom, forkJoin, of} from 'rxjs';
import {catchError, switchMap} from 'rxjs/operators';
import {FileAssetService} from '../../core/services/file-asset.service';
import {UseCaseService} from '../../core/services/use-case.service';
import {PartnerService} from '../../core/services/partner.service';
import {AuthService} from '../../core/services/auth.service';
import {NotificationService} from '../../shared/services/notification.service';
import {ModalService} from '../../core/services/modal.service';
import {FileAsset} from '../../core/models/file-asset.model';
import {UseCase} from '../../core/models/use-case.model';
import {Partner} from '../../core/models/partner.model';
import {DATE_FORMATS, formatFileSize} from '../../shared/utils/format.utils';
import {DataspaceService} from "../../core/services/dataspace.service";
import {EDCDataOperationsService} from "../../core/redline";

@Component({
  selector: 'app-file-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './file-detail.component.html'
})
export class FileDetailComponent implements OnInit {
  formatFileSize = formatFileSize;
  
  private route = inject(ActivatedRoute);
  private fileAssetService = inject(FileAssetService);
  private useCaseService = inject(UseCaseService);
  private partnerService = inject(PartnerService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private modalService = inject(ModalService);
  private destroyRef = inject(DestroyRef);
  private readonly dataspaceService = inject(DataspaceService)
  private readonly edcDataOperationsService = inject(EDCDataOperationsService)

  @Input() file: FileAsset | null = null;
  @Output() closeDetails = new EventEmitter<void>();


  loading = true;
  participantId: number | null = null;
  editing = false;
  editForm!: FormGroup;
  useCases: UseCase[] = [];
  partners: Partner[] = [];
  saving = false;
  private fb = inject(FormBuilder);

  async ngOnInit(): Promise<void> {
    this.editForm = this.fb.group({
      useCase: [''],
      partnerId: ['']
    });

    const redlineUser = this.authService.getRedlineUser();
    const cx = (await firstValueFrom(this.dataspaceService.getDataspaces()))
        .find(ds => ds.name.toLowerCase().includes('catena'));
    if (!redlineUser || !cx) return;

    this.authService.loadUserProfile().pipe(
      switchMap((profile) => {
        this.participantId = profile.participant.id;

        const useCases$ = this.useCaseService.getUseCases().pipe(
          catchError(() => of([] as UseCase[]))
        );

        const partners$ = this.participantId
          ? this.partnerService.getPartners(
              redlineUser.participantId,
                redlineUser.tenantId,
                redlineUser.participantId,
                cx.id
            ).pipe(
              catchError(() => of([] as Partner[]))
            )
          : of([] as Partner[]);
        
        return forkJoin({
          useCases: useCases$,
          partners: partners$,
          file: of(this.file)
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

    await this.getTransfers();
  }

  async getTransfers(): Promise<void> {
    this.loading = true;
    const redlineUser = this.authService.getRedlineUser();
    if (!redlineUser || !this.file || !this.file.agreements) return;
    this.file.transactionHistory = [];
    try {
      const transfers = await firstValueFrom(this.edcDataOperationsService.listTransferProcesses(
          redlineUser.providerId, redlineUser.tenantId, redlineUser.participantId));
      for (const agreement of this.file.agreements) {
        transfers.filter(transfer => transfer.contractId === agreement.id)
            .forEach(transfer => {
              this.file!.transactionHistory!.push({
                id: transfer.correlationId ?? 'N/A',
                partnerId: agreement.partnerId,
                partnerName: agreement.partnerName,
                type: transfer.type === 'CONSUMER' ? 'access' : 'share',
                status: transfer.state === 'STARTED' ? 'success' : 'failed',
                timestamp: new Date(transfer.stateTimestamp!).toISOString()
              })
            })
      }
    } catch (e) {
      this.notificationService.showError('Error', (e as Error).message);
    } finally {
      this.loading = false;
    }
  }

  goBack(): void {
    this.closeDetails.emit();
  }

  downloadAgreement(agreementId: string): void {
    this.notificationService.showInfo('Info', 'Download functionality coming soon');
  }

  getTransactionStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'success':
        return 'px-2 inline-flex text-sm leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed':
        return 'px-2 inline-flex text-sm leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pending':
        return 'px-2 inline-flex text-sm leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'px-2 inline-flex text-sm leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  }


  getAgreementStatusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'px-2 inline-flex text-sm leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'PENDING':
        return 'px-2 inline-flex text-sm leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'EXPIRED':
      case 'CANCELLED':
        return 'px-2 inline-flex text-sm leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'px-2 inline-flex text-sm leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
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

  protected readonly DATE_FORMATS = DATE_FORMATS;
}
