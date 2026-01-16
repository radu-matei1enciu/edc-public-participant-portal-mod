import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileAssetService } from '../../../core/services/file-asset.service';
import { FileAsset } from '../../../core/models/file-asset.model';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-file-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-details.component.html',
  })
export class FileDetailsComponent implements OnInit {
  @Input() participantId: number | null = null;
  @Input() fileId: string = '';
  @Output() close = new EventEmitter<void>();

  file: FileAsset | null = null;
  loading = false;

  private fileAssetService = inject(FileAssetService);
  private notificationService = inject(NotificationService);

  ngOnInit(): void {
    if (this.participantId && this.fileId) {
      this.loadFile();
    }
  }

  loadFile(): void {
    if (!this.participantId) return;
    this.loading = true;
    this.fileAssetService.getFileDetails(this.participantId, this.fileId).subscribe({
      next: (file) => {
        this.file = file;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notificationService.showError('Error', 'Failed to load file details');
      }
    });
  }

  editFile(): void {
    this.notificationService.showInfo('Info', 'Edit functionality coming soon');
  }

  viewAgreementDetails(): void {
    this.notificationService.showInfo('Info', 'Agreement details coming soon');
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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return 'N/A';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}
