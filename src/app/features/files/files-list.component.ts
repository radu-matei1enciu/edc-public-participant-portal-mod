import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable, interval, startWith, switchMap, catchError, of, debounceTime, distinctUntilChanged, firstValueFrom } from 'rxjs';
import { FileAssetService } from '../../core/services/file-asset.service';
import { UseCaseService } from '../../core/services/use-case.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../shared/services/notification.service';
import { UserPreferencesService, UserPreferences } from '../../core/services/user-preferences.service';
import { FileAsset } from '../../core/models/file-asset.model';
import { UseCase } from '../../core/models/use-case.model';
import { UserProfile } from '../../core/models/participant.model';

@Component({
  selector: 'app-files-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './files-list.component.html',
  })
export class FilesListComponent implements OnInit {
  private fileAssetService = inject(FileAssetService);
  private useCaseService = inject(UseCaseService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private preferencesService = inject(UserPreferencesService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  files: FileAsset[] = [];
  filteredFiles: FileAsset[] = [];
  useCases: UseCase[] = [];
  filterForm: FormGroup;
  loading = false;
  preferences$: Observable<UserPreferences>;
  currentPage = 1;
  itemsPerPage = 10;
  userProfile: UserProfile | null = null;
  participantId: number | null = null;
  showExploreSelection = false;

  constructor() {
    this.filterForm = this.fb.group({
      searchTerm: [''],
      useCaseFilter: [''],
      originFilter: ['']
    });
    this.preferences$ = this.preferencesService.preferences$;
  }

  ngOnInit(): void {
    this.authService.loadUserProfile().subscribe({
      next: (profile) => {
        this.userProfile = profile;
        this.participantId = profile.participant.id;
        this.loadUseCases();
        this.loadFiles();
      },
      error: () => {
        this.notificationService.showError('Error', 'Failed to load user profile');
      }
    });

    this.preferences$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(prefs => {
      this.itemsPerPage = prefs.defaultPageSize || 10;
      this.currentPage = 1;
    });

    this.filterForm.get('searchTerm')?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.applyFilters();
    });

    this.filterForm.get('useCaseFilter')?.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.applyFilters();
    });

    this.filterForm.get('originFilter')?.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.applyFilters();
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


  loadFiles(): void {
    if (!this.participantId) return;
    
    this.loading = true;
    const filters = {
      search: this.filterForm.get('searchTerm')?.value || undefined,
      useCase: this.filterForm.get('useCaseFilter')?.value || undefined,
      origin: this.filterForm.get('originFilter')?.value || undefined
    };
    
    if (!this.participantId) return;
    this.fileAssetService.getFiles(this.participantId, filters).subscribe({
      next: (files) => {
        this.files = files;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notificationService.showError('Error', 'Failed to load files');
      }
    });
  }

  applyFilters(): void {
    this.filteredFiles = [...this.files];
    this.currentPage = 1;
  }

  getPaginatedFiles(): FileAsset[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredFiles.slice(start, end);
  }

  getTotalPages(): number {
    return Math.ceil(this.filteredFiles.length / this.itemsPerPage);
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.getTotalPages()) {
      this.currentPage++;
    }
  }

  openExploreSelection(): void {
    this.showExploreSelection = true;
  }

  closeExploreSelection(): void {
    this.showExploreSelection = false;
  }

  openUploadSection(): void {
    this.showExploreSelection = false;
    this.router.navigate(['/files/upload']);
  }

  openSearchNetwork(): void {
    this.showExploreSelection = false;
    this.router.navigate(['/explore']);
  }

  formatFileSize(bytes: number | undefined): string {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  getUseCaseLabel(useCaseId?: string): string {
    if (!useCaseId) return 'N/A';
    const useCase = this.useCases.find(uc => uc.id === useCaseId);
    return useCase ? useCase.label : useCaseId;
  }


  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
