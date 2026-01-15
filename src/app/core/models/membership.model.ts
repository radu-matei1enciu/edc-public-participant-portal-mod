export interface Membership {
  id: string;
  ecosystemId: string;
  ecosystemName: string;
  status: 'active' | 'pending' | 'inactive';
  joinedAt: string;
  credentials?: CredentialStatus[];
}

export interface CredentialStatus {
  id: string;
  type: string;
  status: string;
  issuedAt?: string;
  expiresAt?: string;
}
