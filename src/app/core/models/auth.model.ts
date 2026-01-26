import { TenantProperties } from './tenant.model';

export interface SelectedParticipant {
  tenantId: number;
  participantId: number;
  tenantName: string;
  participantIdentifier: string;
  tenantProperties?: TenantProperties;
}
