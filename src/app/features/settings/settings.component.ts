import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { UserPreferencesService, UserPreferences, UsageStats } from '../../core/services/user-preferences.service';
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
  usageStats: UsageStats | null = null;
  activeTab = 'appearance';
  settingsForm: FormGroup;

  get settingsTabs() {
    return [
      { id: 'appearance', label: 'Appearance', icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z"></path></svg>' },
      { id: 'dashboard', label: 'Dashboard', icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>' },
      { id: 'advanced', label: 'Advanced', icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>' },
      { id: 'accessibility', label: 'Accessibility', icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>' },
      { id: 'data', label: 'Data', icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>' }
    ];
  }

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
      fontSize: [''],
      autoRefreshInterval: [30],
      defaultPageSize: [10],
      apiEndpoint: ['']
    });
  }

  ngOnInit(): void {
    this.loadUsageStats();
    
    this.preferences$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(prefs => {
      this.settingsForm.patchValue({
        language: prefs.language || 'en',
        fontSize: prefs.fontSize || 'medium',
        autoRefreshInterval: prefs.autoRefreshInterval || 30,
        defaultPageSize: prefs.defaultPageSize || 10,
        apiEndpoint: prefs.apiEndpoint || ''
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

    this.settingsForm.get('autoRefreshInterval')?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(value => {
      this.updatePreference('autoRefreshInterval', value);
    });

    this.settingsForm.get('defaultPageSize')?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(value => {
      this.updatePreference('defaultPageSize', value);
    });

    this.settingsForm.get('apiEndpoint')?.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(value => {
      this.updatePreference('apiEndpoint', value);
    });
  }

  private loadUsageStats(): void {
    this.usageStats = this.preferencesService.getUsageStats();
  }

  updatePreference(key: keyof UserPreferences, value: UserPreferences[keyof UserPreferences]): void {
    this.preferencesService.updatePreferences({ [key]: value });
    this.loadUsageStats();
  }

  exportSettings(): void {
    const settings = this.preferencesService.exportPreferences();
    const blob = new Blob([settings], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'edc-client-participant-settings.json';
    link.click();
    window.URL.revokeObjectURL(url);

    this.modalService.alert({
      title: 'Settings Exported',
      message: 'Your settings have been exported successfully.',
      confirmText: 'OK'
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          if (this.preferencesService.importPreferences(content)) {
            this.modalService.alert({
              title: 'Settings Imported',
              message: 'Your settings have been imported successfully.',
              confirmText: 'OK'
            });
            this.loadUsageStats();
          } else {
            throw new Error('Invalid settings file');
          }
        } catch (error) {
          this.modalService.alert({
            title: 'Import Failed',
            message: 'The settings file is invalid or corrupted.',
            confirmText: 'OK'
          });
        }
      };
      reader.readAsText(file);
    }
  }

  async resetSettings(): Promise<void> {
    const confirmed = await this.modalService.confirm({
      title: 'Reset All Settings',
      message: 'Are you sure you want to reset all settings to their default values? This action cannot be undone.',
      confirmText: 'Reset',
      cancelText: 'Cancel',
      size: 'md'
    });

    if (confirmed) {
      this.preferencesService.resetPreferences();
      this.loadUsageStats();
      this.modalService.alert({
        title: 'Settings Reset',
        message: 'All settings have been reset to their default values.',
        confirmText: 'OK'
      });
    }
  }

  getEnabledFeatures(): string[] {
    if (!this.usageStats) return [];
    
    const features: string[] = [];
    Object.entries(this.usageStats.featuresEnabled).forEach(([key, value]) => {
      if (value) features.push(key);
    });
    Object.entries(this.usageStats.accessibility).forEach(([key, value]) => {
      if (value) features.push(key);
    });
    
    return features;
  }

  getSupportedLanguages() {
    return [
      { code: 'en', name: 'English' },
      { code: 'it', name: 'Italian' }
    ];
  }

  formatFeatureName(feature: string): string {
    return feature.replace(/([A-Z])/g, ' $1').trim();
  }

  showKeyboardShortcuts(): void {
    this.modalService.alert({
      title: 'Keyboard Shortcuts',
      message: `
        <div class="text-left space-y-2 text-sm">
          <div><kbd class="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded text-xs font-mono">Ctrl + /</kbd> - Toggle search</div>
          <div><kbd class="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded text-xs font-mono">Ctrl + K</kbd> - Quick actions</div>
          <div><kbd class="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded text-xs font-mono">Ctrl + \\</kbd> - Toggle sidebar</div>
          <div><kbd class="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded text-xs font-mono">Ctrl + Shift + D</kbd> - Toggle dark mode</div>
          <div><kbd class="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded text-xs font-mono">Esc</kbd> - Close modals</div>
        </div>
      `,
      isHtml: true,
      confirmText: 'Got it'
    });
  }
}
