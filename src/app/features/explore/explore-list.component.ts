import {Component, DestroyRef, inject, OnInit} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {CommonModule} from '@angular/common';
import {FormBuilder, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {debounceTime, distinctUntilChanged, firstValueFrom, Observable} from 'rxjs';
import {FileAssetService} from '../../core/services/file-asset.service';
import {UseCaseService} from '../../core/services/use-case.service';
import {AuthService} from '../../core/services/auth.service';
import {NotificationService} from '../../shared/services/notification.service';
import {UserPreferences, UserPreferencesService} from '../../core/services/user-preferences.service';
import {FileAsset} from '../../core/models/file-asset.model';
import {UseCase} from '../../core/models/use-case.model';
import {UserProfile} from '../../core/models/participant.model';
import {EDCDataOperationsService, PartnerReference, TenantOperationsService, TransferProcess} from "../../core/redline";
import {RedlineUser} from "../../core/models/redline-user.model";
import {DataspaceService} from "../../core/services/dataspace.service";

@Component({
  selector: 'app-explore-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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
  private readonly dataspaceService = inject(DataspaceService)

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
    this.files = this.filteredFiles = [];
    this.loading = true;

    /**
     * ToDo: Get dataspace ID
     */
    const partners = await firstValueFrom(this.tenantOperationsService.getPartners(
        this.redlineUser.providerId, this.redlineUser.tenantId, this.redlineUser.participantId, 0));
    for (const partner of partners) {
      (await this.getPartnerCatalog(partner)).forEach(file => this.files.push(file));
    }
    await this.matchContractsToFiles();
    this.filteredFiles = this.files
    this.loading = false;
  }

  private async matchContractsToFiles(): Promise<void> {
    if (!this.redlineUser) return;
    const contracts = await firstValueFrom(this.edcDataOperationsService.listContracts(
        this.redlineUser.providerId, this.redlineUser.tenantId, this.redlineUser.participantId
    ));
    for (const contract of contracts) {
      const matchingFile = this.files.find(file => file.catalogDataset?.["edc:properties"]?.["edc:assetId"] === contract.assetId);
      if (matchingFile && contract.counterParty === matchingFile.partnerDid && !contract.pending) {
        matchingFile.accessRestrictions = [
          {
            partnerName: matchingFile.partnerName,
            partnerId: contract.counterParty,
            contractId: contract.id
          }
        ]
      }
    }
  }

  private async getPartnerCatalog(partner: PartnerReference): Promise<FileAsset[]> {
    if (!this.redlineUser) return [];
    const catalog = await firstValueFrom(this.edcDataOperationsService.requestCatalog(
        this.redlineUser.providerId, this.redlineUser.tenantId, this.redlineUser.participantId,
        { counterPartyIdentifier: partner.identifier! }
    ));
    if (catalog.dataset) {
      return catalog.dataset.map(ds => {
        const useCaseId = ds["edc:properties"]?.["edc:useCase"] as unknown as string;
        return {
          name: ds["edc:properties"]?.["edc:originalFilename"] ?? 'N/A',
          useCase: useCaseId ?? 'N/A',
          useCaseLabel: this.useCases.find(uc => uc.id === useCaseId)?.label ?? '',
          size: ds["edc:properties"]?.["edc:size"] as unknown as number ?? undefined,
          description: ds["edc:properties"]?.['description'] ?? 'N/A',
          id: ds["edc:properties"]?.["edc:fileId"] ?? 'N/A',
          origin: "remote",
          uploadedAt: 'N/A',
          dataspace: 'Catena-X', // ToDo: get dataspace
          catalogDataset: ds,
          partnerName: partner.nickname,
          partnerDid: partner.identifier
        } as FileAsset
      });
    }
    return [];
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
    while (negotiationState !== 'FINALIZED' && negotiationState !== 'TERMINATED') {
      await new Promise(resolve => setTimeout(resolve, 500));
      negotiationState = (await firstValueFrom(this.edcDataOperationsService.getContractNegotiation(
       this.redlineUser.providerId,
       this.redlineUser.tenantId,
       this.redlineUser.participantId,
       negotiationId
      ))).state ?? '';
    }
    if (negotiationState === 'FINALIZED') {
      this.notificationService.showSuccess('Success', 'Access granted');
      await this.matchContractsToFiles();
    } else {
      this.notificationService.showError('Error', 'Failed to request access');
    }
    this.requestingAccess = null;
  }

  async requestTransferAndDownload(file: FileAsset): Promise<void> {
    if (!this.redlineUser || !file.accessRestrictions || !file.accessRestrictions[0].contractId || !file.catalogDataset?.distribution) {
      console.error('missing data');
      this.notificationService.showError('Error', 'Missing Data');
      return;
    }

    this.requestingTransfer = file.id;
    const transferProcessId = await firstValueFrom(this.edcDataOperationsService.requestTransfer(
        this.redlineUser.providerId, this.redlineUser.tenantId, this.redlineUser.participantId,
        {
          contractId: file.accessRestrictions[0].contractId,
          counterPartyId: file.partnerDid,
          transferType: file.catalogDataset.distribution[0].format
        },
        "body", false, {httpHeaderAccept: "text/plain"}
    ))

    let transferProcess: TransferProcess | undefined = undefined;
    while (transferProcess?.state !== 'STARTED' && transferProcess?.state !== 'TERMINATED') {
      await new Promise(resolve => setTimeout(resolve, 500));
      transferProcess = await firstValueFrom(this.edcDataOperationsService.getTransferProcess(
          this.redlineUser.providerId, this.redlineUser.tenantId, this.redlineUser.participantId,
          transferProcessId
      ));
    }
    if (transferProcess.state === 'STARTED') {
      const token = (transferProcess.contentDataAddress?.["properties"] as Record<string, string>)?.["https://w3id.org/edc/v0.0.1/ns/authorization"];
      const data: Blob = await firstValueFrom(this.edcDataOperationsService.downloadData(
          this.redlineUser.providerId, this.redlineUser.tenantId, this.redlineUser.participantId,
          file.id,
          token
      ));
      this.startBrowserDownload(data, file);
    } else {
      this.notificationService.showError('Error', 'Failed to transfer file');
    }
    this.requestingTransfer = undefined;
  }

  private startBrowserDownload(data: Blob, file: FileAsset): void {
    const url = window.URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

  }
}
