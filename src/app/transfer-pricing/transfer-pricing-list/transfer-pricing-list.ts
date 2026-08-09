import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { exportToExcel } from '../../shared/excel-export.util';
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

  onExportClick(): void {
    const exportRows = this.orders.map((o) => ({ ...o, route: o.routeCompanyNames.join(' → ') + ' → Onshore', statusLabel: o.isConfirmed ? 'Confirmed' : 'Pending' }));
    exportToExcel('Transfer Pricing Orders', [
      { label: 'Created', key: 'createdAt' },
      { label: 'BU', key: 'businessUnit' },
      { label: 'BL/AWB No.', key: 'blAwbNo' },
      { label: 'PO Number', key: 'poNumber' },
      { label: 'Supplier', key: 'supplierName' },
      { label: 'Supplier Value (USD)', key: 'supplierValueUsd' },
      { label: 'Route', key: 'route' },
      { label: 'Status', key: 'statusLabel' }
    ], exportRows);
  }

  openOrder(shipmentId: number): void {
    this.router.navigate(['/transfer-pricing', shipmentId]);
  }
}
