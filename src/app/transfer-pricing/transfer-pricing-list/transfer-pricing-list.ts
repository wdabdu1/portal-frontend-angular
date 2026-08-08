import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TpOrderSummary, TransferPricingService } from '../transfer-pricing.service';

@Component({
  selector: 'app-transfer-pricing-list',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './transfer-pricing-list.html'
})
export class TransferPricingList implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  allOrders: TpOrderSummary[] = [];
  loading = true;
  error = '';

  // Defaults to Pending so Corp Finance lands on their actual work queue —
  // Confirmed orders are still one click away via the toggle.
  statusFilter: 'Pending' | 'Confirmed' | 'All' = 'Pending';
  searchText = '';

  constructor(private service: TransferPricingService, private router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.getOrders().subscribe({
      next: (r) => { this.allOrders = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load orders.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  get orders(): TpOrderSummary[] {
    let filtered = this.allOrders;
    if (this.statusFilter === 'Pending') filtered = filtered.filter((o) => !o.isConfirmed);
    if (this.statusFilter === 'Confirmed') filtered = filtered.filter((o) => o.isConfirmed);

    const q = this.searchText.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((o) =>
        o.blAwbNo.toLowerCase().includes(q) || o.poNumber.toLowerCase().includes(q) || o.businessUnit.toLowerCase().includes(q)
      );
    }
    return filtered;
  }

  openOrder(shipmentId: number): void {
    this.router.navigate(['/transfer-pricing', shipmentId]);
  }
}
