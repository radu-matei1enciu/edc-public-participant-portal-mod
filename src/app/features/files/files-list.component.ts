import {Component, DestroyRef, inject, OnInit} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {CommonModule} from '@angular/common';
import {Router} from '@angular/router';
import {FormBuilder, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {debounceTime, distinctUntilChanged, firstValueFrom, Observable} from 'rxjs';
import {UseCaseService} from '../../core/services/use-case.service';
import {AuthService} from '../../core/services/auth.service';
import {NotificationService} from '../../shared/services/notification.service';
import {UserPreferences, UserPreferencesService} from '../../core/services/user-preferences.service';
import {FileAsset} from '../../core/models/file-asset.model';
import {UseCase} from '../../core/models/use-case.model';
import {DATE_FORMATS, formatFileSize} from '../../shared/utils/format.utils';
import {EDCDataOperationsService, FileResource} from "../../core/redline";
import {FileDetailComponent} from "./file-detail.component";
import {PartnerService} from "../../core/services/partner.service";
import {RedlineUser} from "../../core/models/redline-user.model";
import {DataspaceService} from "../../core/services/dataspace.service";
import {CatalogService} from "../../core/services/catalog.service";
import {TransferService} from "../../core/services/transfer.service";

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
  private readonly partnerService = inject(PartnerService)
  private readonly edcDataOperationsService = inject(EDCDataOperationsService);
  private readonly dataspaceService = inject(DataspaceService);
  private readonly catalogService = inject(CatalogService);
  private readonly transferService = inject(TransferService);

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
  redlineUser?: RedlineUser;
  requestingTransfer?: string;

  constructor() {
    this.filterForm = this.fb.group({
      searchTerm: [''],
      useCaseFilter: [''],
      originFilter: ['']
    });
    this.preferences$ = this.preferencesService.preferences$;
  }

  async ngOnInit(): Promise<void> {
    this.redlineUser = await this.authService.getRedlineUser();
    this.loadUseCases();
    await this.loadFiles();

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
    if (!this.redlineUser) {
      this.notificationService.showError('Error', 'Failed to load the user profile.');
      return;
    }
    this.loading = true;

    try {
      const redlineFiles = await firstValueFrom(this.edcDataOperationsService.listFiles(
          this.redlineUser.participantId, this.redlineUser.tenantId, this.redlineUser.providerId));
      for (const file of redlineFiles) {
        await this.addToFiles(file)
        await this.catalogService.matchContractsToFiles(this.files);
      }
      const catalogFiles = await this.catalogService.getCatalogForAllPartners();
      (await this.catalogService.matchContractsToFiles(catalogFiles))
          .filter(file => file.agreements)
          .forEach(file => this.files.push(file));
    } catch (error) {
      this.notificationService.showError('Error', (error as Error).message);
    } finally {
      this.files = this.files.sort((a, b) => a.name.localeCompare(b.name));
      this.applyFilters();
      this.loading = false;
    }
  }

  private async addToFiles(file: FileResource): Promise<void> {
    const cx = (await firstValueFrom(this.dataspaceService.getDataspaces()))
        .find(ds => ds.name.toLowerCase().includes('catena'));
    if (!this.redlineUser || !cx) return ;

    const useCaseId = file.metadata?.['useCase'] as unknown as string;
    const partnerId = file.metadata?.['partnerId'] as unknown as string;
    let partnerName = '';
    if (partnerId) {
      partnerName = (await firstValueFrom(this.partnerService.getPartnerReference(
          this.redlineUser.providerId,
          this.redlineUser.tenantId,
          this.redlineUser.participantId,
          cx.id,
          partnerId)
      ))?.nickname ?? '';
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
      assetId: file.metadata?.['assetId'] as unknown as string,
      accessRestrictions: partnerId ? [
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

  async requestTransferAndDownload(file: FileAsset): Promise<void> {
    this.requestingTransfer = file.id;
    await this.transferService.requestTransferAndDownload(file);
    this.requestingTransfer = undefined;
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


  protected readonly DATE_FORMATS = DATE_FORMATS;
}
