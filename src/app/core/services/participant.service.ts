import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { 
  Participant, 
  ParticipantRegistrationRequest, 
  ParticipantRegistrationResponse, 
  ApiError,
  CredentialRequest,
  CredentialRequestResponse,
  CredentialResponse
} from '../models/participant.model';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class ParticipantService {
  private http = inject(HttpClient);
  private configService = inject(ConfigService);
  private readonly defaultBaseUrl = 'http://localhost:3001/v1';

  private get baseUrl(): string {
    return this.configService.config?.apiUrl || this.defaultBaseUrl;
  }

  registerParticipant(participant: ParticipantRegistrationRequest): Observable<ParticipantRegistrationResponse> {
    return this.http.post<ParticipantRegistrationResponse>(`${this.baseUrl}/participants`, participant)
      .pipe(
        catchError(this.handleError)
      );
  }

  getParticipant(id: string): Observable<Participant> {
    return this.http.get<Participant>(`${this.baseUrl}/participants/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  updateParticipant(id: string, participant: Partial<Participant>): Observable<Participant> {
    return this.http.patch<Participant>(`${this.baseUrl}/participants/${id}`, participant)
      .pipe(
        catchError(this.handleError)
      );
  }

  deleteParticipant(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/participants/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  getParticipants(params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    currentOperation?: string;
    name?: string;
  } = {}): Observable<{
    content: Participant[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
  }> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params.sortDir) queryParams.set('sortDir', params.sortDir);
    if (params.currentOperation) queryParams.set('currentOperation', params.currentOperation);
    if (params.name) queryParams.set('name', params.name);

    const url = `${this.baseUrl}/participants${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    return this.http.get<any>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  validateParticipantName(name: string): boolean {
    const dnsRegex = /^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?$/;
    return dnsRegex.test(name) && name.length >= 3 && name.length <= 63;
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validateFiscalCode(fiscalCode: string): boolean {
    const fiscalCodeRegex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
    return fiscalCodeRegex.test(fiscalCode.toUpperCase());
  }

  validateVatNumber(vatNumber: string): boolean {
    const vatRegex = /^[0-9]{11}$/;
    return vatRegex.test(vatNumber);
  }

  getCredentials(participantId: string): Observable<CredentialResponse[]> {
    return this.http.get<CredentialResponse[]>(`${this.baseUrl}/participants/${participantId}/credentials`)
      .pipe(
        catchError(this.handleError)
      );
  }

  requestCredentials(participantId: string, credentialRequest: CredentialRequest): Observable<CredentialRequestResponse> {
    return this.http.post<CredentialRequestResponse>(`${this.baseUrl}/participants/${participantId}/credentials`, credentialRequest)
      .pipe(
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
            errorMessage = 'Conflict. The participant may already exist.';
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

    const apiError: ApiError = {
      message: errorMessage,
      status: error.status,
      timestamp: new Date().toISOString(),
      path: error.url || '',
      details: error.error
    };

    return throwError(() => apiError);
  }
}