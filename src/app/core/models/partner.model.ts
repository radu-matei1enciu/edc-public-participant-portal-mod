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
  [key: string]: unknown;
}
