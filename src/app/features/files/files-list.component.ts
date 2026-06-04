import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../shared/services/notification.service';
import { UserPreferences, UserPreferencesService } from '../../core/services/user-preferences.service';
import { FileAsset } from '../../core/models/file-asset.model';
import { EndpointService } from '../../core/services/endpoint.service';
import { EndpointResource } from '../../core/models/endpoint-resource.model';
import { RedlineUser } from '../../core/models/redline-user.model';
import { DATE_FORMATS } from '../../shared/utils/format.utils';
import { Observable } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { FileDetailComponent } from './file-detail.component';


@Component({
    selector: 'app-files-list',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink, FileDetailComponent],
    templateUrl: './files-list.component.html'
})
export class FilesListComponent implements OnInit {

    private authService         = inject(AuthService);
    private notificationService = inject(NotificationService);
    private preferencesService  = inject(UserPreferencesService);
    private destroyRef          = inject(DestroyRef);
    private fb                  = inject(FormBuilder);
    private router              = inject(Router);
    private endpointService     = inject(EndpointService);

    endpoints: EndpointResource[] = [];
    files: FileAsset[] = [];          // mapped from endpoints for display
    filteredFiles: FileAsset[] = [];
    selectedFile?: FileAsset;
    filterForm: FormGroup;
    loading = false;
    preferences$: Observable<UserPreferences>;
    searchText?: string;
    redlineUser?: RedlineUser;

    constructor() {
        this.filterForm = this.fb.group({ searchTerm: [''] });
        this.preferences$ = this.preferencesService.preferences$;
    }

    async ngOnInit(): Promise<void> {
        this.redlineUser = this.authService.getRedlineUser();
        await this.loadEndpoints();

        this.filterForm.get('searchTerm')?.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(value => {
            this.searchText = (value as string).toLowerCase();
            this.applyFilters();
        });
    }

    async loadEndpoints(): Promise<void> {
        if (!this.redlineUser) {
            this.notificationService.showError('Error', 'Failed to load user profile.');
            return;
        }
        this.loading = true;
        try {
            this.endpoints = await firstValueFrom(
                this.endpointService.listEndpoints(
                    this.redlineUser.providerId,
                    this.redlineUser.tenantId,
                    this.redlineUser.participantId
                )
            );
            this.files = this.endpoints.map(ep => this.mapToAsset(ep));
        } catch (error) {
            this.notificationService.showError('Error', (error as Error).message || 'Failed to load endpoints');
        } finally {
            this.applyFilters();
            this.loading = false;
        }
    }

    /** Map an EndpointResource to the FileAsset shape the template already understands. */
    private mapToAsset(ep: EndpointResource): FileAsset {
        return {
            id:          ep.assetId,
            name:        ep.name,
            assetId:     ep.assetId,
            description: ep.endpointUrl,   // displayed in the "Endpoint URL" column
            origin:      'owned',
            uploadedAt:  (ep.metadata?.['registeredAt'] as string) ?? new Date().toISOString(),
            size:        0,
            type:        'application/json'
        };
    }

    applyFilters(): void {
        this.filteredFiles = [...this.files];
        if (this.searchText) {
            this.filteredFiles = this.filteredFiles.filter(f =>
                f.name.toLowerCase().includes(this.searchText!) ||
                (f.description ?? '').toLowerCase().includes(this.searchText!) ||
                (f.assetId ?? '').toLowerCase().includes(this.searchText!)
            );
        }
    }

    openUploadSection(): void {
        this.router.navigate(['/files/upload']);
    }

    openSearchNetwork(): void {
        this.router.navigate(['/explore']);
    }

    protected readonly DATE_FORMATS = DATE_FORMATS;
}
