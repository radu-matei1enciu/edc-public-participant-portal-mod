export interface Partner {
  id: string;
  name: string;
  description?: string;
  companyIdentifier?: string;
  logoUrl?: string;
  website?: string;
  metadata?: {
    industry?: string;
    country?: string;
    region?: string;
  };
}
