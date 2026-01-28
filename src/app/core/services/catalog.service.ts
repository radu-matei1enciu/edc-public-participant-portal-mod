import {inject, Injectable} from '@angular/core';
import {AuthService} from "./auth.service";
import {EDCDataOperationsService, PartnerReference, TenantOperationsService} from "../redline";
import {Agreement, FileAsset} from "../models/file-asset.model";
import {firstValueFrom} from "rxjs";
import {DataspaceService} from "./dataspace.service";
import {UseCaseService} from "./use-case.service";
import {NotificationService} from "../../shared/services/notification.service";
import {PartnerService} from "./partner.service";

@Injectable({
  providedIn: 'root'
})
export class CatalogService {
  private readonly authService = inject(AuthService);
  private readonly dataspaceService = inject(DataspaceService);
  private readonly useCaseService = inject(UseCaseService);
  private readonly edcDataOperationsService = inject(EDCDataOperationsService);
  private readonly tenantOperationsService = inject(TenantOperationsService);
  private readonly notificationService = inject(NotificationService);
  private readonly partnerService = inject(PartnerService);

  public async getCatalogForAllPartners(): Promise<FileAsset[]> {
    const redlineUser = this.authService.getRedlineUser();
    const catenaX = (await firstValueFrom(this.dataspaceService.getDataspaces()))
        .find(ds => ds.name.toLowerCase().includes('catena'));
    if (!redlineUser || !catenaX) return [];
    const partners = await firstValueFrom(this.tenantOperationsService.getPartners(
        redlineUser.providerId, redlineUser.tenantId, redlineUser.participantId, catenaX.id));

    const catalogResults =
        await Promise.allSettled(partners.map(partner => this.getPartnerCatalog(partner)));

    catalogResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.notificationService.showError('Partner Error', `Failed to fetch catalog for partner: ${partners[index].nickname}`);
      }
    });

    return catalogResults
        .filter((result): result is PromiseFulfilledResult<FileAsset[]> => result.status === 'fulfilled')
        .map(result => result.value)
        .flat();
  }

  public async getPartnerCatalog(partner: PartnerReference): Promise<FileAsset[]> {
    const redlineUser = this.authService.getRedlineUser();
    const useCases = await firstValueFrom(this.useCaseService.getUseCases());
    const catenaX = (await firstValueFrom(this.dataspaceService.getDataspaces()))
        .find(ds => ds.name.toLowerCase().includes('catena'));
    if (!redlineUser || !catenaX) return [];
    const catalog = await firstValueFrom(this.edcDataOperationsService.requestCatalog(
        redlineUser.providerId, redlineUser.tenantId, redlineUser.participantId,
        { counterPartyIdentifier: partner.identifier! }
    ));
    if (catalog.dataset) {
      return catalog.dataset.map(ds => {
        const useCaseId = ds["edc:properties"]?.["edc:useCase"] as unknown as string;
        return {
          name: ds["edc:properties"]?.["edc:originalFilename"] ?? 'N/A',
          useCase: useCaseId ?? 'N/A',
          useCaseLabel: useCases.find(uc => uc.id === useCaseId)?.label ?? '',
          size: ds["edc:properties"]?.["edc:size"] as unknown as number ?? undefined,
          description: ds["edc:properties"]?.['description'] ?? 'N/A',
          id: ds["edc:properties"]?.["edc:fileId"] ?? 'N/A',
          origin: "remote",
          uploadedAt: 'N/A',
          dataspace: catenaX?.name,
          catalogDataset: ds,
          partnerName: partner.nickname,
          partnerDid: partner.identifier,
          assetId: ds["edc:properties"]?.["edc:assetId"] as unknown as string
        } as FileAsset
      });
    }
    return [];
  }

  public async matchContractsToFiles(files: FileAsset[]): Promise<FileAsset[]> {
    const redlineUser = this.authService.getRedlineUser();
    const cx = (await firstValueFrom(this.dataspaceService.getDataspaces()))
        .find(ds => ds.name.toLowerCase().includes('catena'));
    if (!redlineUser || !cx) return files;
    const partners = (await firstValueFrom(this.partnerService.getPartners(
        redlineUser.providerId, redlineUser.tenantId, redlineUser.participantId, cx.id)));
    const contracts = await firstValueFrom(this.edcDataOperationsService.listContracts(
        redlineUser.providerId, redlineUser.tenantId, redlineUser.participantId));
    for (const contract of contracts) {
      files.filter(file => file.assetId === contract.assetId).forEach(file => {
        if (!contract.pending) {
          const agreement: Agreement = {
            partnerName: partners.find(p => p.identifier === contract.counterParty)?.nickname ?? 'N/A',
            partnerId: contract.counterParty ?? 'N/A',
            id: contract.id!,
            status: contract.pending ? 'Pending' : 'Active',
            createdAt: contract.signingDate!
          };
          if (!file.agreements) {
            file.agreements = [agreement];
          } else {
            file.agreements.push(agreement);
          }
          if (file.uploadedAt === 'N/A') {
            file.uploadedAt = contract.signingDate!;
          }
        }
      })
    }
    return files;
  }
}
