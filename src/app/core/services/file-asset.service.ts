import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FileAsset } from '../models/file-asset.model';
import { UseCase } from '../models/use-case.model';
import { ConfigService } from './config.service';

export interface FileSearchFilters {
  search?: string;
  useCase?: string;
  origin?: 'owned' | 'remote';
  company?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileAssetService {
  private http = inject(HttpClient);
  private configService = inject(ConfigService);
  private get baseUrl(): string {
    return this.configService.config?.apiUrl || 'http://localhost:3001/api/ui';
  }

  getFiles(participantId: number, filters?: FileSearchFilters): Observable<FileAsset[]> {
    let url = `${this.baseUrl}/participants/${participantId}/files`;
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.useCase) params.append('useCase', filters.useCase);
    if (filters?.origin) params.append('origin', filters.origin);
    if (params.toString()) url += '?' + params.toString();

    return this.http.get<FileAsset[]>(url).pipe(
      catchError(() => of([]))
    );
  }

  getFileDetails(participantId: number, fileId: string): Observable<FileAsset> {
    return this.http.get<FileAsset>(`${this.baseUrl}/participants/${participantId}/files/${fileId}`).pipe(
      catchError(() => {
        throw new Error('Failed to load file details');
      })
    );
  }

  uploadFile(participantId: number, file: File, metadata: { useCase?: string; partnerId?: string }): Observable<FileAsset> {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata.useCase) formData.append('useCase', metadata.useCase);
    if (metadata.partnerId) formData.append('partnerId', metadata.partnerId);

    return this.http.post<FileAsset>(`${this.baseUrl}/participants/${participantId}/files`, formData).pipe(
      catchError(() => {
        throw new Error('Failed to upload file');
      })
    );
  }

  getUseCases(): Observable<UseCase[]> {
    return this.http.get<UseCase[]>(`${this.baseUrl}/use-cases`).pipe(
      catchError(() => of([
        { id: 'catena-x', name: 'catena-x', label: 'Catena-X', description: 'Catena-X use cases' },
        { id: 'gaia-x', name: 'gaia-x', label: 'Gaia-X', description: 'Gaia-X use cases' }
      ]))
    );
  }

  searchFiles(query: string, filters?: Pick<FileSearchFilters, 'company' | 'useCase'>): Observable<FileAsset[]> {
    let url = `${this.baseUrl}/catalog/search`;
    const params = new URLSearchParams();
    params.append('q', query);
    if (filters?.company) params.append('company', filters.company);
    if (filters?.useCase) params.append('useCase', filters.useCase);
    url += '?' + params.toString();

    return this.http.get<FileAsset[]>(url).pipe(
      catchError(() => of([]))
    );
  }

  requestAccess(participantId: number, fileId: string): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(`${this.baseUrl}/participants/${participantId}/files/${fileId}/request-access`, {}).pipe(
      catchError(() => {
        throw new Error('Failed to request access');
      })
    );
  }
}
