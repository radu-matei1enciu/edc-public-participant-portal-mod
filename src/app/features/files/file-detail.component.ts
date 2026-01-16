import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FileAssetService } from '../../core/services/file-asset.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../shared/services/notification.service';
import { FileAsset } from '../../core/models/file-asset.model';

@Component({
  selector: 'app-file-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-detail.component.html'
})
export class FileDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fileAssetService = inject(FileAssetService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private destroyRef = inject(DestroyRef);

  file: FileAsset | null = null;
  loading = true;
  participantId: number | null = null;

  ngOnInit(): void {
    this.authService.loadUserProfile().subscribe({
      next: (profile) => {
        this.participantId = profile.participant.id;
        this.loadFile();
      },
      error: () => {
        this.loading = false;
        this.notificationService.showError('Error', 'Failed to load user profile');
      }
    });
  }

  loadFile(): void {
    this.route.params.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (params) => {
        const fileId = params['id'];
        if (fileId && this.participantId) {
          this.fileAssetService.getFileDetails(this.participantId, fileId).subscribe({
            next: (file) => {
              this.file = file;
              this.loading = false;
            },
            error: () => {
              this.loading = false;
              this.notificationService.showError('Error', 'Failed to load file details');
            }
          });
        } else {
          this.loading = false;
        }
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

  formatFileSize(bytes: number): string {
    if (!bytes) return 'N/A';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}
