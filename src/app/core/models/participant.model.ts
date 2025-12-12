export interface Participant {
  id?: string;
  name: string;
  description: string;
  password: string;
  metadata: ParticipantMetadata;
  currentOperation?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ParticipantMetadata {
  companyName?: string;
  companyType?: string;
  vatNumber?: string;
  fiscalCode?: string;
  
  email?: string;
  phone?: string;
  website?: string;
  
  country?: string;
  region?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  
  environment?: string;
  industry?: string;
  businessSize?: string;
  
  notes?: string;
  registrationSource?: string;
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
  marketingAccepted?: boolean;
}

export interface ParticipantRegistrationRequest {
  participant: {
    name: string;
    description: string;
    metadata: ParticipantMetadata;
  };
  user: {
    username: string;
    password: string;
    metadata: UserMetadata;
  };
}

export interface UserMetadata {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;
}

export interface ParticipantRegistrationResponse {
  participant: {
    id: string;
    name: string;
    description: string;
    metadata: ParticipantMetadata;
    currentOperation: string;
    createdAt: string;
  };
  user: {
    id: string;
    username: string;
    metadata: UserMetadata;
    createdAt: string;
  };
  message?: string;
}

export interface ApiError {
  message: string;
  status: number;
  timestamp: string;
  path: string;
  details?: any;
}

export interface UserProfile {
  user: {
    id: string;
    username: string;
    metadata: UserMetadata;
    createdAt: string;
    updatedAt: string;
  };
  participant: {
    id: string;
    name: string;
    description: string;
    currentOperation: string;
    metadata: ParticipantMetadata;
    createdAt: string;
    updatedAt: string;
    did?: string;
    host?: string;
    status?: string;
  };
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
  token: string;
  profile?: UserProfile;
}

// Credential interfaces
export interface CredentialRequest {
  credentials: CredentialDefinition[];
}

export interface CredentialDefinition {
  format: 'VC1_0_JWT';
  type: 'MembershipCredential' | 'DataProcessorCredential';
  id: string;
}

export interface CredentialResponse {
  id: string;
  requestId?: string;
  credentialType: string;
  type: string;
  format: string;
  status: CredentialStatus;
  issuedAt?: string;
  expiresAt?: string;
  credentialHash?: string;
  createdAt: string;
}

export enum CredentialStatus {
  REQUESTED = 'REQUESTED',
  ISSUED = 'ISSUED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
  SUSPENDED = 'SUSPENDED'
}

export interface CredentialRequestResponse {
  requestId: string;
  participantId: string;
  status: 'REQUESTED';
  credentials: Array<{
    format: string;
    type: string;
    id: string;
    status: 'REQUESTED';
  }>;
}
