export interface DataspaceResource {
    id: number;
    name: string;
    properties?: DataspaceProperties;
}

export interface DataspaceProperties {
    region?: string;
    protocol?: string;
    description?: string;
    credentialType?: string;
    cfmDataspaceProfileId?: string;
    termsAndConditions?: string;
    [key: string]: any;
}
