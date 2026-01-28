import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable, interval, startWith, switchMap, catchError, of, debounceTime, distinctUntilChanged } from 'rxjs';
import { DataspaceService } from '../../core/services/dataspace.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../shared/services/notification.service';
import { UserPreferencesService, UserPreferences } from '../../core/services/user-preferences.service';
import { ConfigService } from '../../core/services/config.service';
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
  private configService = inject(ConfigService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);

  memberships: DataspaceResource[] = [];
  filteredMemberships: DataspaceResource[] = [];
  filterForm: FormGroup;
  loading = false;
  preferences$: Observable<UserPreferences>;
  currentPage = 1;
  itemsPerPage = 10;
  userProfile: UserProfile | null = null;
  participantId: number | null = null;

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
              return of([]);
            }
            return this.dataspaceService.getParticipantDataspaces(userIds.providerId, userIds.tenantId, userIds.participantId).pipe(
              catchError(() => of([]))
            );
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (memberships) => {
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

    this.filteredMemberships = this.memberships.filter(m => {
      const matchesSearch = !searchTerm || 
        m.name.toLowerCase().includes(searchTerm) ||
        (m.properties && m.properties.description.toLowerCase().includes(searchTerm)) ||
        (m.properties && m.properties.region.toLowerCase().includes(searchTerm)) ||
        (m.properties && m.properties.protocol.toLowerCase().includes(searchTerm));
      return matchesSearch;
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
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.getTotalPages()) {
      this.currentPage++;
    }
  }


}
