import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
    return this.http.get<UseCase[]>(`${this.baseUrl}/use-cases`);
  }
}
