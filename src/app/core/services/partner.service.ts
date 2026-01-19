import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Partner } from '../models/partner.model';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class PartnerService {
  private http = inject(HttpClient);
  private configService = inject(ConfigService);

  private get baseUrl(): string {
    return this.configService.config?.apiUrl || 'http://localhost:3001/api/ui';
  }

  getPartners(
    providerId: number,
    tenantId: number,
    participantId: number,
    dataspaceId: number
  ): Observable<Partner[]> {
    return this.http.get<Partner[]>(
      `${this.baseUrl}/service-providers/${providerId}/tenants/${tenantId}/participants/${participantId}/partners/${dataspaceId}`
    ).pipe(
      catchError(() => of([]))
    );
  }

  getPartnersByParticipant(participantId: number): Observable<Partner[]> {
    return this.http.get<Partner[]>(`${this.baseUrl}/participants/${participantId}/partners`).pipe(
      catchError(() => of([]))
    );
  }

  getPartnerReference(
    providerId: number,
    tenantId: number,
    participantId: number,
    dataspaceId: number,
    partnerIdentifier: string
  ): Observable<Partner | null> {
    return this.getPartners(providerId, tenantId, participantId, dataspaceId).pipe(
      map((partners: Partner[]) => 
        partners.find(p => (p.identifier || p.id) === partnerIdentifier) || null
      ),
      catchError(() => of(null))
    );
  }
}
