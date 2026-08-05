import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TablePreferencesService } from '../../table-preferences/table-preferences.service';
import { ClearanceService, FzInventoryRow } from '../../clearance/clearance.service';

type SortColumn = keyof FzInventoryRow;

@Component({
  selector: 'app-fz-inventory-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './fz-inventory-list.html'
})
export class FzInventoryList implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  rows: FzInventoryRow[] = [];
  loading = true;
  error = '';

  sortColumn: SortColumn = 'dateOfDeposit';
  sortAsc = true;

  filterBusinessUnit = '';

  constructor(private service: ClearanceService, private tablePrefs: TablePreferencesService) {}

  ngOnInit(): void {
    this.tablePrefs.get('fzInventory').subscribe({
      next: (pref) => {
        if (pref) {
          this.sortColumn = pref.sortColumn as SortColumn;
          this.sortAsc = pref.sortAsc;
        }
        this.load();
      },
      error: () => this.load()
    });
  }

  load(): void {
    this.loading = true;
    this.service.getFzInventory().subscribe({
      next: (r) => { this.rows = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load FZ inventory.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  get businessUnitOptions(): string[] {
    return [...new Set(this.rows.map((r) => r.businessUnit))].sort();
  }

  get sortedRows(): FzInventoryRow[] {
    let filtered = this.rows;
    if (this.filterBusinessUnit) filtered = filtered.filter((r) => r.businessUnit === this.filterBusinessUnit);

    const dir = this.sortAsc ? 1 : -1;
    return [...filtered].sort((a, b) => {
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
    this.tablePrefs.save('fzInventory', this.sortColumn, this.sortAsc).subscribe();
  }

  get totalQty(): number {
    return this.sortedRows.reduce((sum, r) => sum + r.totalQty, 0);
  }
  get totalWithdrawn(): number {
    return this.sortedRows.reduce((sum, r) => sum + r.totalWithdrawn, 0);
  }
  get totalBalance(): number {
    return this.sortedRows.reduce((sum, r) => sum + r.balance, 0);
  }
}
