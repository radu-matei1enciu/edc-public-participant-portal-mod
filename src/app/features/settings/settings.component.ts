import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ParticipantService } from '../../core/services/participant.service';
import { AuthUser, UserProfile } from '../../core/models/participant.model';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-4xl mx-auto">
        <!-- Success Notification -->
        <div *ngIf="showSuccess" class="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="ml-3 flex-1">
              <h3 class="text-sm font-medium text-green-800">Account deleted successfully</h3>
              <div class="mt-1 text-sm text-green-700">
                <p>Your account has been permanently deleted.</p>
                <p *ngIf="logoutCountdown > 0" class="mt-2 font-medium">
                  You will be logged out in {{ logoutCountdown }} second{{ logoutCountdown !== 1 ? 's' : '' }}...
                </p>
                <p *ngIf="logoutCountdown === 0" class="mt-2 font-medium">
                  Logging out now...
                </p>
              </div>
            </div>
            <div class="ml-auto pl-3 flex items-center space-x-2">
              <button
                (click)="performLogout()"
                class="inline-flex items-center px-3 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md transition-colors duration-200">
                <svg class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout Now
              </button>
              <button
                (click)="dismissSuccess()"
                class="inline-flex text-green-400 hover:text-green-600 focus:outline-none focus:text-green-600 transition-colors duration-200">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Error Notification -->
        <div *ngIf="showError" class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div class="ml-3 flex-1">
              <h3 class="text-sm font-medium text-red-800">Error deleting account</h3>
              <div class="mt-1 text-sm text-red-700">
                <p>{{ errorMessage }}</p>
              </div>
            </div>
            <div class="ml-auto pl-3">
              <button
                (click)="dismissError()"
                class="inline-flex text-red-400 hover:text-red-600 focus:outline-none focus:text-red-600 transition-colors duration-200">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Account Settings</h1>
          <p class="text-lg text-gray-600">Manage your account and preferences</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Account Information -->
          <div class="lg:col-span-2">
            <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <svg class="h-6 w-6 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Account Information
              </h2>
              
              <div class="space-y-4" *ngIf="userProfile">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                    <div class="p-3 bg-gray-50 rounded-lg border">
                      <span class="text-gray-900">{{ userProfile.participant.name }}</span>
                    </div>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Company ID</label>
                    <div class="p-3 bg-gray-50 rounded-lg border">
                      <span class="text-gray-900 font-mono text-sm">{{ userProfile.participant.id }}</span>
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <div class="p-3 bg-gray-50 rounded-lg border">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            [class]="userProfile.participant.currentOperation === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'">
                        {{ userProfile.participant.currentOperation }}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Registration Date</label>
                    <div class="p-3 bg-gray-50 rounded-lg border">
                      <span class="text-gray-900">{{ formatDate(userProfile.participant.createdAt) }}</span>
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">DID</label>
                    <div class="p-3 bg-gray-50 rounded-lg border">
                      <span class="text-gray-900 font-mono text-sm break-all">{{ userProfile.participant.did || 'Not available' }}</span>
                    </div>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Host</label>
                    <div class="p-3 bg-gray-50 rounded-lg border">
                      <span class="text-gray-900 font-mono text-sm break-all">{{ userProfile.participant.host || 'Not available' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Danger Zone -->
            <div class="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
              <h2 class="text-xl font-semibold text-red-900 mb-4 flex items-center">
                <svg class="h-6 w-6 text-red-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Danger Zone
              </h2>
              
              <div class="bg-red-50 rounded-lg p-4 mb-4">
                <h3 class="text-lg font-medium text-red-900 mb-2">Delete Account</h3>
                <p class="text-red-700 text-sm mb-4">
                  Once you delete your account, there is no going back. This action will permanently remove your account and all associated data from the EDC platform.
                </p>
                <ul class="text-red-700 text-sm space-y-1 mb-4">
                  <li>• Your participant account will be permanently deleted</li>
                  <li>• All your data will be removed from the system</li>
                  <li>• You will be automatically logged out</li>
                  <li>• This action cannot be undone</li>
                </ul>
              </div>

              <div class="flex flex-col sm:flex-row gap-4">
                <button
                  (click)="confirmDeleteAccount()"
                  [disabled]="isDeleting"
                  class="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center">
                  <svg *ngIf="isDeleting" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <svg *ngIf="!isDeleting" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {{ isDeleting ? 'Deleting Account...' : 'Delete Account' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Sidebar -->
          <div class="lg:col-span-1">
            <div class="bg-white rounded-lg shadow-lg p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div class="space-y-3">
                <button
                  (click)="goToDashboard()"
                  class="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex items-center">
                  <svg class="h-5 w-5 text-gray-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
                  </svg>
                  <span class="text-gray-700">Back to Dashboard</span>
                </button>
                
                <button
                  (click)="logout()"
                  class="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex items-center">
                  <svg class="h-5 w-5 text-gray-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span class="text-gray-700">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div *ngIf="showDeleteModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div class="p-6">
          <div class="flex items-center mb-4">
            <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <div class="text-center">
            <h3 class="text-lg font-medium text-gray-900 mb-2">Delete Account</h3>
            <p class="text-sm text-gray-500 mb-4">
              Are you sure you want to delete your account? This action cannot be undone.
            </p>
            <div class="bg-red-50 rounded-lg p-3 mb-4">
              <p class="text-sm text-red-700 font-medium">
                Type "DELETE" to confirm
              </p>
              <input
                [(ngModel)]="deleteConfirmation"
                type="text"
                placeholder="Type DELETE here"
                class="mt-2 w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500">
            </div>
          </div>
          <div class="flex flex-col sm:flex-row gap-3">
            <button
              (click)="cancelDelete()"
              class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors duration-200">
              Cancel
            </button>
            <button
              (click)="deleteAccount()"
              [disabled]="deleteConfirmation !== 'DELETE' || isDeleting"
              class="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200">
              {{ isDeleting ? 'Deleting...' : 'Delete Account' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class SettingsComponent implements OnInit, OnDestroy {
  userProfile: UserProfile | null = null;
  isDeleting = false;
  showDeleteModal = false;
  deleteConfirmation = '';
  showSuccess = false;
  showError = false;
  errorMessage = '';
  logoutCountdown = 0;
  countdownInterval: any = null;

  private authService = inject(AuthService);
  private participantService = inject(ParticipantService);
  private router = inject(Router);

  ngOnInit(): void {
    if (!this.authService.hasValidRoles()) {
      this.router.navigate(['/role-error']);
      return;
    }
    this.loadUserProfile();
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  loadUserProfile(): void {
    this.authService.loadUserProfile().subscribe({
      next: (profile) => {
        this.userProfile = profile;
      },
      error: (error) => {
      }
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Not available';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  logout(): void {
    this.authService.logout().then(() => {
      this.router.navigate(['/']);
    }).catch(() => {
      this.router.navigate(['/']);
    });
  }

  confirmDeleteAccount(): void {
    this.showDeleteModal = true;
    this.deleteConfirmation = '';
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.deleteConfirmation = '';
  }

  deleteAccount(): void {
    if (this.deleteConfirmation !== 'DELETE' || !this.userProfile) {
      return;
    }

    this.isDeleting = true;
    this.showError = false;
    
    this.participantService.deleteParticipant(this.userProfile.participant.id).subscribe({
      next: () => {
        this.showSuccess = true;
        this.isDeleting = false;
        this.showDeleteModal = false;
        
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 200);
        
        this.startLogoutCountdown();
      },
      error: (error) => {
        this.isDeleting = false;
        this.showDeleteModal = false;
        
        this.errorMessage = this.getErrorMessage(error);
        this.showError = true;
        
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 200);
        
        setTimeout(() => {
          this.showError = false;
        }, 10000);
      }
    });
  }

  dismissError(): void {
    this.showError = false;
    this.errorMessage = '';
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  }

  dismissSuccess(): void {
    this.showSuccess = false;
    this.stopCountdown();
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  }

  startLogoutCountdown(): void {
    this.logoutCountdown = 5; // 5 seconds countdown
    
    this.countdownInterval = setInterval(() => {
      this.logoutCountdown--;
      
      if (this.logoutCountdown <= 0) {
        this.stopCountdown();
        this.performLogout();
      }
    }, 1000);
  }

  stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.logoutCountdown = 0;
  }

  performLogout(): void {
    this.authService.logout().then(() => {
      this.router.navigate(['/']);
    }).catch(() => {
      this.router.navigate(['/']);
    });
  }

  private getErrorMessage(error: any): string {
    if (error?.status) {
      switch (error.status) {
        case 401:
        case 403:
          return 'You are not authorized to perform this action. Please log in again.';
        case 404:
          return 'Account not found. It may have already been deleted.';
        case 409:
          return 'Cannot delete account at this time. Please try again later.';
        case 500:
        case 502:
        case 503:
        case 504:
          return 'Service temporarily unavailable. Please try again later.';
        default:
          return 'Unable to delete account at this time. Please try again later.';
      }
    }
    
    return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
  }
}
