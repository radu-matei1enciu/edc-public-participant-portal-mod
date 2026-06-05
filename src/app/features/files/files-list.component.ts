import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, firstValueFrom, Observable } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../shared/services/notification.service';
import { UserPreferences, UserPreferencesService } from '../../core/services/user-preferences.service';
import { FileAsset } from '../../core/models/file-asset.model';
import { EndpointService } from '../../core/services/endpoint.service';
import { EndpointResource } from '../../core/models/endpoint-resource.model';
import { RedlineUser } from '../../core/models/redline-user.model';
import { DATE_FORMATS } from '../../shared/utils/format.utils';
import { DataspaceService } from '../../core/services/dataspace.service';
import { TenantOperationsService, PartnerReference } from '../../core/redline';
import { CatalogService } from '../../core/services/catalog.service';
import { TransferService } from '../../core/services/transfer.service';

@Component({
    selector: 'app-files-list',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './files-list.component.html'
})
export class FilesListComponent implements OnInit {

    private authService             = inject(AuthService);
    private notificationService     = inject(NotificationService);
    private preferencesService      = inject(UserPreferencesService);
    private destroyRef              = inject(DestroyRef);
    private fb                      = inject(FormBuilder);
    private router                  = inject(Router);
    private endpointService         = inject(EndpointService);
    private dataspaceService        = inject(DataspaceService);
    private tenantOperationsService = inject(TenantOperationsService);
    private catalogService          = inject(CatalogService);
    private transferService         = inject(TransferService);

    files: FileAsset[]         = [];
    filteredFiles: FileAsset[] = [];
    filterForm: FormGroup;
    loading                    = false;
    preferences$: Observable<UserPreferences>;
    redlineUser?: RedlineUser;
    navigatingToData: string | null = null;
    searchText?: string;

    constructor() {
        this.filterForm  = this.fb.group({ searchTerm: [''] });
        this.preferences$ = this.preferencesService.preferences$;
    }

    async ngOnInit(): Promise<void> {
        this.redlineUser = this.authService.getRedlineUser();
        await this.loadAllFiles();

        this.filterForm.get('searchTerm')?.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(value => {
            this.searchText = (value as string).toLowerCase();
            this.applyFilters();
        });
    }

    async loadAllFiles(): Promise<void> {
        if (!this.redlineUser) return;
        this.loading = true;
        this.files   = [];

        try {
            // 1. Own registered endpoints
            const ownEndpoints = await firstValueFrom(
                this.endpointService.listEndpoints(
                    this.redlineUser.providerId,
                    this.redlineUser.tenantId,
                    this.redlineUser.participantId
                )
            );
            const ownFiles = ownEndpoints.map(ep => this.mapOwnEndpoint(ep));

            // 2. Remote files with access (from partner catalogs)
            const remoteFiles = await this.loadRemoteAccessibleFiles();

            this.files = [...ownFiles, ...remoteFiles];
        } catch (error) {
            this.notificationService.showError('Error', (error as Error).message || 'Failed to load data');
        } finally {
            this.applyFilters();
            this.loading = false;
        }
    }

    private mapOwnEndpoint(ep: EndpointResource): FileAsset {
        return {
            id:          ep.assetId,
            name:        ep.name,
            assetId:     ep.assetId,
            description: ep.endpointUrl,
            origin:      'owned',
            uploadedAt:  (ep.metadata?.['registeredAt'] as string) ?? new Date().toISOString()
        };
    }

    private async loadRemoteAccessibleFiles(): Promise<FileAsset[]> {
        if (!this.redlineUser) return [];

        let allDataspaces: any[] = [];
        try {
            allDataspaces = await firstValueFrom(
                this.dataspaceService.getParticipantDataspaces(
                    this.redlineUser.providerId,
                    this.redlineUser.tenantId,
                    this.redlineUser.participantId
                )
            );
        } catch { return []; }

        const ownDid = this.authService.getSelectedParticipant()?.participantIdentifier;
        const seen   = new Set<string>();
        const partners: PartnerReference[] = [];
        const partnerDataspaceMap = new Map<string, string>();

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
                    if (p.identifier && !seen.has(p.identifier) && p.identifier !== ownDid) {
                        seen.add(p.identifier);
                        partners.push(p);
                        partnerDataspaceMap.set(p.identifier, dataspace.name ?? 'N/A');
                    }
                }
            } catch { /* non-fatal */ }
        }

        if (partners.length === 0) return [];

        const remoteFiles: FileAsset[] = [];

        const catalogResults = await Promise.allSettled(
            partners.map(p => this.catalogService.getPartnerCatalog(p))
        );

        catalogResults
            .filter((r): r is PromiseFulfilledResult<FileAsset[]> => r.status === 'fulfilled')
            .forEach(r => r.value.forEach(file => {
                if (file.partnerDid && partnerDataspaceMap.has(file.partnerDid)) {
                    file.dataspace = partnerDataspaceMap.get(file.partnerDid);
                }
                remoteFiles.push(file);
            }));

        await this.catalogService.matchContractsToFiles(remoteFiles);

        // Only keep files where UCB already has access
        return remoteFiles.filter(f => f.agreements && f.agreements.length > 0);
    }

    applyFilters(): void {
        this.filteredFiles = [...this.files];
        if (this.searchText) {
            this.filteredFiles = this.filteredFiles.filter(f =>
                f.name.toLowerCase().includes(this.searchText!) ||
                (f.description ?? '').toLowerCase().includes(this.searchText!) ||
                (f.assetId ?? '').toLowerCase().includes(this.searchText!) ||
                (f.partnerName ?? '').toLowerCase().includes(this.searchText!)
            );
        }
    }

    hasAccess(file: FileAsset): boolean {
        return file.origin === 'remote' && !!file.agreements && file.agreements.length > 0;
    }

    async viewData(file: FileAsset): Promise<void> {
        this.navigatingToData = file.assetId ?? null;

        const token = await this.transferService.requestTransferAndViewData(file);
        this.navigatingToData = null;

        if (!token) return;

        const props       = file.catalogDataset?.['edc:properties'] as Record<string, any> | undefined;
        const endpointUrl = props?.['edc:endpointUrl'] ?? '';

        if (!endpointUrl) {
            this.notificationService.showError('Error', 'Could not resolve endpoint URL from catalog');
            return;
        }

        this.router.navigate(
            ['/files/view', file.assetId],
            { state: { token, endpointUrl } }
        );
    }

    openUploadSection(): void {
        this.router.navigate(['/files/upload']);
    }

    openSearchNetwork(): void {
        this.router.navigate(['/explore']);
    }

    protected readonly DATE_FORMATS = DATE_FORMATS;
}