import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Membership } from '../models/membership.model';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class MembershipService {
  private http = inject(HttpClient);
  private configService = inject(ConfigService);
  private readonly defaultBaseUrl = 'http://localhost:3001/v1';

  private get baseUrl(): string {
    return this.configService.config?.apiUrl || this.defaultBaseUrl;
  }

  getMemberships(participantId: string): Observable<Membership[]> {
    return this.http.get<Membership[]>(`${this.baseUrl}/participants/${participantId}/memberships`).pipe(
      catchError(() => of([]))
    );
  }

  getMembershipDetails(participantId: string, membershipId: string): Observable<Membership> {
    return this.http.get<Membership>(`${this.baseUrl}/participants/${participantId}/memberships/${membershipId}`).pipe(
      catchError(() => {
        throw new Error('Failed to load membership details');
      })
    );
  }
}
