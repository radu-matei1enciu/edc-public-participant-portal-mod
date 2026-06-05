import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ConfigService } from './config.service';
import { EndpointResource, QcResult, RegisterEndpointRequest } from '../models/endpoint-resource.model';

@Injectable({ providedIn: 'root' })
export class EndpointService {
    private http          = inject(HttpClient);
    private configService = inject(ConfigService);

    private get baseUrl(): string {
        return this.configService.config?.apiUrl || 'http://localhost:3001/api/ui';
    }

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
     * Calls the provider's public endpoint DIRECTLY from the browser
     * using the EDR token obtained from the transfer process.
     * Uses native fetch() to bypass Angular's AuthInterceptor
     * (which would overwrite our Authorization header with the Keycloak JWT).
     */
    getEndpointData(endpointUrl: string, token: string): Observable<QcResult[]> {
        return from(
            fetch(endpointUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept':        'application/json'
                }
            }).then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status} from ${endpointUrl}`);
                return r.json() as Promise<QcResult[]>;
            })
        );
    }
}