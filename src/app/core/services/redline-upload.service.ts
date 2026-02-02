import { HttpClient } from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable, throwError} from 'rxjs';
import {PolicySet} from "../redline";
import {ConfigService} from "./config.service";
import {catchError} from "rxjs/operators";
import {CelExpression} from "../models/cel-expression.model";

@Injectable({
  providedIn: 'root'
})
export class RedlineUploadService {
  private http = inject(HttpClient);
  private configService = inject(ConfigService);

  private get baseUrl(): string {
    return this.configService.config?.apiUrl || 'http://localhost:3001/api/ui';
  }

  uploadFile(
      providerId: number,
      tenantId: number,
      participantId: number,
      publicMetadata: Record<string, any>,
      privateMetadata: Record<string, any>,
      file: File,
      celExpressions?: CelExpression[],
      policySet?: PolicySet
  ): Observable<void> {
    const formData = new FormData();

    // Add metadata as JSON blobs
    formData.append('publicMetadata', new Blob([JSON.stringify(publicMetadata)], { type: 'application/json' }));
    formData.append('privateMetadata', new Blob([JSON.stringify(privateMetadata)], { type: 'application/json' }));

    // Add optional parts
    if (celExpressions) {
      formData.append('celExpressions', new Blob([JSON.stringify(celExpressions)], { type: 'application/json' }));
    }
    if (policySet) {
      formData.append('policySet', new Blob([JSON.stringify(policySet)], { type: 'application/json' }));
    }

    // Add file
    formData.append('file', file, file.name);

    return this.http.post<void>(
        `${this.baseUrl}/service-providers/${providerId}/tenants/${tenantId}/participants/${participantId}/files`,
        formData
    ).pipe(
        catchError((error) => throwError(() => error))
    )
  }
}