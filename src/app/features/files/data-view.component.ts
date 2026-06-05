import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { interval, Subscription, of } from 'rxjs';
import { startWith, switchMap, catchError } from 'rxjs/operators';
import { EndpointService } from '../../core/services/endpoint.service';
import { QcResult } from '../../core/models/endpoint-resource.model';

@Component({
    selector: 'app-data-view',
    standalone: true,
    imports: [CommonModule, RouterLink, DatePipe],
    templateUrl: './data-view.component.html',
    styleUrl: './data-view.component.scss'
})
export class DataViewComponent implements OnInit, OnDestroy {
    private route       = inject(ActivatedRoute);
    private endpointSvc = inject(EndpointService);

    assetId      = '';
    endpointUrl  = '';
    token        = '';

    results: QcResult[]  = [];
    isLoading            = true;
    error: string | null = null;
    lastUpdated: Date | null = null;
    newRowIds            = new Set<string>();

    private pollSub?: Subscription;
    private prevIds  = new Set<string>();

    ngOnInit(): void {
        this.assetId = this.route.snapshot.paramMap.get('assetId') ?? '';

        // Token and endpoint URL passed via router state from explore-list
        const state = history.state as { token?: string; endpointUrl?: string };
        this.token       = state.token       ?? '';
        this.endpointUrl = state.endpointUrl ?? '';

        if (!this.token || !this.endpointUrl) {
            this.error = 'No transfer token available. Please navigate from the Explore page and request access first.';
            this.isLoading = false;
            return;
        }

        this.startPolling();
    }

    private startPolling(): void {
        this.pollSub = interval(10_000).pipe(
            startWith(0),
            switchMap(() =>
                this.endpointSvc.getEndpointData(this.endpointUrl, this.token).pipe(
                    catchError(err => {
                        this.error = `Failed to reach the data endpoint: ${err.message ?? 'Unknown error'}. Retrying…`;
                        return of([] as QcResult[]);
                    })
                )
            )
        ).subscribe(data => {
            if (data.length > 0) this.error = null;
            this.isLoading = false;

            const sorted = [...data].sort(
                (a, b) => new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime()
            );

            this.newRowIds.clear();
            if (this.prevIds.size > 0) {
                sorted.forEach(r => { if (!this.prevIds.has(r.id)) this.newRowIds.add(r.id); });
            }
            this.prevIds     = new Set(sorted.map(r => r.id));
            this.results     = sorted;
            this.lastUpdated = new Date();

            if (this.newRowIds.size > 0) {
                setTimeout(() => { this.newRowIds.clear(); }, 2000);
            }
        });
    }

    formatTime(iso: string): string {
        return new Date(iso).toLocaleTimeString('en-GB', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    }

    ngOnDestroy(): void {
        this.pollSub?.unsubscribe();
    }
}