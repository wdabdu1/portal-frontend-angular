import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderDetailsService, PurchaseOrderDetail } from './order-details.service';

@Component({
  selector: 'app-order-details',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './order-details.html'
})
export class OrderDetails implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private orderId = 0;

  order: PurchaseOrderDetail | null = null;
  loading = true;
  error = '';

  // The one part of a PO that's genuinely editable after creation —
  // the advance is typically agreed and paid weeks before the first
  // shipment exists.
  editingAdvance = false;
  advanceForm = { advancePaymentPercent: null as number | null, advancePaymentPlannedDate: '', advancePaymentExecutedDate: '' };
  savingAdvance = false;
  advanceError = '';

  constructor(private service: OrderDetailsService) {}

  ngOnInit(): void {
    this.orderId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  load(): void {
    this.service.get(this.orderId).subscribe({
      next: (r) => {
        this.order = r;
        this.advanceForm = {
          advancePaymentPercent: r.advancePaymentPercent,
          advancePaymentPlannedDate: r.advancePaymentPlannedDate ?? '',
          advancePaymentExecutedDate: r.advancePaymentExecutedDate ?? ''
        };
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.error = 'Could not load order details.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  startEditAdvance(): void {
    this.editingAdvance = true;
  }

  cancelEditAdvance(): void {
    this.editingAdvance = false;
    if (this.order) {
      this.advanceForm = {
        advancePaymentPercent: this.order.advancePaymentPercent,
        advancePaymentPlannedDate: this.order.advancePaymentPlannedDate ?? '',
        advancePaymentExecutedDate: this.order.advancePaymentExecutedDate ?? ''
      };
    }
  }

  saveAdvance(): void {
    this.savingAdvance = true;
    this.advanceError = '';
    this.service.saveAdvancePayment(this.orderId, {
      advancePaymentPercent: this.advanceForm.advancePaymentPercent,
      advancePaymentPlannedDate: this.advanceForm.advancePaymentPlannedDate || null,
      advancePaymentExecutedDate: this.advanceForm.advancePaymentExecutedDate || null
    }).subscribe({
      next: () => { this.savingAdvance = false; this.editingAdvance = false; this.load(); },
      error: () => { this.savingAdvance = false; this.advanceError = 'Could not save. Only Managers/Editors can update this.'; this.cdr.markForCheck(); }
    });
  }
}
