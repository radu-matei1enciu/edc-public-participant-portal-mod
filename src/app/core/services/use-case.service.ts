import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UseCase } from '../models/use-case.model';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class UseCaseService {
  private http = inject(HttpClient);
  private configService = inject(ConfigService);

  private get baseUrl(): string {
    return this.configService.config?.apiUrl || 'http://localhost:3001/api/ui';
  }

  getUseCases(): Observable<UseCase[]> {
    return this.http.get<UseCase[]>(`${this.baseUrl}/use-cases`).pipe(
      catchError(() => of([
        { id: 'catena-x', name: 'catena-x', label: 'Catena-X', description: 'Catena-X use cases' },
        { id: 'gaia-x', name: 'gaia-x', label: 'Gaia-X', description: 'Gaia-X use cases' }
      ]))
    );
  }
}
