import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable, interval, startWith, switchMap, catchError, of, debounceTime, distinctUntilChanged } from 'rxjs';
import { MembershipService } from '../../core/services/membership.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../shared/services/notification.service';
import { UserPreferencesService, UserPreferences } from '../../core/services/user-preferences.service';
import { Membership } from '../../core/models/membership.model';
import { UserProfile } from '../../core/models/participant.model';

@Component({
  selector: 'app-memberships-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './memberships-list.component.html',
  })
export class MembershipsListComponent implements OnInit {
  private membershipService = inject(MembershipService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private preferencesService = inject(UserPreferencesService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);

  memberships: Membership[] = [];
  filteredMemberships: Membership[] = [];
  filterForm: FormGroup;
  loading = false;
  preferences$: Observable<UserPreferences>;
  currentPage = 1;
  itemsPerPage = 10;
  userProfile: UserProfile | null = null;
  participantId: number | null = null;

  constructor() {
    this.filterForm = this.fb.group({
      searchTerm: [''],
      statusFilter: ['']
    });
    this.preferences$ = this.preferencesService.preferences$;
  }

  ngOnInit(): void {
    this.authService.loadUserProfile().subscribe({
      next: (profile) => {
        this.userProfile = profile;
        this.participantId = profile.participant.id;
        this.loadMemberships();
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

    this.filterForm.get('statusFilter')?.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.applyFilters();
    });

    this.preferences$.pipe(
      switchMap(prefs => {
        const intervalMs = (prefs.autoRefreshInterval || 30) * 1000;
        return interval(intervalMs).pipe(
          startWith(0),
          switchMap(() => {
            if (this.participantId) {
              return this.membershipService.getMemberships(this.participantId).pipe(
                catchError(() => of([]))
              );
            }
            return of([]);
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
      }
    });
  }

  loadMemberships(): void {
    if (!this.participantId) return;
    
    this.loading = true;
    this.membershipService.getMemberships(this.participantId).subscribe({
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
    const statusFilter = this.filterForm.get('statusFilter')?.value || '';

    this.filteredMemberships = this.memberships.filter(m => {
      const matchesSearch = !searchTerm || 
        m.ecosystemName.toLowerCase().includes(searchTerm) ||
        m.ecosystemId.toLowerCase().includes(searchTerm);
      const matchesStatus = !statusFilter || m.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    this.currentPage = 1;
  }

  getPaginatedMemberships(): Membership[] {
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

  getStatusClass(status: string): string {
    switch (status) {
      case 'active':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'inactive':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
