import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { PolicySet } from '../redline';
import { ConfigService } from './config.service';
import { catchError } from 'rxjs/operators';
import { CelExpression } from '../models/cel-expression.model';

@Injectable({ providedIn: 'root' })
export class RedlineUploadService {
  private http = inject(HttpClient);
  private configService = inject(ConfigService);

  private get baseUrl(): string {
    return this.configService.config?.apiUrl || 'http://localhost:3001/api/ui';
  }

  /**
   * Registers a live data endpoint as an EDC asset.
   * Replaces the old file-upload flow.
   *
   * POST .../service-providers/{providerId}/dataspaces/{dataspaceId}/tenants/{tenantId}/participants/{participantId}/endpoints
   */
  registerEndpoint(
    providerId: number,
    dataspaceId: number,
    tenantId: number,
    participantId: number,
    endpointUrl: string,
    name: string,
    publicMetadata: Record<string, any> = {},
    privateMetadata: Record<string, any> = {},
    celExpressions?: CelExpression[],
    policySet?: PolicySet
  ): Observable<void> {
    const body: any = {
      endpointUrl,
      name,
      publicMetadata,
      privateMetadata,
    };
    if (celExpressions?.length) body.celExpressions = celExpressions;
    if (policySet)             body.policySet = policySet;

    return this.http.post<void>(
      `${this.baseUrl}/service-providers/${providerId}/dataspaces/${dataspaceId}/tenants/${tenantId}/participants/${participantId}/endpoints`,
      body
    ).pipe(
      catchError((error) => throwError(() => error))
    );
  }
}
