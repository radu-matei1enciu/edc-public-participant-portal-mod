import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, firstValueFrom, Observable } from 'rxjs';
import { UseCaseService } from '../../core/services/use-case.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../shared/services/notification.service';
import { UserPreferences, UserPreferencesService } from '../../core/services/user-preferences.service';
import { FileAsset } from '../../core/models/file-asset.model';
import { UseCase } from '../../core/models/use-case.model';
import { EDCDataOperationsService, PartnerReference, TenantOperationsService } from '../../core/redline';
import { RedlineUser } from '../../core/models/redline-user.model';
import { DataspaceService } from '../../core/services/dataspace.service';
import { CatalogService } from '../../core/services/catalog.service';
import { TransferService } from '../../core/services/transfer.service';

@Component({
    selector: 'app-explore-list',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './explore-list.component.html'
})
export class ExploreListComponent implements OnInit {
    private transferService          = inject(TransferService);
    private router                   = inject(Router);
    private useCaseService           = inject(UseCaseService);
    private authService              = inject(AuthService);
    private notificationService      = inject(NotificationService);
    private preferencesService       = inject(UserPreferencesService);
    private destroyRef               = inject(DestroyRef);
    private fb                       = inject(FormBuilder);
    private tenantOperationsService  = inject(TenantOperationsService);
    private edcDataOperationsService = inject(EDCDataOperationsService);
    private dataspaceService         = inject(DataspaceService);
    private catalogService           = inject(CatalogService);

    files: FileAsset[]         = [];
    filteredFiles: FileAsset[] = [];
    useCases: UseCase[]        = [];
    filterForm: FormGroup;
    loading                    = false;
    preferences$: Observable<UserPreferences>;
    currentPage                = 1;
    itemsPerPage               = 10;
    redlineUser?: RedlineUser;
    requestingAccess: string | null  = null;
    navigatingToData: string | null  = null;  // assetId currently being transferred
    partners: PartnerReference[]     = [];
    partnerDataspaceMap              = new Map<string, string>();
    useCaseFilter?: string;
    companyFilter?: string;
    searchText?: string;

    constructor() {
        this.filterForm = this.fb.group({
            searchTerm:    [''],
            useCaseFilter: [''],
            companyFilter: ['']
        });
        this.preferences$ = this.preferencesService.preferences$;
    }

    async ngOnInit(): Promise<void> {
        this.redlineUser = this.authService.getRedlineUser();
        if (!this.redlineUser) {
            this.notificationService.showError('Error', 'Failed to get user information');
            return;
        }

        let allDataspaces = [];
        try {
            allDataspaces = await firstValueFrom(
                this.dataspaceService.getParticipantDataspaces(
                    this.redlineUser.providerId,
                    this.redlineUser.tenantId,
                    this.redlineUser.participantId
                )
            );
        } catch {
            this.notificationService.showError('Error', 'Failed to load dataspaces');
            return;
        }

        if (allDataspaces.length === 0) {
            this.notificationService.showError('Error', 'You are not a member of any dataspace');
            return;
        }

        const seen = new Set<string>();
        const mergedPartners: PartnerReference[] = [];

        for (const dataspace of allDataspaces) {
            try {
                const dsPartners = await firstValueFrom(
                    this.tenantOperationsService.getPartners(
                        this.redlineUser.providerId,
                        this.redlineUser.tenantId,
                        this.redlineUser.participantId,
                        dataspace.id
                    )
                ) as PartnerReference[];

                for (const p of dsPartners) {
                    if (p.identifier && !seen.has(p.identifier)) {
                        seen.add(p.identifier);
                        mergedPartners.push(p);
                        this.partnerDataspaceMap.set(p.identifier, dataspace.name ?? 'N/A');
                    }
                }
            } catch { /* non-fatal */ }
        }

        this.partners = mergedPartners;
        this.loadUseCases();
        await this.loadFiles();

        this.filterForm.get('searchTerm')?.valueChanges.pipe(
            debounceTime(300), distinctUntilChanged(),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(value => { this.searchText = (value as string).toLowerCase(); this.applyFilters(); });

        this.filterForm.get('useCaseFilter')?.valueChanges.pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(value => { this.useCaseFilter = value; this.applyFilters(); });

        this.filterForm.get('companyFilter')?.valueChanges.pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(value => { this.companyFilter = value; this.applyFilters(); });
    }

    loadUseCases(): void {
        this.useCaseService.getUseCases().subscribe({
            next: (useCases) => { this.useCases = useCases; },
            error: () => { this.useCases = []; }
        });
    }

    async loadFiles(): Promise<void> {
        if (!this.redlineUser || this.partners.length === 0) { this.applyFilters(); return; }

        this.files = this.filteredFiles = [];
        this.loading = true;

        try {
            const catalogResults = await Promise.allSettled(
                this.partners.map(partner => this.catalogService.getPartnerCatalog(partner))
            );

            catalogResults
                .filter((r): r is PromiseFulfilledResult<FileAsset[]> => r.status === 'fulfilled')
                .forEach(r => r.value.forEach(file => {
                    if (file.partnerDid && this.partnerDataspaceMap.has(file.partnerDid)) {
                        file.dataspace = this.partnerDataspaceMap.get(file.partnerDid);
                    }
                    this.files.push(file);
                }));

            await this.catalogService.matchContractsToFiles(this.files);
            this.files = this.files.sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
            this.notificationService.showError('Error', (error as Error).message);
        } finally {
            this.applyFilters();
            this.loading = false;
        }
    }

    applyFilters(): void {
        this.filteredFiles = [...this.files];
        if (this.searchText) {
            this.filteredFiles = this.filteredFiles.filter(f =>
                f.name.toLowerCase().includes(this.searchText!) ||
                f.useCase?.toLowerCase().includes(this.searchText!) ||
                f.partnerName?.toLowerCase().includes(this.searchText!)
            );
        }
        if (this.useCaseFilter && this.useCaseFilter !== 'All Use Cases') {
            this.filteredFiles = this.filteredFiles.filter(f => f.useCase === this.useCaseFilter);
        }
        if (this.companyFilter && this.companyFilter !== 'All Companies') {
            this.filteredFiles = this.filteredFiles.filter(f => f.partnerDid === this.companyFilter);
        }
    }

    getPaginatedFiles(): FileAsset[] {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        return this.filteredFiles.slice(start, start + this.itemsPerPage);
    }

    getTotalPages(): number {
        return Math.ceil(this.filteredFiles.length / this.itemsPerPage);
    }

    previousPage(): void { if (this.currentPage > 1) this.currentPage--; }
    nextPage(): void { if (this.currentPage < this.getTotalPages()) this.currentPage++; }

    hasAccess(file: FileAsset): boolean {
        return file.origin === 'remote' && !!file.agreements && file.agreements.length > 0;
    }

    async viewData(file: FileAsset): Promise<void> {
        this.navigatingToData = file.assetId ?? null;

        const token = await this.transferService.requestTransferAndViewData(file);
        this.navigatingToData = null;

        if (!token) return;

        const props = file.catalogDataset?.['edc:properties'] as Record<string, any> | undefined;
        const endpointUrl: string = props?.['edc:endpointUrl'] ?? '';

        console.log('token:', token);
        console.log('endpointUrl:', endpointUrl);
        console.log('full catalogDataset:', JSON.stringify(file.catalogDataset, null, 2));

        if (!endpointUrl) {
            this.notificationService.showError('Error', 'Could not resolve endpoint URL from catalog');
            return;
        }

        this.router.navigate(
            ['/files/view', file.assetId],
            { state: { token, endpointUrl } }
        );
    }

    async requestAccess(file: FileAsset): Promise<void> {
        if (!this.redlineUser || !file.partnerDid || !file.catalogDataset?.['edc:properties']) {
            this.notificationService.showError('Error', 'Missing data'); return;
        }
        if (!file.catalogDataset['edc:properties']['edc:assetId']) {
            this.notificationService.showError('Error', 'Missing asset ID'); return;
        }
        if (!file.catalogDataset.hasPolicy) {
            this.notificationService.showError('Error', 'This endpoint has no data sharing offers'); return;
        }

        this.requestingAccess = file.id;
        try {
            const negotiationId = await firstValueFrom(this.edcDataOperationsService.requestContract(
                this.redlineUser.providerId,
                this.redlineUser.tenantId,
                this.redlineUser.participantId,
                {
                    assetId:     file.catalogDataset['edc:properties']['edc:assetId'] as unknown as string,
                    providerId:  file.partnerDid,
                    offerId:     file.catalogDataset.hasPolicy?.at(0)?.['@id'],
                    permissions: file.catalogDataset.hasPolicy!.at(0)!.permission!.flatMap(pm => pm.constraint ?? [])
                },
                'body', false, { httpHeaderAccept: 'text/plain' }
            ));

            let state = '';
            const deadline = Date.now() + 30_000;
            while (state !== 'FINALIZED' && Date.now() < deadline) {
                await new Promise(r => setTimeout(r, 1000));
                state = (await firstValueFrom(this.edcDataOperationsService.getContractNegotiation(
                    this.redlineUser.providerId,
                    this.redlineUser.tenantId,
                    this.redlineUser.participantId,
                    negotiationId
                ))).state ?? '';
            }

            if (state === 'FINALIZED') {
                this.notificationService.showSuccess('Success', 'Access granted — you can now view the live data');
                await this.catalogService.matchContractsToFiles(this.files);
                // Exclude own files in case they appear in the catalog
                const ownDid = this.authService.getSelectedParticipant()?.participantIdentifier;
                if (ownDid) {
                    this.files = this.files.filter(f => f.partnerDid !== ownDid);
                }
                this.applyFilters();
            } else {
                this.notificationService.showError('Error', `Negotiation timed out in state: ${state}`);
            }
        } catch (error) {
            this.notificationService.showError('Error', (error as Error).message || 'Failed to request access');
        } finally {
            this.requestingAccess = null;
        }
    }
}
