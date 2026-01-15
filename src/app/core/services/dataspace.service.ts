import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Dataspace, Ecosystem } from '../models/ecosystem.model';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class DataspaceService {
  private http = inject(HttpClient);
  private configService = inject(ConfigService);
  private readonly defaultBaseUrl = 'http://localhost:3001/v1';

  private get baseUrl(): string {
    return this.configService.config?.apiUrl || this.defaultBaseUrl;
  }

  getDataspaces(): Observable<Dataspace[]> {
    return this.http.get<Dataspace[]>(`${this.baseUrl}/dataspaces`).pipe(
      catchError(() => of([]))
    );
  }

  getEcosystems(): Observable<Ecosystem[]> {
    return this.http.get<Ecosystem[]>(`${this.baseUrl}/ecosystems`).pipe(
      catchError(() => of([]))
    );
  }
}
