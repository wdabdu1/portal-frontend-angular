import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExcelHeaderFilter } from '../../shared/excel-header-filter';
import { applyFilters, columnOptions } from '../../shared/table-filter.util';
import { TablePreferencesService } from '../../table-preferences/table-preferences.service';
import { ClearanceService, FzInventoryItemRow } from '../../clearance/clearance.service';
import { FzDepositOption, WithdrawalService, WithdrawalSummary } from '../../withdrawal/withdrawal.service';

type SortColumn = keyof FzInventoryItemRow;
type FilterColumn = 'businessUnit' | 'category' | 'modelProduct' | 'depositRefNo' | 'blAwbNo';

@Component({
  selector: 'app-fz-inventory-list',
  imports: [CommonModule, FormsModule, ExcelHeaderFilter],
  templateUrl: './fz-inventory-list.html'
})
export class FzInventoryList implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  allRows: FzInventoryItemRow[] = [];
  loading = true;
  error = '';

  sortColumn: SortColumn = 'dateOfDeposit';
  sortAsc = true;

  filters: Record<FilterColumn, Set<string>> = {
    businessUnit: new Set(),
    category: new Set(),
    modelProduct: new Set(),
    depositRefNo: new Set(),
    blAwbNo: new Set()
  };

  depositOptions: FzDepositOption[] = [];
  showNewWithdrawalForm = false;
  newWithdrawalDepositId: number | null = null;
  creatingWithdrawal = false;

  withdrawals: WithdrawalSummary[] = [];
  loadingWithdrawals = true;

  constructor(
    private service: ClearanceService,
    private tablePrefs: TablePreferencesService,
    private withdrawalService: WithdrawalService,
    private router: Router
  ) {}

  toggleNewWithdrawalForm(): void {
    this.showNewWithdrawalForm = !this.showNewWithdrawalForm;
    if (this.showNewWithdrawalForm && this.depositOptions.length === 0) {
      this.withdrawalService.getDepositOptions().subscribe({
        next: (r) => { this.depositOptions = r; this.cdr.markForCheck(); }
      });
    }
  }

  startWithdrawal(): void {
    if (!this.newWithdrawalDepositId) return;
    this.creatingWithdrawal = true;
    this.withdrawalService.create(this.newWithdrawalDepositId).subscribe({
      next: (w) => {
        this.creatingWithdrawal = false;
        this.router.navigate(['/withdrawals', w.id]);
      },
      error: () => { this.creatingWithdrawal = false; this.error = 'Could not start withdrawal.'; this.cdr.markForCheck(); }
    });
  }

  loadWithdrawals(): void {
    this.loadingWithdrawals = true;
    this.withdrawalService.getAll().subscribe({
      next: (r) => { this.withdrawals = r.filter((w) => !w.isCompleted); this.loadingWithdrawals = false; this.cdr.markForCheck(); },
      error: () => { this.loadingWithdrawals = false; this.cdr.markForCheck(); }
    });
  }

  openWithdrawal(id: number): void {
    this.router.navigate(['/withdrawals', id]);
  }

  ngOnInit(): void {
    this.loadWithdrawals();
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
      next: (r) => { this.allRows = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load FZ inventory.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  private getValue(row: FzInventoryItemRow, col: string): string {
    return String((row as any)[col] ?? '');
  }

  optionsFor(col: FilterColumn): string[] {
    return columnOptions(this.allRows, this.filters, col, (r) => this.getValue(r, col));
  }

  onFilterChange(col: FilterColumn, values: Set<string>): void {
    this.filters[col] = values;
  }

  get filteredRows(): FzInventoryItemRow[] {
    return applyFilters(this.allRows, this.filters, (r, col) => this.getValue(r, col));
  }

  get destinations(): string[] {
    return [...new Set(this.filteredRows.map((r) => r.destination))].sort();
  }

  rowsFor(destination: string): FzInventoryItemRow[] {
    const rows = this.filteredRows.filter((r) => r.destination === destination);
    const dir = this.sortAsc ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[this.sortColumn];
      const bv = b[this.sortColumn];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }

  totalsFor(destination: string) {
    const rows = this.rowsFor(destination);
    return {
      deposited: rows.reduce((s, r) => s + r.qtyDeposited, 0),
      withdrawn: rows.reduce((s, r) => s + r.qtyWithdrawn, 0),
      stock: rows.reduce((s, r) => s + r.currentStock, 0)
    };
  }

  sortIndicator(column: SortColumn): string {
    if (this.sortColumn !== column) return '';
    return this.sortAsc ? ' ▲' : ' ▼';
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
}
