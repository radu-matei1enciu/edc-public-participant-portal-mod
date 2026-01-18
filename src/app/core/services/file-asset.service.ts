import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FileAsset } from '../models/file-asset.model';
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

  uploadFiles(participantId: number, files: File[], metadata: { useCase?: string; partnerId?: string; description?: string; dataspace?: string }): Observable<FileAsset[]> {
    const formData = new FormData();
    
    files.forEach(file => {
      formData.append('files', file);
    });
    
    if (metadata.useCase) formData.append('useCase', metadata.useCase);
    if (metadata.partnerId) formData.append('partnerId', metadata.partnerId);
    if (metadata.description) formData.append('description', metadata.description);
    if (metadata.dataspace) formData.append('dataspace', metadata.dataspace);


    return this.http.post<FileAsset[]>(`${this.baseUrl}/participants/${participantId}/files`, formData).pipe(
      catchError((error) => {
        const errorMessage = error.error?.message || error.message || 'Failed to upload files';
        throw new Error(errorMessage);
      })
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

  requestAccess(participantId: number, fileId: string, partnerId?: string, partnerName?: string): Observable<{ success: boolean; message?: string }> {
    const body: { partnerId?: string; partnerName?: string } = {};
    if (partnerId) body.partnerId = partnerId;
    if (partnerName) body.partnerName = partnerName;
    
    return this.http.post<{ success: boolean; message?: string }>(`${this.baseUrl}/participants/${participantId}/files/${fileId}/request-access`, body).pipe(
      catchError(() => {
        throw new Error('Failed to request access');
      })
    );
  }

  updateFile(participantId: number, fileId: string, updates: { useCase?: string; partnerId?: string }): Observable<FileAsset> {
    return this.http.patch<FileAsset>(`${this.baseUrl}/participants/${participantId}/files/${fileId}`, updates).pipe(
      catchError((error) => {
        const errorMessage = error.error?.message || error.message || 'Failed to update file';
        throw new Error(errorMessage);
      })
    );
  }
}
