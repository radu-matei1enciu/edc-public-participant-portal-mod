import {inject, Injectable} from '@angular/core';
import {AuthService} from "./auth.service";
import {EDCDataOperationsService, PartnerReference, TenantOperationsService} from "../redline";
import {FileAsset} from "../models/file-asset.model";
import {firstValueFrom} from "rxjs";
import {DataspaceService} from "./dataspace.service";
import {UseCaseService} from "./use-case.service";

@Injectable({
  providedIn: 'root'
})
export class CatalogService {
  private readonly authService = inject(AuthService);
  private readonly dataspaceService = inject(DataspaceService);
  private readonly useCaseService = inject(UseCaseService);
  private readonly edcDataOperationsService = inject(EDCDataOperationsService);
  private readonly tenantOperationsService = inject(TenantOperationsService);

  public async getCatalogForAllPartners(): Promise<FileAsset[]> {
    const redlineUser = this.authService.getRedlineUser();
    const catenaX = (await firstValueFrom(this.dataspaceService.getDataspaces()))
        .find(ds => ds.name.toLowerCase().includes('catena'));
    if (!redlineUser || !catenaX) return [];
    const partners = await firstValueFrom(this.tenantOperationsService.getPartners(
        redlineUser.providerId, redlineUser.tenantId, redlineUser.participantId, catenaX.id));
    const catalogs = await Promise.all(partners.map(partner => this.getPartnerCatalog(partner)));
    return catalogs.flat();
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
          partnerDid: partner.identifier
        } as FileAsset
      });
    }
    return [];
  }

  public async matchContractsToFiles(files: FileAsset[]): Promise<FileAsset[]> {
    const redlineUser = this.authService.getRedlineUser();
    if (!redlineUser) return files;
    const contracts = await firstValueFrom(this.edcDataOperationsService.listContracts(
        redlineUser.providerId, redlineUser.tenantId, redlineUser.participantId
    ));
    for (const contract of contracts) {
      const matchingFile = files.find(file => file.catalogDataset?.["edc:properties"]?.["edc:assetId"] === contract.assetId);
      if (matchingFile && contract.counterParty === matchingFile.partnerDid && !contract.pending) {
        matchingFile.accessRestrictions = [
          {
            partnerName: matchingFile.partnerName,
            partnerId: contract.counterParty,
            contractId: contract.id
          }
        ]
        matchingFile.uploadedAt = contract.signingDate!;
      }
    }
    return files;
  }
}
