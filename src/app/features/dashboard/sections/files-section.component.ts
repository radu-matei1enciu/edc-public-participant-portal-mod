import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FileAssetService } from '../../../core/services/file-asset.service';
import { FileAsset } from '../../../core/models/file-asset.model';
import { UseCase } from '../../../core/models/use-case.model';
import { NotificationService } from '../../../shared/services/notification.service';
import {DATE_FORMATS} from "../../../shared/utils/format.utils";

@Component({
  selector: 'app-files-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './files-section.component.html',
  })
export class FilesSectionComponent implements OnInit {
  @Input() participantId: number | null = null;
  @Input() useCases: UseCase[] = [];
  @Output() viewDetails = new EventEmitter<string>();
  @Output() uploadFile = new EventEmitter<string>();

  files: FileAsset[] = [];
  loading = false;
  filterForm!: FormGroup;
  uploadForm!: FormGroup;
  showExploreSelection = false;
  showUploadDialog = false;
  uploadStep = 1;
  selectedFiles: File[] = [];
  uploading = false;

  private fileAssetService = inject(FileAssetService);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      searchQuery: [''],
      selectedUseCase: [''],
      selectedOrigin: ['']
    });

    this.uploadForm = this.fb.group({
      useCase: [''],
      partnerId: ['']
    });

    this.filterForm.valueChanges.subscribe(() => {
      this.loadFiles();
    });

    if (this.participantId) {
      this.loadFiles();
    }
  }

  loadFiles(): void {
    if (!this.participantId) return;
    this.loading = true;
    const formValue = this.filterForm.value;
    const selectedOrigin = formValue.selectedOrigin;
    this.fileAssetService.getFiles(this.participantId, {
      search: formValue.searchQuery || undefined,
      useCase: formValue.selectedUseCase || undefined,
      origin: selectedOrigin === 'owned' || selectedOrigin === 'remote' ? selectedOrigin : undefined
    }).subscribe({
      next: (files) => {
        this.files = files;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notificationService.showError('Error', 'Failed to load files');
      }
    });
  }


  viewFileDetails(fileId: string): void {
    this.viewDetails.emit(fileId);
  }

  openUploadDialog(): void {
    this.showExploreSelection = false;
    this.showUploadDialog = true;
    this.uploadStep = 1;
    this.selectedFiles = [];
    this.uploadForm.reset();
  }

  closeUploadDialog(): void {
    this.showUploadDialog = false;
    this.uploadStep = 1;
    this.selectedFiles = [];
    this.uploadForm.reset();
  }

  closeExploreSelection(): void {
    this.showExploreSelection = false;
  }

  openSearchDialog(): void {
    this.showExploreSelection = false;
    this.uploadFile.emit('explore');
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedFiles = Array.from(input.files);
    }
  }

  nextStep(): void {
    if (this.canProceed()) {
      this.uploadStep++;
    }
  }

  previousStep(): void {
    if (this.uploadStep > 1) {
      this.uploadStep--;
    }
  }

  canProceed(): boolean {
    if (this.uploadStep === 1) {
      return this.selectedFiles.length > 0;
    }
    if (this.uploadStep === 2) {
      return !!this.uploadForm.get('useCase')?.value;
    }
    return true;
  }

  uploadFiles(): void {
    if (this.selectedFiles.length === 0 || !this.participantId) return;

    this.uploading = true;
    const uploadMetadata = this.uploadForm.value;

    this.fileAssetService.uploadFiles(this.participantId, this.selectedFiles, uploadMetadata).subscribe({
      next: () => {
        this.uploading = false;
        this.closeUploadDialog();
        this.loadFiles();
        this.notificationService.showSuccess('Success', 'Files uploaded successfully');
      },
      error: () => {
        this.uploading = false;
        this.notificationService.showError('Error', 'Failed to upload files');
      }
    });
  }

  getUseCaseLabel(useCaseId?: string): string {
    if (!useCaseId) return 'N/A';
    const useCase = this.useCases.find(uc => uc.id === useCaseId);
    return useCase ? useCase.label : useCaseId;
  }

  protected readonly DATE_FORMATS = DATE_FORMATS;
}
