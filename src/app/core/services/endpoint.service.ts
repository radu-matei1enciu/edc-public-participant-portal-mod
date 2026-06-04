import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ConfigService } from './config.service';
import { EndpointResource, QcResult, RegisterEndpointRequest } from '../models/endpoint-resource.model';

@Injectable({ providedIn: 'root' })
export class EndpointService {
  private http = inject(HttpClient);
  private configService = inject(ConfigService);

  private get baseUrl(): string {
    return this.configService.config?.apiUrl || 'http://localhost:3001/api/ui';
  }

  /**
   * POST .../service-providers/{p}/dataspaces/{d}/tenants/{t}/participants/{r}/endpoints
   * PharmaLab (provider) registers a live data endpoint as an EDC asset.
   */
  registerEndpoint(
    providerId: number,
    dataspaceId: number,
    tenantId: number,
    participantId: number,
    request: RegisterEndpointRequest
  ): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/service-providers/${providerId}/dataspaces/${dataspaceId}/tenants/${tenantId}/participants/${participantId}/endpoints`,
      request
    );
  }

  /**
   * GET .../service-providers/{p}/tenants/{t}/participants/{r}/endpoints
   * Lists all endpoints registered by this participant.
   */
  listEndpoints(
    providerId: number,
    tenantId: number,
    participantId: number
  ): Observable<EndpointResource[]> {
    return this.http.get<EndpointResource[]>(
      `${this.baseUrl}/service-providers/${providerId}/tenants/${tenantId}/participants/${participantId}/endpoints`
    ).pipe(catchError(() => of([])));
  }

  /**
   * GET .../service-providers/{p}/tenants/{t}/participants/{r}/endpoints/{assetId}/data
   * UCB (consumer) fetches live QC data through the dataspace for a given assetId.
   */
  getEndpointData(
    providerId: number,
    tenantId: number,
    participantId: number,
    assetId: string
  ): Observable<QcResult[]> {
    return this.http.get<QcResult[]>(
      `${this.baseUrl}/service-providers/${providerId}/tenants/${tenantId}/participants/${participantId}/endpoints/${assetId}/data`
    );
  }
}
