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
    this.roleError = this.authService.getRoleError();
    this.currentUser = this.authService.getCurrentUser();
  }

  logout(): void {
    this.authService.logout();
  }

  refresh(): void {
    window.location.reload();
  }
}
