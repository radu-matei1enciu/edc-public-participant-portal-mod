export interface Partner {
  id: string;
  name: string;
  description?: string;
  companyIdentifier?: string;
  logoUrl?: string;
  website?: string;
  identifier: string;
  nickname: string;
  metadata?: {
    industry?: string;
    country?: string;
    region?: string;
  };
}

export interface PartnerReferenceResource {
  identifier: string;
  nickname: string;
}
