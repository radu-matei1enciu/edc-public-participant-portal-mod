import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Ecosystem } from '../models/ecosystem.model';
import { DataspaceResource } from '../models/dataspace.model';
import { ConfigService } from './config.service';
import { RedlineUser } from '../models/redline-user.model';
import { forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

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

    /**
     * Returns the dataspace the currently-selected participant belongs to.
     * In the one-participant-per-dataspace model this list has exactly one element.
     * Replaces the old `getCatenaDataspace` which hardcoded "catena" as a name substring.
     */
    async getActiveDataspace(redlineUser: RedlineUser): Promise<DataspaceResource> {
        const list = await firstValueFrom(
            this.getParticipantDataspaces(redlineUser.providerId, redlineUser.tenantId, redlineUser.participantId)
        );
        if (!list || list.length === 0) {
            return Promise.reject('No dataspace found for the current participant');
        }
        return list[0];
    }

    /**
     * Kept as a thin alias so we don't break any code paths that still reference the old name.
     * New code should use getActiveDataspace.
     */
    async getCatenaDataspace(redlineUser: RedlineUser): Promise<DataspaceResource> {
        return this.getActiveDataspace(redlineUser);
    }

    /**
     * Adds the current tenant to an additional dataspace by creating a new Participant on it.
     * Caller must subsequently call deployParticipant(...) to provision the new participant in CFM.
     */
    joinDataspace(providerId: number, tenantId: number, participantId: number, dataspaceId: number, roles: string[] = []): Observable<any> {
        return this.http.post<any>(
            `${this.baseUrl}/service-providers/${providerId}/tenants/${tenantId}/participants/${participantId}/dataspaces/${dataspaceId}/join`,
            { roles }
        );
    }

    getTenantDataspaces(providerId: number, tenantId: number): Observable<DataspaceResource[]> {
        return this.http.get<any>(
            `${this.baseUrl}/service-providers/${providerId}/tenants/${tenantId}`
        ).pipe(
            switchMap(tenant => {
                const participantIds: number[] = (tenant.participants || []).map((p: any) => p.id);
                if (participantIds.length === 0) return of([]);
                return forkJoin(
                    participantIds.map(pid =>
                        this.getParticipantDataspaces(providerId, tenantId, pid)
                    )
                ).pipe(
                    map(results => {
                        const seen = new Set<number>();
                        return results.flat().filter(ds => {
                            if (seen.has(ds.id)) return false;
                            seen.add(ds.id);
                            return true;
                        });
                    })
                );
            }),
            catchError(() => of([]))
        );
    }
}
