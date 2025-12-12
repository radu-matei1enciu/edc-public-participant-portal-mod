import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { NotificationService, Notification } from './notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 z-50 space-y-2" style="min-width: 320px;">
      <div
        *ngFor="let notification of notifications"
        class="max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden transform transition-all duration-300 ease-in-out"
        [class.animate-slide-in]="true"
        style="min-height: 80px; min-width: 320px;"
        [style.border-left]="getBorderColor(notification.type)"
      >
        <div class="p-4" style="min-height: 60px;">
          <div class="flex items-start">
            <div class="flex-shrink-0" style="width: 24px; height: 24px;">
              <!-- Success Icon -->
              <svg *ngIf="notification.type === 'success'" class="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 24px; height: 24px;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <!-- Error Icon -->
              <svg *ngIf="notification.type === 'error'" class="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 24px; height: 24px;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <!-- Warning Icon -->
              <svg *ngIf="notification.type === 'warning'" class="h-6 w-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 24px; height: 24px;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
              <!-- Info Icon -->
              <svg *ngIf="notification.type === 'info'" class="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 24px; height: 24px;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div class="ml-3 flex-1 pt-0.5" style="min-width: 0; flex: 1;">
              <p class="text-sm font-medium text-gray-900" style="margin: 0 0 4px 0; line-height: 1.4;">{{ notification.title }}</p>
              <p class="mt-1 text-sm text-gray-500" style="margin: 0; line-height: 1.4;">{{ notification.message }}</p>
            </div>
            <div class="ml-4 flex-shrink-0 flex" style="width: 24px; height: 24px;">
              <button
                (click)="removeNotification(notification.id)"
                class="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                style="width: 24px; height: 24px; padding: 0; display: flex; align-items: center; justify-content: center;"
              >
                <span class="sr-only">Close</span>
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" style="width: 16px; height: 16px;">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        <!-- Progress bar -->
        <div class="h-1 bg-gray-200" style="height: 4px;">
          <div 
            class="h-1 transition-all duration-300 ease-linear"
            [class.bg-green-500]="notification.type === 'success'"
            [class.bg-red-500]="notification.type === 'error'"
            [class.bg-yellow-500]="notification.type === 'warning'"
            [class.bg-blue-500]="notification.type === 'info'"
            [style.width.%]="getProgressWidth(notification)"
            style="height: 4px;"
          ></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes slide-in {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    .animate-slide-in {
      animation: slide-in 0.3s ease-out;
    }
  `]
})
export class NotificationsComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  private subscription: Subscription = new Subscription();
  private notificationService = inject(NotificationService);

  ngOnInit(): void {
    this.subscription = this.notificationService.notifications$.subscribe(
      notifications => this.notifications = notifications
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  removeNotification(id: string): void {
    this.notificationService.removeNotification(id);
  }

  getProgressWidth(notification: Notification): number {
    if (!notification.duration) return 100;
    
    const elapsed = Date.now() - notification.timestamp.getTime();
    const remaining = Math.max(0, notification.duration - elapsed);
    return (remaining / notification.duration) * 100;
  }

  getBorderColor(type: string): string {
    switch (type) {
      case 'success': return '4px solid #10b981';
      case 'error': return '4px solid #ef4444';
      case 'warning': return '4px solid #f59e0b';
      case 'info': return '4px solid #3b82f6';
      default: return '4px solid #e5e7eb';
    }
  }

  getProgressColor(type: string): string {
    switch (type) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return '#6b7280';
    }
  }
}
