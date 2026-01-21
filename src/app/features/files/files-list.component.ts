import {Component, DestroyRef, inject, OnInit} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {CommonModule} from '@angular/common';
import {Router} from '@angular/router';
import {FormBuilder, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {debounceTime, distinctUntilChanged, Observable} from 'rxjs';
import {UseCaseService} from '../../core/services/use-case.service';
import {AuthService} from '../../core/services/auth.service';
import {NotificationService} from '../../shared/services/notification.service';
import {UserPreferences, UserPreferencesService} from '../../core/services/user-preferences.service';
import {FileAsset} from '../../core/models/file-asset.model';
import {UseCase} from '../../core/models/use-case.model';
import {UserProfile} from '../../core/models/participant.model';
import {formatFileSize} from '../../shared/utils/format.utils';
import {RedlineUIService} from "../../core/redline";
import {FileDetailComponent} from "./file-detail.component";
import {PartnerService} from "../../core/services/partner.service";

@Component({
  selector: 'app-files-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FileDetailComponent],
  templateUrl: './files-list.component.html',
  })
export class FilesListComponent implements OnInit {
  formatFileSize = formatFileSize;
  
  private useCaseService = inject(UseCaseService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private preferencesService = inject(UserPreferencesService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private partnerService = inject(PartnerService);

  private redlineService = inject(RedlineUIService);

  files: FileAsset[] = [];
  filteredFiles: FileAsset[] = [];
  selectedFile?: FileAsset;
  useCases: UseCase[] = [];
  filterForm: FormGroup;
  loading = false;
  preferences$: Observable<UserPreferences>;
  currentPage = 1;
  itemsPerPage = 10;
  userProfile: UserProfile | null = null;
  participantId: number | null = null;
  showExploreSelection = false;
  searchText?: string;
  useCaseFilter?: string;
  originFilter?: string;

  constructor() {
    this.filterForm = this.fb.group({
      searchTerm: [''],
      useCaseFilter: [''],
      originFilter: ['']
    });
    this.preferences$ = this.preferencesService.preferences$;
  }

  async ngOnInit(): Promise<void> {
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
    ).subscribe(value => {
      this.searchText = (value as string).toLowerCase();
      this.applyFilters();
    });

    this.filterForm.get('useCaseFilter')?.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(value => {
      this.useCaseFilter = value;
      this.applyFilters();
    });

    this.filterForm.get('originFilter')?.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(value => {
      this.originFilter = value;
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

    const userIds = this.partnerService.getCurrentUserIds();
    if (!userIds) {
      this.notificationService.showError('Error', 'Can not get the current participant');
      return;
    }
    this.redlineService.listFiles(userIds.participantId, userIds.tenantId, userIds.providerId).subscribe({
      next: (files) => {
        this.files = files.map(file => {
          return {
            name: file.fileName,
            id: file.fileId,
            type: file.contentType,
            uploadedAt: file.uploadDateIso,
            useCase: file.metadata?.['useCase'] ?? '',
            size: file.metadata?.['size'] ?? 0,
            origin: file.metadata?.['origin'] ?? 'owned',
          } as FileAsset
        });
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
    if (this.searchText) {
      this.filteredFiles = this.filteredFiles.filter(file => {
        return file.name.toLowerCase().includes(this.searchText!) ||
            file.useCase?.toLowerCase().includes(this.searchText!) ||
            file.type?.toLowerCase().includes(this.searchText!) ||
            file.origin.toLowerCase().includes(this.searchText!)
      })
    }
    if (this.useCaseFilter && this.useCaseFilter !== 'All Use Cases') {
      this.filteredFiles = this.filteredFiles.filter(file => file.useCase === this.useCaseFilter);
    }
    if (this.originFilter && this.originFilter !== 'All Origins') {
      this.filteredFiles = this.filteredFiles.filter(file => file.origin === this.originFilter);
    }
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
