import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  Observable,
  interval,
  startWith,
  switchMap,
  catchError,
  of,
  debounceTime,
  distinctUntilChanged,
  firstValueFrom
} from 'rxjs';
import { FileAssetService } from '../../core/services/file-asset.service';
import { UseCaseService } from '../../core/services/use-case.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../shared/services/notification.service';
import { UserPreferencesService, UserPreferences } from '../../core/services/user-preferences.service';
import { FileAsset } from '../../core/models/file-asset.model';
import { UseCase } from '../../core/models/use-case.model';
import { UserProfile } from '../../core/models/participant.model';
import {EDCDataOperationsService, TenantOperationsService} from "../../core/redline";
import {RedlineUser} from "../../core/models/redline-user.model";

@Component({
  selector: 'app-explore-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './explore-list.component.html',
  })
export class ExploreListComponent implements OnInit {
  private fileAssetService = inject(FileAssetService);
  private useCaseService = inject(UseCaseService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private preferencesService = inject(UserPreferencesService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  private readonly tenantOperationsService = inject(TenantOperationsService)
  private readonly edcDataOperationsService = inject(EDCDataOperationsService)

  files: FileAsset[] = [];
  filteredFiles: FileAsset[] = [];
  useCases: UseCase[] = [];
  filterForm: FormGroup;
  loading = false;
  preferences$: Observable<UserPreferences>;
  currentPage = 1;
  itemsPerPage = 10;
  userProfile: UserProfile | null = null;
  redlineUser?: RedlineUser;
  requestingAccess: string | null = null;

  constructor() {
    this.filterForm = this.fb.group({
      searchTerm: [''],
      useCaseFilter: [''],
      companyFilter: ['']
    });
    this.preferences$ = this.preferencesService.preferences$;
  }

  ngOnInit(): void {
    this.authService.loadUserProfile().subscribe({
      next: (profile) => {
        this.userProfile = profile;
        this.redlineUser = this.authService.getRedlineUser();
        this.loadUseCases();
        this.loadFiles().then();
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
      this.loadFiles().then();
    });

    this.filterForm.get('useCaseFilter')?.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.loadFiles().then();
    });

    this.filterForm.get('companyFilter')?.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.loadFiles().then();
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
    if (!this.redlineUser) return;
    this.loading = true;

    /**
     * ToDo: Get dataspace ID
     */
    const partners = await firstValueFrom(this.tenantOperationsService.getPartners(
        this.redlineUser.providerId, this.redlineUser.tenantId, this.redlineUser.participantId, 0));
    console.log('Partners', JSON.stringify(partners))
    const catalog = await firstValueFrom(this.edcDataOperationsService.requestCatalog(
        this.redlineUser.providerId, this.redlineUser.tenantId, this.redlineUser.participantId,
        { counterPartyIdentifier: partners[0].identifier! }
    ))
    console.log('Catalog', JSON.stringify(catalog))
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
    if (!this.redlineUser) return;

  //   this.requestingAccess = fileId;
  //   this.fileAssetService.requestAccess(this.redlineUser, fileId).subscribe({
  //     next: () => {
  //       this.requestingAccess = null;
  //       this.notificationService.showSuccess('Success', 'Access request submitted');
  //       this.loadFiles();
  //     },
  //     error: () => {
  //       this.requestingAccess = null;
  //       this.notificationService.showError('Error', 'Failed to request access');
  //     }
  //   });
  }
}
