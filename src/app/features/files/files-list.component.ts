import {Component, DestroyRef, inject, OnInit} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {CommonModule} from '@angular/common';
import {Router} from '@angular/router';
import {FormBuilder, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {debounceTime, distinctUntilChanged, firstValueFrom, Observable, of} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {UseCaseService} from '../../core/services/use-case.service';
import {AuthService} from '../../core/services/auth.service';
import {NotificationService} from '../../shared/services/notification.service';
import {UserPreferences, UserPreferencesService} from '../../core/services/user-preferences.service';
import {DataspaceService} from '../../core/services/dataspace.service';
import {FileAsset} from '../../core/models/file-asset.model';
import {UseCase} from '../../core/models/use-case.model';
import {formatFileSize} from '../../shared/utils/format.utils';
import {EDCDataOperationsService, FileResource} from "../../core/redline";
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
  private dataspaceService = inject(DataspaceService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private readonly partnerService = inject(PartnerService)
  private edcDataOperationsService = inject(EDCDataOperationsService);

  files: FileAsset[] = [];
  filteredFiles: FileAsset[] = [];
  selectedFile?: FileAsset;
  useCases: UseCase[] = [];
  filterForm: FormGroup;
  loading = false;
  preferences$: Observable<UserPreferences>;
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
    this.loadUseCases();
    this.loadFiles();

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


  async loadFiles(): Promise<void> {
    this.loading = true;

    const userIds = this.authService.getRedlineUser();
    if (!userIds) {
      this.notificationService.showError('Error', 'Failed to load the user profile.');
      return;
    }
    try {
      const redlineFiles = await firstValueFrom(this.edcDataOperationsService.listFiles(userIds.participantId, userIds.tenantId, userIds.providerId));
      for (const file of redlineFiles) {
        await this.addToFiles(file)
      }
      this.applyFilters();
      this.loading = false;
    } catch (error) {
      this.loading = false;
      this.notificationService.showError('Error', 'Failed to load files');
    }
  }

  private async addToFiles(file: FileResource): Promise<void> {
    const useCaseId = file.metadata?.['useCase'] as unknown as string;
    const partnerId = file.metadata?.['partnerId'] as unknown as string;
    let partnerName = '';
    if (partnerId) {
      const userIds = this.authService.getCurrentUserIds();
      if (userIds) {
        try {
          const dataspaces = await firstValueFrom(
            this.dataspaceService.getParticipantDataspaces(userIds.providerId, userIds.tenantId, userIds.participantId)
          );
          const dataspaceId = dataspaces.length > 0 ? dataspaces[0].id : null;
          if (dataspaceId) {
            const partner = await firstValueFrom(
            this.partnerService.getPartnerReference(userIds.providerId, userIds.tenantId, userIds.participantId, dataspaceId, partnerId)
            );
            partnerName = partner?.nickname ?? '';
          }
        } 
        catch (error) {
          console.log("Error getting partner reference", error);
        }
      }
    }
    this.files.push({
      name: file.fileName ?? '',
      id: file.fileId ?? '',
      type: file.contentType,
      uploadedAt: file.uploadDateIso ?? '',
      useCase: useCaseId ?? '',
      useCaseLabel: this.useCases.find(uc => uc.id === useCaseId)?.label ?? '',
      size: file.metadata?.['size'] as unknown as number ?? 0,
      origin: file.metadata?.['origin'] as unknown as 'owned' | 'remote' ?? 'owned',
      accessRestrictions: partnerId && partnerName?.length ? [
        {
          partnerId: partnerId,
          partnerName: partnerName
        }
      ] : []
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
