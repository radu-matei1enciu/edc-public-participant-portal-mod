export interface EndpointResource {
  assetId: string;
  endpointUrl: string;
  name: string;
  metadata?: Record<string, any>;
}

export interface QcResult {
  id: string;
  batchId: string;
  product: string;
  test: string;
  result: string;
  specification: string;
  status: 'PASS' | 'FAIL';
  approvedAt: string;
}

export interface RegisterEndpointRequest {
  endpointUrl: string;
  name: string;
  publicMetadata?: Record<string, any>;
  privateMetadata?: Record<string, any>;
  celExpressions?: any[];
  policySet?: any;
}
