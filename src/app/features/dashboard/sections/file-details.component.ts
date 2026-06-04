import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileAsset } from '../../../core/models/file-asset.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { DATE_FORMATS, formatFileSize } from '../../../shared/utils/format.utils';
import { EndpointService } from '../../../core/services/endpoint.service';
import { AuthService } from '../../../core/services/auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-file-details',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './file-details.component.html'
})
export class FileDetailsComponent implements OnInit {
    formatFileSize = formatFileSize;

    @Input() participantId: number | null = null;
    @Input() fileId: string = '';
    @Output() close = new EventEmitter<void>();

    file: FileAsset | null = null;
    loading = false;

    private endpointService     = inject(EndpointService);
    private authService         = inject(AuthService);
    private notificationService = inject(NotificationService);

    ngOnInit(): void {
        if (this.fileId) this.loadFile();
    }

    loadFile(): void {
        const user = this.authService.getRedlineUser();
        if (!user) return;
        this.loading = true;
        firstValueFrom(
            this.endpointService.listEndpoints(user.providerId, user.tenantId, user.participantId)
        ).then(endpoints => {
            const ep = endpoints.find(e => e.assetId === this.fileId);
            if (ep) {
                this.file = {
                    id:          ep.assetId,
                    name:        ep.name,
                    assetId:     ep.assetId,
                    description: ep.endpointUrl,
                    origin:      'owned',
                    uploadedAt:  (ep.metadata?.['registeredAt'] as string) ?? ''
                };
            }
        }).catch(() => {
            this.notificationService.showError('Error', 'Failed to load endpoint details');
        }).finally(() => { this.loading = false; });
    }

    // Kept for template compatibility
    editFile(): void {
        this.notificationService.showInfo('Info', 'Endpoint editing coming soon');
    }

    viewAgreementDetails(): void {
        this.notificationService.showInfo('Info', 'Agreement details coming soon');
    }

    downloadAgreement(_agreementId: string): void {
        this.notificationService.showInfo('Info', 'Export functionality coming soon');
    }

    getTransactionStatusClass(status: string): string {
        switch (status?.toLowerCase()) {
            case 'success': return 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'failed':  return 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            case 'pending': return 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            default:        return 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
        }
    }

    protected readonly DATE_FORMATS = DATE_FORMATS;
}
