import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {Observable, of} from 'rxjs';
import { UseCase } from '../models/use-case.model';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class UseCaseService {
  private http = inject(HttpClient);
  private configService = inject(ConfigService);

  getUseCases(): Observable<UseCase[]> {
    const useCases = this.configService.getNestedValue<UseCase[]>('useCases');
    return useCases ? of(useCases) : of([]);
  }
}
