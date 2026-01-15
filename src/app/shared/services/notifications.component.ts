import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { NotificationService, Notification } from './notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
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
