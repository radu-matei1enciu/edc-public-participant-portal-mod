import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FileAssetService } from '../../../core/services/file-asset.service';
import { FileAsset } from '../../../core/models/file-asset.model';
import { UseCase } from '../../../core/models/use-case.model';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-explore-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './explore-section.component.html',
  })
export class ExploreSectionComponent implements OnInit {
  @Input() participantId: number | null = null;
  @Input() useCases: UseCase[] = [];

  files: FileAsset[] = [];
  loading = false;
  filterForm!: FormGroup;
  requestingAccess: string | null = null;

  private fileAssetService = inject(FileAssetService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      searchQuery: [''],
      selectedUseCase: [''],
      selectedCompany: ['']
    });

    this.filterForm.valueChanges.subscribe(() => {
      this.loadFiles();
    });

    this.loadFiles();
  }

  loadFiles(): void {
    this.loading = true;
    const formValue = this.filterForm.value;
    this.fileAssetService.searchFiles(formValue.searchQuery || '', {
      company: formValue.selectedCompany || undefined,
      useCase: formValue.selectedUseCase || undefined
    }).subscribe({
      next: (files) => {
        this.files = files;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notificationService.showError('Error', 'Failed to search files');
      }
    });
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

  requestAccess(fileId: string): void {
    if (!this.participantId) return;

    this.requestingAccess = fileId;
    this.fileAssetService.requestAccess(this.participantId, fileId).subscribe({
      next: () => {
        this.requestingAccess = null;
        this.notificationService.showSuccess('Success', 'Access request submitted');
        this.loadFiles();
      },
      error: () => {
        this.requestingAccess = null;
        this.notificationService.showError('Error', 'Failed to request access');
      }
    });
  }

  viewFile(fileId: string): void {
    window.location.href = `/dashboard?section=files&file=${fileId}`;
  }
}
