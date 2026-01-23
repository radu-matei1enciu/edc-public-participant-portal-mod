import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Ecosystem } from '../models/ecosystem.model';
import { DataspaceResource } from '../models/dataspace.model';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class DataspaceService {
  private http = inject(HttpClient);
  private configService = inject(ConfigService);

  private get baseUrl(): string {
    return this.configService.config?.apiUrl || 'http://localhost:3001/api/ui';
  }

  getDataspaces(): Observable<DataspaceResource[]> {
    return this.http.get<DataspaceResource[]>(`${this.baseUrl}/dataspaces`).pipe(
      catchError(() => of([]))
    );
  }

  getEcosystems(): Observable<Ecosystem[]> {
    return this.http.get<Ecosystem[]>(`${this.baseUrl}/ecosystems`).pipe(
      catchError(() => of([]))
    );
  }

  getParticipantDataspaces(providerId: number, tenantId: number, participantId: number): Observable<DataspaceResource[]> {
    return this.http.get<DataspaceResource[]>(
      `${this.baseUrl}/service-providers/${providerId}/tenants/${tenantId}/participants/${participantId}/dataspaces`
    ).pipe(
      catchError(() => of([]))
    );
  }
}
