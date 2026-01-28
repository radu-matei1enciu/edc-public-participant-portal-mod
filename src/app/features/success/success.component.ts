import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ConfigService } from '../../core/services/config.service';
import { ParticipantService, ParticipantActivation } from '../../core/services/participant.service';
import { Subject, timer, of, merge } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';
import {DATE_FORMATS} from "../../shared/utils/format.utils";

@Component({
  selector: 'app-success',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './success.component.html',
  styles: []
})
export class SuccessComponent implements OnInit, OnDestroy {
  tenantId: string | null = null;
  participantId: string | null = null;
  participantName: string | null = null;
  username: string | null = null;
  private authService = inject(AuthService);
  private configService = inject(ConfigService);
  private participantService = inject(ParticipantService);
  private destroy$ = new Subject<void>();
  private pollStop$ = new Subject<void>();

  provisioning = true;
  finalizing = false;
  provisionError: string | null = null;
  activation: ParticipantActivation | null = null;
  agentsSorted: ParticipantActivation['agents'] = [];
  startedAt = Date.now();
  elapsedMs = 0;

  private static readonly AGENT_DISPLAY_ORDER = ['CREDENTIAL_SERVICE', 'CONTROL_PLANE', 'DATA_PLANE'];

  constructor(
      private route: ActivatedRoute,
      private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.tenantId = params['tenantId'] || null;
      this.participantId = params['participantId'] || null;
      this.participantName = params['participantName'] || null;
      this.username = params['username'] || null;

      this.startProvisioningPoll();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private startProvisioningPoll(): void {
    const providerId = this.configService.config?.defaultServiceProviderId || 1;
    const tenantId = this.tenantId ? parseInt(this.tenantId, 10) : NaN;
    const participantId = this.participantId ? parseInt(this.participantId, 10) : NaN;
    if (!tenantId || !participantId || isNaN(tenantId) || isNaN(participantId)) {
      this.provisioning = false;
      this.provisionError = 'Missing tenant/participant information for provisioning.';
      return;
    }

    const pollIntervalMs = this.configService.config?.provisioning?.pollIntervalMs ?? 2000;
    const maxWaitMs = this.configService.config?.provisioning?.maxWaitMs ?? 90000;

    this.provisioning = true;
    this.finalizing = false;
    this.provisionError = null;
    this.startedAt = Date.now();
    this.pollStop$ = new Subject<void>();

    timer(0, pollIntervalMs).pipe(
      takeUntil(merge(this.destroy$, this.pollStop$)),
      switchMap(() => {
        if (!this.provisioning) return of(null);
        this.elapsedMs = Date.now() - this.startedAt;
        if (this.elapsedMs > maxWaitMs) {
          throw new Error('Provisioning timeout. Please try again in a few moments.');
        }
        return this.participantService.getParticipantActivationByTenant(providerId, tenantId, participantId);
      }),
      catchError((err) => {
        const msg = err?.message || 'Provisioning failed.';
        this.provisioning = false;
        this.finalizing = false;
        this.provisionError = msg;
        this.pollStop$.next();
        return of([]);
      })
    ).subscribe((participant: ParticipantActivation | null | unknown) => {
      if (!this.provisioning) return;
      if (participant == null || Array.isArray(participant)) return;

      this.activation = participant as ParticipantActivation;
      const agents = this.activation.agents || [];
      this.agentsSorted = this.sortAgents(agents);
      const allActive = agents.length > 0 && agents.every(a => a.state === 'ACTIVE');
      if (allActive) {
        this.pollStop$.next();
        this.finalizing = true;
        this.participantService.registerDataPlaneByTenant(providerId, tenantId, participantId).subscribe({
          next: () => {
            this.finalizing = false;
            this.provisioning = false;
          },
          error: (err) => {
            this.finalizing = false;
            this.provisioning = false;
            this.provisionError = err?.message || 'Finalization failed.';
          }
        });
      }
    });
  }

  private sortAgents(agents: ParticipantActivation['agents']): ParticipantActivation['agents'] {
    const order = SuccessComponent.AGENT_DISPLAY_ORDER;
    return [...agents].sort((a, b) => {
      const i = order.indexOf(a.type);
      const j = order.indexOf(b.type);
      return (i === -1 ? 999 : i) - (j === -1 ? 999 : j);
    });
  }

  retryProvisioning(): void {
    this.startProvisioningPoll();
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }

  goToRegistration(): void {
    this.router.navigate(['/registration']);
  }

  goToLogin(): void {
    localStorage.setItem('returnUrl', '/dashboard');
    this.authService.login();
  }

  protected readonly DATE_FORMATS = DATE_FORMATS;
}
