import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Observable, interval, startWith, switchMap, catchError, of, debounceTime, distinctUntilChanged } from 'rxjs';
import { PartnerService } from '../../core/services/partner.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../shared/services/notification.service';
import { UserPreferencesService, UserPreferences } from '../../core/services/user-preferences.service';
import { DataspaceService } from '../../core/services/dataspace.service';
import { ConfigService } from '../../core/services/config.service';
import { Partner } from '../../core/models/partner.model';
import { DataspaceResource } from '../../core/models/dataspace.model';
import { UserProfile } from '../../core/models/participant.model';

@Component({
  selector: 'app-partners-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './partners-list.component.html',
  })
export class PartnersListComponent implements OnInit {
  partners: Partner[] = [];
  filteredPartners: Partner[] = [];
  filterForm: FormGroup;
  loading = false;
  preferences$: Observable<UserPreferences>;
  currentPage = 1;
  itemsPerPage = 10;
  userProfile: UserProfile | null = null;
  dataspaces: DataspaceResource[] = [];
  selectedDataspaceId: number | null = null;

  private partnerService = inject(PartnerService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private preferencesService = inject(UserPreferencesService);
  private dataspaceService = inject(DataspaceService);
  private configService = inject(ConfigService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);

  constructor() {
    this.filterForm = this.fb.group({
      searchTerm: [''],
      dataspaceId: ['']
    });
    this.preferences$ = this.preferencesService.preferences$;
  }

  ngOnInit(): void {
    this.loadDataspaces();
    
    this.authService.loadUserProfile().subscribe({
      next: (profile) => {
        this.userProfile = profile;
        if (this.selectedDataspaceId) {
          this.loadPartners();
        }
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

    this.filterForm.get('dataspaceId')?.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((dataspaceId) => {
      if (dataspaceId) {
        this.selectedDataspaceId = parseInt(dataspaceId);
        this.loadPartners();
      }
    });
  }

  loadDataspaces(): void {
    const userIds = this.authService.getCurrentUserIds();
    if (!userIds) {
      this.notificationService.showError('Error', 'Failed to load user profile');
      return;
    }

    this.dataspaceService.getParticipantDataspaces(userIds.providerId, userIds.tenantId, userIds.participantId).subscribe({
      next: (dataspaces) => {
        this.dataspaces = dataspaces;
        if (dataspaces.length > 0 && !this.selectedDataspaceId) {
          this.selectedDataspaceId = dataspaces[0].id;
          this.filterForm.patchValue({ dataspaceId: dataspaces[0].id.toString() });
        }
      },
      error: () => {
        this.notificationService.showError('Error', 'Failed to load dataspaces');
      }
    });
  }

  loadPartners(): void {
    if (!this.selectedDataspaceId) return;
    
    this.loading = true;
    this.partnerService.getPartners(this.selectedDataspaceId).subscribe({
      next: (partners) => {
        this.partners = partners;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notificationService.showError('Error', 'Failed to load partners');
      }
    });
  }

  applyFilters(): void {
    const searchTerm = this.filterForm.get('searchTerm')?.value?.toLowerCase() || '';

    this.filteredPartners = this.partners.filter(p => {
      const matchesSearch = !searchTerm || 
        p.name.toLowerCase().includes(searchTerm) ||
        (p.description && p.description.toLowerCase().includes(searchTerm)) ||
        (p.companyIdentifier && p.companyIdentifier.toLowerCase().includes(searchTerm));
      return matchesSearch;
    });

    this.currentPage = 1;
  }

  getPaginatedPartners(): Partner[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredPartners.slice(start, end);
  }

  getTotalPages(): number {
    return Math.ceil(this.filteredPartners.length / this.itemsPerPage);
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
