import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { 
  NewTenantRegistration,
  TenantResource,
  ParticipantResource,
  NewDataspaceInfo
} from '../models/tenant.model';
import { ConfigService } from './config.service';
import { ParticipantService } from './participant.service';

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  private http = inject(HttpClient);
  private configService = inject(ConfigService);
  private participantService = inject(ParticipantService);

  private get baseUrl(): string {
    return this.configService.config?.apiUrl || 'http://localhost:3001/api/ui';
  }

  registerTenant(providerId: number, registration: NewTenantRegistration): Observable<TenantResource> {
    return this.http.post<TenantResource>(
      `${this.baseUrl}/service-providers/${providerId}/tenants`,
      registration
    ).pipe(
      catchError(this.handleError)
    );
  }

  getTenant(providerId: number, tenantId: number): Observable<TenantResource> {
    return this.http.get<TenantResource>(
      `${this.baseUrl}/service-providers/${providerId}/tenants/${tenantId}`
    ).pipe(
      catchError(this.handleError)
    );
  }



  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      if (error.error && error.error.message) {
        errorMessage = error.error.message;
      } else {
        switch (error.status) {
          case 400:
            errorMessage = 'Invalid request. Check the entered data.';
            break;
          case 401:
            errorMessage = 'Unauthorized. Please log in.';
            break;
          case 403:
            errorMessage = 'Access denied. You do not have the necessary permissions.';
            break;
          case 404:
            errorMessage = 'Resource not found.';
            break;
          case 409:
            errorMessage = 'Conflict. The resource may already exist.';
            break;
          case 422:
            errorMessage = 'Invalid data. Check the required fields.';
            break;
          case 500:
            errorMessage = 'Internal server error. Please try again later.';
            break;
          default:
            errorMessage = `Server error: ${error.status}`;
        }
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}
