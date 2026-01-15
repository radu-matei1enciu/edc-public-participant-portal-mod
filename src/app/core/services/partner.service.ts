import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Partner } from '../models/partner.model';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class PartnerService {
  private http = inject(HttpClient);
  private configService = inject(ConfigService);
  private readonly defaultBaseUrl = 'http://localhost:3001/v1';

  private get baseUrl(): string {
    return this.configService.config?.apiUrl || this.defaultBaseUrl;
  }

  getPartners(participantId: string): Observable<Partner[]> {
    return this.http.get<Partner[]>(`${this.baseUrl}/participants/${participantId}/partners`).pipe(
      catchError(() => of([]))
    );
  }

  addPartner(participantId: string, partner: Partial<Partner>): Observable<Partner> {
    return this.http.post<Partner>(`${this.baseUrl}/participants/${participantId}/partners`, partner).pipe(
      catchError(() => {
        throw new Error('Failed to add partner');
      })
    );
  }

  getPartner(participantId: string, partnerId: string): Observable<Partner> {
    return this.http.get<Partner>(`${this.baseUrl}/participants/${participantId}/partners/${partnerId}`).pipe(
      catchError(() => {
        throw new Error('Failed to load partner');
      })
    );
  }
}
