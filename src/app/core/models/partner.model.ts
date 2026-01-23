export interface Partner {
  identifier: string;
  nickname: string;
  properties?: PartnerProperties;
}

export interface PartnerProperties {
  region?: string;
  industry?: string;
  contactEmail?: string;
  status?: string;
  metadata?: Record<string, unknown>;
  capabilities?: string[];
  endpoints?: Record<string, string>;
  subscriptionTier?: string;
  features?: Record<string, unknown>;
  [key: string]: unknown;
}
