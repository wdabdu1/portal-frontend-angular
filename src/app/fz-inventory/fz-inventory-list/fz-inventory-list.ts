import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClearanceService, FzInventoryRow } from '../../clearance/clearance.service';

type SortColumn = keyof FzInventoryRow;

@Component({
  selector: 'app-fz-inventory-list',
  imports: [CommonModule, RouterLink],
  templateUrl: './fz-inventory-list.html'
})
export class FzInventoryList implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  rows: FzInventoryRow[] = [];
  loading = true;
  error = '';

  sortColumn: SortColumn = 'dateOfDeposit';
  sortAsc = true;

  constructor(private service: ClearanceService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.getFzInventory().subscribe({
      next: (r) => { this.rows = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load FZ inventory.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  get sortedRows(): FzInventoryRow[] {
    const dir = this.sortAsc ? 1 : -1;
    return [...this.rows].sort((a, b) => {
      const av = a[this.sortColumn];
      const bv = b[this.sortColumn];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }

  sortBy(column: SortColumn): void {
    if (this.sortColumn === column) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortColumn = column;
      this.sortAsc = true;
    }
  }

  get totalQty(): number {
    return this.rows.reduce((sum, r) => sum + r.totalQty, 0);
  }
  get totalWithdrawn(): number {
    return this.rows.reduce((sum, r) => sum + r.totalWithdrawn, 0);
  }
  get totalBalance(): number {
    return this.rows.reduce((sum, r) => sum + r.balance, 0);
  }
}
