import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Partner } from '../models/partner.model';
import { ConfigService } from './config.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class PartnerService {
  private http = inject(HttpClient);
  private configService = inject(ConfigService);
  private authService = inject(AuthService);

  private get baseUrl(): string {
    return this.configService.config?.apiUrl || 'http://localhost:3001/api/ui';
  }


  getPartners(dataspaceId: number): Observable<Partner[]> {
    const ids = this.authService.getCurrentUserIds();
    if (!ids) {
      return of([]);
    }

    return this.http.get<Partner[]>(
      `${this.baseUrl}/service-providers/${ids.providerId}/tenants/${ids.tenantId}/participants/${ids.participantId}/partners/${dataspaceId}`
    ).pipe(
      catchError(() => of([]))
    );
  }

  getPartnerReference(dataspaceId: number, partnerIdentifier: string): Observable<Partner | null> {
    return this.getPartners(dataspaceId).pipe(
      map((partners: Partner[]) => 
        partners.find(p => (p.identifier || p.id) === partnerIdentifier) || null
      ),
      catchError(() => of(null))
    );
  }

  getPartnersByParticipant(participantId: number): Observable<Partner[]> {
    const ids = this.authService.getCurrentUserIds();
    if (!ids) {
      return of([]);
    }

    return this.http.get<Partner[]>(
      `${this.baseUrl}/service-providers/${ids.providerId}/tenants/${ids.tenantId}/participants/${ids.participantId}/partners`
    ).pipe(
      catchError(() => of([]))
    );
  }
}
