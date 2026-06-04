import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FileAsset } from '../../../core/models/file-asset.model';
import { UseCase } from '../../../core/models/use-case.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { EndpointService } from '../../../core/services/endpoint.service';
import { AuthService } from '../../../core/services/auth.service';
import { DATE_FORMATS } from '../../../shared/utils/format.utils';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-files-section',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './files-section.component.html'
})
export class FilesSectionComponent implements OnInit {
    @Input() participantId: number | null = null;
    @Input() useCases: UseCase[] = [];
    @Output() viewDetails = new EventEmitter<string>();
    @Output() uploadFile  = new EventEmitter<string>();

    files: FileAsset[] = [];
    loading = false;

    // ── Dialog state — kept for template compatibility ─────────────────────
    // The inline upload dialog is never shown (showUploadDialog always false).
    // "Share Data" action navigates to /files/upload.
    showExploreSelection = false;
    showUploadDialog     = false;
    uploadStep           = 1;
    selectedFiles: File[] = [];
    uploading            = false;
    filterForm!: FormGroup;
    uploadForm!: FormGroup;

    private endpointService     = inject(EndpointService);
    private authService         = inject(AuthService);
    private notificationService = inject(NotificationService);
    private router              = inject(Router);
    private fb                  = inject(FormBuilder);

    ngOnInit(): void {
        this.filterForm = this.fb.group({ searchQuery: [''], selectedUseCase: [''], selectedOrigin: [''] });
        this.uploadForm = this.fb.group({ useCase: [''], partnerId: [''] });
        this.loadFiles();
    }

    loadFiles(): void {
        const user = this.authService.getRedlineUser();
        if (!user) return;
        this.loading = true;
        firstValueFrom(
            this.endpointService.listEndpoints(user.providerId, user.tenantId, user.participantId)
        ).then(endpoints => {
            this.files = endpoints.map(ep => ({
                id:          ep.assetId,
                name:        ep.name,
                assetId:     ep.assetId,
                description: ep.endpointUrl,
                origin:      'owned' as const,
                uploadedAt:  (ep.metadata?.['registeredAt'] as string) ?? new Date().toISOString()
            }));
        }).catch(() => {
            this.notificationService.showError('Error', 'Failed to load data endpoints');
        }).finally(() => { this.loading = false; });
    }

    viewFileDetails(fileId: string): void { this.viewDetails.emit(fileId); }

    // Navigate to /files/upload instead of showing inline dialog
    openUploadDialog(): void {
        this.showExploreSelection = false;
        this.router.navigate(['/files/upload']);
    }

    closeUploadDialog(): void   { this.showUploadDialog = false; }
    closeExploreSelection(): void { this.showExploreSelection = false; }

    openSearchDialog(): void {
        this.showExploreSelection = false;
        this.uploadFile.emit('explore');
    }

    // Stubs — dialog is never shown but template references these
    onFileSelected(_event: Event): void { /* no file upload */ }

    nextStep(): void     { if (this.uploadStep < 3) this.uploadStep++; }
    previousStep(): void { if (this.uploadStep > 1) this.uploadStep--; }

    canProceed(): boolean { return true; }

    uploadFiles(): void {
        // Redirect to the proper upload page instead of inline upload
        this.closeUploadDialog();
        this.router.navigate(['/files/upload']);
    }

    getUseCaseLabel(useCaseId?: string): string {
        if (!useCaseId) return 'N/A';
        return this.useCases.find(uc => uc.id === useCaseId)?.label ?? useCaseId;
    }

    protected readonly DATE_FORMATS = DATE_FORMATS;
}
