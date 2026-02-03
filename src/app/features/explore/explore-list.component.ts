import {Component, DestroyRef, inject, OnInit} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {CommonModule} from '@angular/common';
import {FormBuilder, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {debounceTime, distinctUntilChanged, firstValueFrom, Observable} from 'rxjs';
import {UseCaseService} from '../../core/services/use-case.service';
import {AuthService} from '../../core/services/auth.service';
import {NotificationService} from '../../shared/services/notification.service';
import {UserPreferences, UserPreferencesService} from '../../core/services/user-preferences.service';
import {FileAsset} from '../../core/models/file-asset.model';
import {UseCase} from '../../core/models/use-case.model';
import {UserProfile} from '../../core/models/participant.model';
import {EDCDataOperationsService, PartnerReference, TenantOperationsService} from "../../core/redline";
import {RedlineUser} from "../../core/models/redline-user.model";
import {DataspaceService} from "../../core/services/dataspace.service";
import {DataspaceResource} from "../../core/models/dataspace.model";
import {CatalogService} from "../../core/services/catalog.service";
import {TransferService} from "../../core/services/transfer.service";

@Component({
  selector: 'app-explore-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './explore-list.component.html',
  })
export class ExploreListComponent implements OnInit {
  private useCaseService = inject(UseCaseService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private preferencesService = inject(UserPreferencesService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  private readonly tenantOperationsService = inject(TenantOperationsService)
  private readonly edcDataOperationsService = inject(EDCDataOperationsService)
  private readonly dataspaceService = inject(DataspaceService)
  private readonly catalogService = inject(CatalogService)
  private readonly transferService = inject(TransferService)

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
  requestingTransfer?: string;
  catenaX?: DataspaceResource;
  partners?: PartnerReference[];
  useCaseFilter?: string;
  companyFilter?: string;
  searchText?: string;

  constructor() {
    this.filterForm = this.fb.group({
      searchTerm: [''],
      useCaseFilter: [''],
      companyFilter: ['']
    });
    this.preferences$ = this.preferencesService.preferences$;
  }

  async ngOnInit(): Promise<void> {
    this.redlineUser = this.authService.getRedlineUser();
    if (!this.redlineUser) {
      this.notificationService.showError('Error', 'Failed to get user information');
      console.error('Redline user is undefined');
      return;
    }
    this.catenaX = await this.dataspaceService.getCatenaDataspace(this.redlineUser);
    if (!this.catenaX) {
      console.error('No Catena-X dataspace found');
      return;
    }
    this.partners = await firstValueFrom(this.tenantOperationsService.getPartners(
        this.redlineUser.providerId, this.redlineUser.tenantId, this.redlineUser.participantId, this.catenaX.id));

    this.loadUseCases();
    await this.loadFiles();

    // this.preferences$.pipe(
    //   takeUntilDestroyed(this.destroyRef)
    // ).subscribe(prefs => {
    //   this.itemsPerPage = prefs.defaultPageSize || 10;
    //   this.currentPage = 1;
    // });

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

    this.filterForm.get('companyFilter')?.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(value => {
      this.companyFilter = value;
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
    if (!this.redlineUser || !this.catenaX || !this.partners) return;
    this.files = this.filteredFiles = [];
    this.loading = true;
    try {
      (await this.catalogService.getCatalogForAllPartners()).forEach(file => this.files.push(file));
      await this.catalogService.matchContractsToFiles(this.files);
      this.files = this.files.sort((a, b) => a.name.localeCompare(b.name));
    } catch(error) {
      this.notificationService.showError('Error', (error as Error).message);
    } finally {
      this.applyFilters();
      this.loading = false;
    }
  }

  applyFilters(): void {
    this.filteredFiles = [...this.files];
    if (this.searchText) {
      this.filteredFiles = this.filteredFiles.filter(file => {
        return file.name.toLowerCase().includes(this.searchText!) ||
            file.useCase?.toLowerCase().includes(this.searchText!) ||
            file.type?.toLowerCase().includes(this.searchText!) ||
            file.partnerName?.toLowerCase().includes(this.searchText!)
      })
    }
    if (this.useCaseFilter && this.useCaseFilter !== 'All Use Cases') {
      this.filteredFiles = this.filteredFiles.filter(file => file.useCase === this.useCaseFilter);
    }
    if (this.companyFilter && this.companyFilter !== 'All Companies') {
      this.filteredFiles = this.filteredFiles.filter(file => file.partnerDid === this.companyFilter);
    }
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
    return file.origin === 'remote' && !!file.agreements && file.agreements.length > 0;
  }

  async requestAccess(file: FileAsset): Promise<void> {
    if (!this.redlineUser || !file.partnerDid || !file.catalogDataset || !file.catalogDataset["edc:properties"]) {
      console.error('missing data');
      this.notificationService.showError('Error', 'Missing Data');
      return;
    }

    if (!file.catalogDataset["edc:properties"]["edc:assetId"]) {
      console.error('missing assest id');
      this.notificationService.showError('Error', 'Missing asset ID');
      return;
    }
    if (!file.catalogDataset.hasPolicy) {
      console.error('missing offers');
      this.notificationService.showError('Error', 'This file has no data sharing offers');
      return;
    }

    this.requestingAccess = file.id;
    const negotiationId = await firstValueFrom(this.edcDataOperationsService.requestContract(
        this.redlineUser.providerId,
        this.redlineUser.tenantId,
        this.redlineUser.participantId,
        {
          assetId: file.catalogDataset["edc:properties"]["edc:assetId"] as unknown as string,
          providerId: file.partnerDid,
          offerId: file.catalogDataset.hasPolicy?.at(0)?.["@id"],
          permissions: file.catalogDataset.hasPolicy!.at(0)!.permission!.flatMap(pm => pm.constraint ?? [])
        },
        "body", false, {httpHeaderAccept: "text/plain"}
    ))

    let negotiationState = '';
    const startTime = Date.now();
    const maxWaitTime = 30000;
    while (negotiationState !== 'FINALIZED' && Date.now() - startTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      negotiationState = (await firstValueFrom(this.edcDataOperationsService.getContractNegotiation(
          this.redlineUser.providerId,
          this.redlineUser.tenantId,
          this.redlineUser.participantId,
          negotiationId
      ))).state ?? '';
    }
    if (negotiationState === 'FINALIZED') {
      this.notificationService.showSuccess('Success', 'Access granted');
      await this.catalogService.matchContractsToFiles(this.files);
    } else {
      this.notificationService.showError('Error', `Failed to request access. Negotiation state: ${negotiationState}`);
    }
    this.requestingAccess = null;
  }

  async requestTransferAndDownload(file: FileAsset): Promise<void> {
    this.requestingTransfer = file.id;
    await this.transferService.requestTransferAndDownload(file);
    this.requestingTransfer = undefined;
  }

}
