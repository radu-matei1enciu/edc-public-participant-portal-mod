import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable, interval, startWith, switchMap, catchError, of, debounceTime, distinctUntilChanged } from 'rxjs';
import { DataspaceService } from '../../core/services/dataspace.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../shared/services/notification.service';
import { UserPreferencesService, UserPreferences } from '../../core/services/user-preferences.service';
import { DataspaceResource } from '../../core/models/dataspace.model';
import { UserProfile } from '../../core/models/participant.model';

@Component({
    selector: 'app-memberships-list',
    standalone: true,
    imports: [CommonModule, RouterLink, ReactiveFormsModule],
    templateUrl: './memberships-list.component.html',
})
export class MembershipsListComponent implements OnInit {
    private dataspaceService = inject(DataspaceService);
    private authService = inject(AuthService);
    private notificationService = inject(NotificationService);
    private preferencesService = inject(UserPreferencesService);
    private destroyRef = inject(DestroyRef);
    private fb = inject(FormBuilder);
    private router = inject(Router);

    memberships: DataspaceResource[] = [];
    filteredMemberships: DataspaceResource[] = [];
    filterForm: FormGroup;
    loading = false;
    preferences$: Observable<UserPreferences>;
    currentPage = 1;
    itemsPerPage = 10;
    userProfile: UserProfile | null = null;
    participantId: number | null = null;

    showAddDialog = false;
    joinableDataspaces: DataspaceResource[] = [];
    joining = false;

    constructor() {
        this.filterForm = this.fb.group({
            searchTerm: ['']
        });
        this.preferences$ = this.preferencesService.preferences$;
    }

    ngOnInit(): void {
        this.authService.loadUserProfile().subscribe({
            next: (profile) => {
                this.userProfile = profile;
            },
            error: () => {
                this.notificationService.showError('Error', 'Failed to load user profile');
            }
        });

        this.preferences$.pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(prefs => {
            this.itemsPerPage = prefs.defaultPageSize || 10;
            this.currentPage = 1;
        });

        this.filterForm.get('searchTerm')?.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(() => {
            this.applyFilters();
        });

        this.loading = true;
        this.preferences$.pipe(
            switchMap(prefs => {
                const intervalMs = (prefs.autoRefreshInterval || 30) * 1000;
                return interval(intervalMs).pipe(
                    startWith(0),
                    switchMap(() => {
                        const userIds = this.authService.getRedlineUser();
                        if (!userIds) {
                            return of([] as DataspaceResource[]);
                        }
                        return this.dataspaceService.getTenantDataspaces(userIds.providerId, userIds.tenantId).pipe(
                            catchError(() => of([] as DataspaceResource[]))
                        );
                    })
                );
            }),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: (memberships: DataspaceResource[]) => {
                this.memberships = memberships;
                this.applyFilters();
                this.loading = false;
            },
            error: () => {
                this.loading = false;
                this.notificationService.showError('Error', 'Failed to load memberships');
            }
        });
    }

    applyFilters(): void {
        const searchTerm = this.filterForm.get('searchTerm')?.value?.toLowerCase() || '';
        this.filteredMemberships = this.memberships.filter((m: DataspaceResource) => {
            return !searchTerm ||
                m.name.toLowerCase().includes(searchTerm) ||
                (m.properties && m.properties.description?.toLowerCase().includes(searchTerm));
        });
        this.currentPage = 1;
    }

    getPaginatedMemberships(): DataspaceResource[] {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        return this.filteredMemberships.slice(start, end);
    }

    getTotalPages(): number {
        return Math.ceil(this.filteredMemberships.length / this.itemsPerPage);
    }

    previousPage(): void {
        if (this.currentPage > 1) this.currentPage--;
    }

    nextPage(): void {
        if (this.currentPage < this.getTotalPages()) this.currentPage++;
    }

    async openAddMembershipDialog(): Promise<void> {
        const user = this.authService.getRedlineUser();
        if (!user) {
            this.notificationService.showError('Error', 'Not logged in');
            return;
        }

        try {
            const all = await new Promise<DataspaceResource[]>((resolve, reject) =>
                this.dataspaceService.getDataspaces().subscribe({ next: resolve, error: reject })
            );
            const mine = await new Promise<DataspaceResource[]>((resolve, reject) =>
                this.dataspaceService
                    .getTenantDataspaces(user.providerId, user.tenantId)
                    .subscribe({ next: resolve, error: reject })
            );

            const mineIds = new Set(mine.map((d: DataspaceResource) => d.id));
            this.joinableDataspaces = all.filter((d: DataspaceResource) => !mineIds.has(d.id));

            if (this.joinableDataspaces.length === 0) {
                this.notificationService.showInfo('Info', 'You are already a member of every available dataspace.');
                return;
            }

            this.showAddDialog = true;
        } catch {
            this.notificationService.showError('Error', 'Failed to load available dataspaces');
        }
    }

    closeAddDialog(): void {
        this.showAddDialog = false;
        this.joinableDataspaces = [];
    }

    // Navigate to registration in join mode instead of calling the API directly.
    // The registration component will handle the actual join + deploy flow,
    // then redirect back to /memberships on completion.
    joinAndDeploy(dataspace: DataspaceResource): void {
        const user = this.authService.getRedlineUser();
        if (!user) {
            this.notificationService.showError('Error', 'Not logged in');
            return;
        }

        this.closeAddDialog();

        // Pass the company name from the current user profile so it can be pre-filled
        // and locked in the registration form (step 3).
        const companyName = this.authService.getSelectedParticipant()?.tenantName || '';

        this.router.navigate(['/registration'], {
            queryParams: {
                mode: 'join',
                dataspaceId: dataspace.id,
                companyName: companyName
            }
        });
    }
}