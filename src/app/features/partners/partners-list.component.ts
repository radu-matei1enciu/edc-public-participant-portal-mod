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
import { Partner } from '../../core/models/partner.model';
import { UserProfile } from '../../core/models/participant.model';

@Component({
  selector: 'app-partners-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './partners-list.component.html',
  })
export class PartnersListComponent implements OnInit {
  private partnerService = inject(PartnerService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private preferencesService = inject(UserPreferencesService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);

  partners: Partner[] = [];
  filteredPartners: Partner[] = [];
  filterForm: FormGroup;
  loading = false;
  preferences$: Observable<UserPreferences>;
  currentPage = 1;
  itemsPerPage = 10;
  userProfile: UserProfile | null = null;
  participantId: string = '';
  showAddPartnerModal = false;
  addingPartner = false;
  partnerForm!: FormGroup;

  constructor() {
    this.filterForm = this.fb.group({
      searchTerm: ['']
    });
    this.partnerForm = this.fb.group({
      name: ['', [Validators.required]],
      description: [''],
      companyIdentifier: ['']
    });
    this.preferences$ = this.preferencesService.preferences$;
  }

  ngOnInit(): void {
    this.authService.loadUserProfile().subscribe({
      next: (profile) => {
        this.userProfile = profile;
        this.participantId = profile.participant.id;
        this.loadPartners();
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

    this.preferences$.pipe(
      switchMap(prefs => {
        const intervalMs = (prefs.autoRefreshInterval || 30) * 1000;
        return interval(intervalMs).pipe(
          startWith(0),
          switchMap(() => {
            if (this.participantId) {
              return this.partnerService.getPartners(this.participantId).pipe(
                catchError(() => of([]))
              );
            }
            return of([]);
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (partners) => {
        this.partners = partners;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadPartners(): void {
    if (!this.participantId) return;
    
    this.loading = true;
    this.partnerService.getPartners(this.participantId).subscribe({
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

  closeAddPartnerModal(): void {
    this.showAddPartnerModal = false;
    this.partnerForm.reset();
  }

  addPartner(): void {
    if (this.partnerForm.invalid || !this.participantId) return;

    this.addingPartner = true;
    this.partnerService.addPartner(this.participantId, this.partnerForm.value).subscribe({
      next: () => {
        this.notificationService.showSuccess('Success', 'Partner added successfully');
        this.closeAddPartnerModal();
        this.loadPartners();
        this.addingPartner = false;
      },
      error: () => {
        this.notificationService.showError('Error', 'Failed to add partner');
        this.addingPartner = false;
      }
    });
  }
}
