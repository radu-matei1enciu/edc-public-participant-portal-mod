import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ModalService, ModalConfig } from '../../../core/services/modal.service';

@Component({
    selector: 'app-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './modal.component.html'
})
export class ModalComponent implements OnInit {
  private modalService = inject(ModalService);
  private destroyRef = inject(DestroyRef);

  modals: ModalConfig[] = [];

  ngOnInit(): void {
    this.modalService.modals$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(modals => {
      this.modals = modals;
    });
  }

  onBackdropClick(modal: ModalConfig): void {
    if (modal.backdropClose !== false) {
      this.closeModal(modal.id);
    }
  }

  onConfirm(modal: ModalConfig): void {
    if (modal.onConfirm) {
      modal.onConfirm();
    }
    this.closeModal(modal.id);
  }

  onCancel(modal: ModalConfig): void {
    if (modal.onCancel) {
      modal.onCancel();
    }
    this.closeModal(modal.id);
  }

  closeModal(id: string): void {
    this.modalService.close(id);
  }
}
