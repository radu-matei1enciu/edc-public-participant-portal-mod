import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { UserPreferencesService, UserPreferences } from '../../core/services/user-preferences.service';
import { ModalService } from '../../core/services/modal.service';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './settings.component.html'
})
export class SettingsComponent implements OnInit {
  private preferencesService = inject(UserPreferencesService);
  private modalService = inject(ModalService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);

  preferences$: Observable<UserPreferences>;
  settingsForm: FormGroup;

  get themeOptions() {
    return [
      { value: 'light', label: 'Light', icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>' },
      { value: 'dark', label: 'Dark', icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>' },
      { value: 'system', label: 'System', icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>' }
    ];
  }

  get colorSchemes() {
    return [
      { value: 'default', label: 'Default', color: 'linear-gradient(45deg, #6366f1, #8b5cf6)' },
      { value: 'blue', label: 'Blue', color: 'linear-gradient(45deg, #3b82f6, #1d4ed8)' },
      { value: 'green', label: 'Green', color: 'linear-gradient(45deg, #10b981, #047857)' },
      { value: 'purple', label: 'Purple', color: 'linear-gradient(45deg, #8b5cf6, #7c3aed)' },
      { value: 'orange', label: 'Orange', color: 'linear-gradient(45deg, #f59e0b, #d97706)' }
    ];
  }

  constructor() {
    this.preferences$ = this.preferencesService.preferences$;
    this.settingsForm = this.fb.group({
      language: [''],
      fontSize: ['']
    });
  }

  ngOnInit(): void {
    this.preferences$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(prefs => {
      this.settingsForm.patchValue({
        language: prefs.language || 'en',
        fontSize: prefs.fontSize || 'medium'
      }, { emitEvent: false });
    });

    this.settingsForm.get('language')?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(value => {
      this.updatePreference('language', value);
    });

    this.settingsForm.get('fontSize')?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(value => {
      this.updatePreference('fontSize', value);
    });
  }

  updatePreference(key: keyof UserPreferences, value: UserPreferences[keyof UserPreferences]): void {
    this.preferencesService.updatePreferences({ [key]: value });
  }

  getSupportedLanguages() {
    return [
      { code: 'en', name: 'English' },
      { code: 'it', name: 'Italian' }
    ];
  }

}
