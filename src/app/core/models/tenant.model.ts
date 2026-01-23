export interface NewDataspaceInfo {
  dataspaceId: number;
  agreementTypes: string[];
  roles: string[];
}

export interface DataspaceInfo {
  dataspaceId: number;
  agreementTypes: string[];
  roles: string[];
  id: number;
}

export interface NewTenantRegistration {
  tenantName: string;
  dataspaceInfos: NewDataspaceInfo[];
  properties?: Record<string, unknown>;
}

export interface TenantResource {
  id: number;
  providerId: number;
  name: string;
  participants: ParticipantResource[];
}

export interface VPAResource {
  id: number;
  type: 'CONTROL_PLANE' | 'CREDENTIAL_SERVICE' | 'DATA_PLANE';
  state: 'INITIAL' | 'PENDING' | 'ACTIVE' | 'DISPOSING' | 'DISPOSED' | 'LOCKED' | 'OFFLINE' | 'ERROR';
}

export interface ParticipantResource {
  id: number;
  identifier: string;
  agents: VPAResource[];
  dataspaceInfos: DataspaceInfo[];
}

export interface NewParticipantDeployment {
  participantId: number;
  identifier: string;
}
