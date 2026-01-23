export * from './eDCDataOperations.service';
import { EDCDataOperationsService } from './eDCDataOperations.service';
export * from './serverInfo.service';
import { ServerInfoService } from './serverInfo.service';
export * from './tenantOperations.service';
import { TenantOperationsService } from './tenantOperations.service';
export const APIS = [EDCDataOperationsService, ServerInfoService, TenantOperationsService];
