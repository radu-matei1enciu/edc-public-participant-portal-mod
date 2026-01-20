import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { AuthUser } from '../../core/models/participant.model';

@Component({
  selector: 'app-role-error',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './role-error.component.html',
  styles: []
})
export class RoleErrorComponent implements OnInit {
  roleError: string | null = null;
  currentUser: AuthUser | null = null;
  private authService = inject(AuthService);

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      this.roleError = 'No user found';
    } else if (!this.currentUser.roles || this.currentUser.roles.length === 0) {
      this.roleError = 'No roles assigned to user';
    } else {
      this.roleError = null;
    }
  }

  logout(): void {
    this.authService.logout();
  }

  refresh(): void {
    window.location.reload();
  }
}
