import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SupplierDueRow, SupplierDuesService } from '../supplier-dues.service';

@Component({
  selector: 'app-supplier-dues-list',
  imports: [CommonModule, RouterLink],
  templateUrl: './supplier-dues-list.html'
})
export class SupplierDuesList implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  rows: SupplierDueRow[] = [];
  loading = true;
  error = '';

  constructor(private service: SupplierDuesService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.getOpen().subscribe({
      next: (r) => { this.rows = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load supplier dues.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  get totalValueUsd(): number {
    return this.rows.reduce((sum, r) => sum + r.totalValueUsd, 0);
  }

  get totalUnpaidUsd(): number {
    return this.rows.reduce((sum, r) => sum + r.totalUnpaidUsd, 0);
  }
}
