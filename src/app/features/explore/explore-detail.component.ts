import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FileAssetService } from '../../core/services/file-asset.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../shared/services/notification.service';
import { FileAsset } from '../../core/models/file-asset.model';

@Component({
  selector: 'app-explore-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './explore-detail.component.html'
})
export class ExploreDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fileAssetService = inject(FileAssetService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private destroyRef = inject(DestroyRef);

  file: FileAsset | null = null;
  loading = true;
  participantId: string = '';
  requestingAccess = false;

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
    this.router.navigate(['/explore']);
  }

  hasAccess(file: FileAsset): boolean {
    return file.origin === 'remote' && !!file.accessRestrictions && file.accessRestrictions.length > 0;
  }

  getFileCompany(file: FileAsset): string {
    if (file.accessRestrictions && file.accessRestrictions.length > 0) {
      return file.accessRestrictions[0].partnerName || 'Unknown';
    }
    return 'Unknown';
  }

  requestAccess(): void {
    if (!this.participantId || !this.file) return;

    this.requestingAccess = true;
    this.fileAssetService.requestAccess(this.participantId, this.file.id).subscribe({
      next: () => {
        this.requestingAccess = false;
        this.notificationService.showSuccess('Success', 'Access request submitted');
        this.loadFile();
      },
      error: () => {
        this.requestingAccess = false;
        this.notificationService.showError('Error', 'Failed to request access');
      }
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
