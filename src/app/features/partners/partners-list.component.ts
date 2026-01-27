import {Component, DestroyRef, inject, OnInit} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {CommonModule} from '@angular/common';
import {RouterLink} from '@angular/router';
import {FormBuilder, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {debounceTime, distinctUntilChanged, firstValueFrom, Observable} from 'rxjs';
import {PartnerService} from '../../core/services/partner.service';
import {AuthService} from '../../core/services/auth.service';
import {NotificationService} from '../../shared/services/notification.service';
import {UserPreferences, UserPreferencesService} from '../../core/services/user-preferences.service';
import {DataspaceService} from '../../core/services/dataspace.service';
import {ConfigService} from '../../core/services/config.service';
import {Partner} from '../../core/models/partner.model';
import {DataspaceResource} from '../../core/models/dataspace.model';
import {UserProfile} from '../../core/models/participant.model';

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

  async ngOnInit(): Promise<void> {
    await this.loadDataspaces();
    await this.loadPartners();
    
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

  async loadDataspaces(): Promise<void> {
    try {
      this.dataspaces = await firstValueFrom(this.dataspaceService.getDataspaces());
      if (this.dataspaces.length > 0 && !this.selectedDataspaceId) {
        this.selectedDataspaceId = this.dataspaces[0].id;
        this.filterForm.patchValue({ dataspaceId: this.dataspaces[0].id.toString() });
      }
    } catch (_) {
      this.notificationService.showError('Error', 'Failed to load dataspaces');
    }
  }

  async loadPartners(): Promise<void> {
    if (this.selectedDataspaceId === null) return;

    this.loading = true;
    const ids = this.authService.getRedlineUser();
    if (!ids) {
      this.loading = false;
      return;
    }

    try {
      this.partners = await firstValueFrom(this.partnerService.getPartners(ids.providerId, ids.tenantId, ids.participantId, this.selectedDataspaceId));
      this.applyFilters();
      this.loading = false;
    } catch (_) {
      this.loading = false;
      this.notificationService.showError('Error', 'Failed to load partners');
    }
  }

  applyFilters(): void {
    const searchTerm = this.filterForm.get('searchTerm')?.value?.toLowerCase() || '';

    this.filteredPartners = this.partners.filter(p => {
      const matchesSearch = !searchTerm || 
        p.nickname.toLowerCase().includes(searchTerm) ||
        p.identifier.toLowerCase().includes(searchTerm) ||
        (p.properties?.industry && p.properties.industry.toLowerCase().includes(searchTerm)) ||
        (p.properties?.contactEmail && p.properties.contactEmail.toLowerCase().includes(searchTerm)) ||
        (p.properties?.region && p.properties.region.toLowerCase().includes(searchTerm));
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
