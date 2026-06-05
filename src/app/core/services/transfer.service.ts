import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { EDCDataOperationsService, TransferProcess } from '../redline';
import { FileAsset } from '../models/file-asset.model';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../shared/services/notification.service';

@Injectable({ providedIn: 'root' })
export class TransferService {
    private readonly authService              = inject(AuthService);
    private readonly notificationService      = inject(NotificationService);
    private readonly edcDataOperationsService = inject(EDCDataOperationsService);

    public async requestTransferAndDownload(file: FileAsset): Promise<void> {
        const redlineUser = this.authService.getRedlineUser();
        if (!redlineUser || !file.agreements || !file.agreements[0].id || !file.catalogDataset?.distribution) {
            this.notificationService.showError('Error', 'Missing File Data');
            return;
        }
        if (!file.catalogDataset.distribution) {
            this.notificationService.showError('The provider is unable to serve this file',
                'No appropriate distribution found.');
            return;
        }
        const transferProcessId = await firstValueFrom(
            this.edcDataOperationsService.requestTransfer(
                redlineUser.providerId, redlineUser.tenantId, redlineUser.participantId,
                {
                    contractId:    file.agreements[0].id,
                    counterPartyId: file.partnerDid,
                    transferType:  file.catalogDataset.distribution[0].format
                },
                'body', false, { httpHeaderAccept: 'text/plain' }
            )
        );

        let transferProcess: TransferProcess | undefined;
        const startTime = Date.now();
        while (transferProcess?.state !== 'STARTED' && Date.now() - startTime < 30000) {
            await new Promise(r => setTimeout(r, 1000));
            try {
                transferProcess = await firstValueFrom(
                    this.edcDataOperationsService.getTransferProcess(
                        redlineUser.providerId, redlineUser.tenantId, redlineUser.participantId,
                        transferProcessId
                    )
                );
            } catch {
                this.notificationService.showError('Transfer Process', 'Failed to get transfer state');
                return;
            }
        }

        if (transferProcess?.state === 'STARTED') {
            const token = (transferProcess.contentDataAddress?.['properties'] as Record<string, string>)
                ?.['https://w3id.org/edc/v0.0.1/ns/authorization'];
            if (!token) {
                this.notificationService.showError('Download', 'No auth token found');
                return;
            }
            const data: Blob = await firstValueFrom(
                this.edcDataOperationsService.downloadData(
                    redlineUser.providerId, redlineUser.tenantId, redlineUser.participantId,
                    file.id, token
                )
            );
            this.startBrowserDownload(data, file);
        } else {
            this.notificationService.showError('Error', 'Failed to transfer file');
        }
    }

    /**
     * Initiates an EDC transfer for a live data endpoint,
     * waits for STARTED, and returns the Siglet EDR token.
     * The caller uses the token to poll the provider's public endpoint directly.
     */
    public async requestTransferAndViewData(file: FileAsset): Promise<string | null> {
        const redlineUser = this.authService.getRedlineUser();
        if (!redlineUser || !file.agreements?.[0]?.id || !file.catalogDataset?.distribution) {
            this.notificationService.showError('Error', 'Missing contract or distribution data');
            return null;
        }

        let transferProcessId: string;
        try {
            transferProcessId = await firstValueFrom(
                this.edcDataOperationsService.requestTransfer(
                    redlineUser.providerId, redlineUser.tenantId, redlineUser.participantId,
                    {
                        contractId:     file.agreements[0].id,
                        counterPartyId: file.partnerDid,
                        transferType:   file.catalogDataset.distribution[0].format
                    },
                    'body', false, { httpHeaderAccept: 'text/plain' }
                )
            );
        } catch {
            this.notificationService.showError('Error', 'Failed to initiate transfer');
            return null;
        }

        let transferProcess: TransferProcess | undefined;
        const startTime = Date.now();
        while (transferProcess?.state !== 'STARTED' && Date.now() - startTime < 30_000) {
            await new Promise(r => setTimeout(r, 1000));
            try {
                transferProcess = await firstValueFrom(
                    this.edcDataOperationsService.getTransferProcess(
                        redlineUser.providerId, redlineUser.tenantId, redlineUser.participantId,
                        transferProcessId
                    )
                );
            } catch {
                this.notificationService.showError('Error', 'Failed to get transfer state');
                return null;
            }
        }

        if (transferProcess?.state !== 'STARTED') {
            this.notificationService.showError('Error', 'Transfer did not start in time');
            return null;
        }

        const token = (transferProcess.contentDataAddress?.['properties'] as Record<string, string>)
            ?.['https://w3id.org/edc/v0.0.1/ns/authorization'];

        if (!token) {
            this.notificationService.showError('Error', 'No EDR token received from transfer');
            return null;
        }

        return token;
    }

    private startBrowserDownload(data: Blob, file: FileAsset): void {
        const url = window.URL.createObjectURL(data);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = file.name || 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
}
