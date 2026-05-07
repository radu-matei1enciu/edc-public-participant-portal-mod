import {Component, DestroyRef, inject, OnInit} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {CommonModule} from '@angular/common';
import {Router} from '@angular/router';
import {FormBuilder, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {catchError, debounceTime, distinctUntilChanged, firstValueFrom, Observable, of} from 'rxjs';
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
import {DataspaceResource} from "../../core/models/dataspace.model";
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
    private readonly partnerService = inject(PartnerService);
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

    // All dataspaces this participant belongs to — used for partner name resolution
    private participantDataspaces: DataspaceResource[] = [];

    constructor() {
        this.filterForm = this.fb.group({
            searchTerm: [''],
            useCaseFilter: [''],
            originFilter: ['']
        });
        this.preferences$ = this.preferencesService.preferences$;
    }

    async ngOnInit(): Promise<void> {
        this.redlineUser = this.authService.getRedlineUser();
        this.loadUseCases();
        await this.loadParticipantDataspaces();
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
            next: (useCases) => { this.useCases = useCases; },
            error: () => { this.useCases = []; }
        });
    }

    /**
     * Load all dataspaces this participant is enrolled in.
     * These are used as the search space when resolving partner names.
     */
    private async loadParticipantDataspaces(): Promise<void> {
        if (!this.redlineUser) return;
        try {
            this.participantDataspaces = await firstValueFrom(
                this.dataspaceService.getParticipantDataspaces(
                    this.redlineUser.providerId,
                    this.redlineUser.tenantId,
                    this.redlineUser.participantId
                )
            );
        } catch {
            this.participantDataspaces = [];
        }
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
                await this.addToFiles(file);
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

    /**
     * Resolve the partner name for an owned file.
     *
     *
     *  1. If the file's private metadata contains `dataspaceId` (set since the
     *     multi-dataspace upload fix), use that directly — one API call.
     *  2. Otherwise fall back to trying every dataspace the participant belongs
     *     to until one returns a match (handles files uploaded before the fix).
     *  3. If nothing resolves, return an empty string — the UI shows the raw ID.
     */
    private async resolvePartnerName(partnerId: string): Promise<{ name: string; dataspaceId?: number }> {
        if (!this.redlineUser) return { name: '' };

        if (this.participantDataspaces.length === 0) return { name: '' };

        for (const ds of this.participantDataspaces) {
            try {
                const ref = await firstValueFrom(
                    this.partnerService.getPartnerReference(
                        this.redlineUser.providerId,
                        this.redlineUser.tenantId,
                        this.redlineUser.participantId,
                        ds.id,
                        partnerId
                    ).pipe(catchError(() => of(null)))
                );
                if (ref?.nickname) {
                    return { name: ref.nickname, dataspaceId: ds.id };
                }
            } catch {
                // try next dataspace
            }
        }

        return { name: '' };
    }

    private async addToFiles(file: FileResource): Promise<void> {
        if (!this.redlineUser) return;

        const useCaseId = file.metadata?.['useCase'] as unknown as string;
        const partnerId = file.metadata?.['partnerId'] as unknown as string;

        const storedDataspaceId = file.metadata?.['dataspaceId'] as unknown as number | string | undefined;

        let partnerName = '';

        if (partnerId) {
            if (storedDataspaceId) {
                try {
                    partnerName = (await firstValueFrom(
                        this.partnerService.getPartnerReference(
                            this.redlineUser.providerId,
                            this.redlineUser.tenantId,
                            this.redlineUser.participantId,
                            Number(storedDataspaceId),
                            partnerId
                        ).pipe(catchError(() => of(null)))
                    ))?.nickname ?? '';
                } catch {
                    partnerName = '';
                }
            } else {
                const resolved = await this.resolvePartnerName(partnerId);
                partnerName = resolved.name;
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
            this.filteredFiles = this.filteredFiles.filter(file =>
                file.name.toLowerCase().includes(this.searchText!) ||
                file.useCase?.toLowerCase().includes(this.searchText!) ||
                file.type?.toLowerCase().includes(this.searchText!) ||
                file.origin.toLowerCase().includes(this.searchText!)
            );
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

    openExploreSelection(): void { this.showExploreSelection = true; }
    closeExploreSelection(): void { this.showExploreSelection = false; }

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