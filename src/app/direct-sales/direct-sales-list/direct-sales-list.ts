import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ExcelHeaderFilter } from '../../shared/excel-header-filter';
import { applyFilters, columnOptions } from '../../shared/table-filter.util';
import { TablePreferencesService } from '../../table-preferences/table-preferences.service';
import { exportToExcel } from '../../shared/excel-export.util';
import { DirectSalesDueRow, DirectSalesService } from '../direct-sales.service';

type SortColumn = keyof DirectSalesDueRow;
type StatusFilter = 'open' | 'settled' | 'all';

interface ColumnDef {
  key: SortColumn;
  label: string;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'businessUnit', label: 'BU' },
  { key: 'division', label: 'Division' },
  { key: 'consignee', label: 'Consignee' },
  { key: 'blAwbNo', label: 'BL/AWB' },
  { key: 'category', label: 'Cat' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'dueAmount', label: 'Due Amount' },
  { key: 'dueCurrency', label: 'Currency' },
  { key: 'dueAmountUsd', label: 'Due Amount (USD)' },
  { key: 'collectedUsd', label: 'Collected (USD)' },
  { key: 'remainingUsd', label: 'Remaining (USD)' }
];

@Component({
  selector: 'app-direct-sales-list',
  imports: [CommonModule, FormsModule, ExcelHeaderFilter],
  templateUrl: './direct-sales-list.html'
})
export class DirectSalesList implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  allRows: DirectSalesDueRow[] = [];
  loading = true;
  error = '';
  searchText = '';
  sortColumn: SortColumn = 'dueDate';
  sortAsc = true;
  statusFilter: StatusFilter = 'open';

  columns: ColumnDef[] = [...DEFAULT_COLUMNS];
  private dragFromIndex: number | null = null;

  filters: Record<string, Set<string>> = {};

  constructor(private service: DirectSalesService, private tablePrefs: TablePreferencesService) {}

  ngOnInit(): void {
    this.tablePrefs.get('directSales').subscribe({
      next: (pref) => {
        if (pref) {
          this.sortColumn = pref.sortColumn as SortColumn;
          this.sortAsc = pref.sortAsc;
        }
        this.load();
      },
      error: () => this.load()
    });

    this.tablePrefs.getColumnOrder('directSales').subscribe({
      next: (order) => { if (order && order.length > 0) this.applyColumnOrder(order); }
    });
  }

  private applyColumnOrder(savedOrder: string[]): void {
    const byKey = new Map(DEFAULT_COLUMNS.map((c) => [c.key, c]));
    const ordered: ColumnDef[] = [];
    for (const key of savedOrder) {
      const col = byKey.get(key as SortColumn);
      if (col) { ordered.push(col); byKey.delete(key as SortColumn); }
    }
    ordered.push(...byKey.values());
    this.columns = ordered;
    this.cdr.markForCheck();
  }

  onDragStart(index: number): void {
    this.dragFromIndex = index;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(index: number): void {
    if (this.dragFromIndex === null || this.dragFromIndex === index) return;
    const cols = [...this.columns];
    const [moved] = cols.splice(this.dragFromIndex, 1);
    cols.splice(index, 0, moved);
    this.columns = cols;
    this.dragFromIndex = null;
    this.tablePrefs.saveColumnOrder('directSales', cols.map((c) => c.key)).subscribe();
  }

  load(): void {
    this.loading = true;
    this.service.getDues().subscribe({
      next: (r) => { this.allRows = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load Direct Sales dues.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  private ensureFilterKey(key: string): void {
    if (!this.filters[key]) this.filters[key] = new Set();
  }

  private getValue(row: DirectSalesDueRow, col: string): string {
    return String((row as any)[col] ?? '');
  }

  // Column filter options are computed off rows already narrowed by the
  // Open/Settled/All toggle and search text, so a filter dropdown never
  // offers a value that's currently hidden by those.
  private get statusAndSearchFiltered(): DirectSalesDueRow[] {
    let rows = this.allRows;
    if (this.statusFilter === 'open') rows = rows.filter((r) => !r.settled);
    else if (this.statusFilter === 'settled') rows = rows.filter((r) => r.settled);

    const q = this.searchText.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) =>
        r.consignee.toLowerCase().includes(q) ||
        r.blAwbNo.toLowerCase().includes(q) ||
        r.businessUnit.toLowerCase().includes(q)
      );
    }
    return rows;
  }

  optionsFor(col: string): string[] {
    this.ensureFilterKey(col);
    return columnOptions(this.statusAndSearchFiltered, this.filters, col, (r, c) => this.getValue(r, c));
  }

  onFilterChange(col: string, values: Set<string>): void {
    this.filters[col] = values;
    this.cdr.markForCheck();
  }

  isColumnFiltered(col: string): boolean {
    const selected = this.filters[col];
    if (!selected || selected.size === 0) return false;
    return selected.size < this.optionsFor(col).length;
  }

  setStatusFilter(value: StatusFilter): void {
    this.statusFilter = value;
    this.cdr.markForCheck();
  }

  get rows(): DirectSalesDueRow[] {
    const filtered = applyFilters(this.statusAndSearchFiltered, this.filters, (r, col) => this.getValue(r, col));
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

  onExportClick(): void {
    exportToExcel('Direct Sales', this.columns, this.rows);
  }

  sortBy(column: SortColumn): void {
    if (this.sortColumn === column) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortColumn = column;
      this.sortAsc = true;
    }
    this.tablePrefs.save('directSales', this.sortColumn, this.sortAsc).subscribe();
  }

  get totalDueAmountUsd(): number {
    return this.rows.reduce((sum, r) => sum + r.dueAmountUsd, 0);
  }

  get totalCollectedUsd(): number {
    return this.rows.reduce((sum, r) => sum + r.collectedUsd, 0);
  }

  get totalRemainingUsd(): number {
    return this.rows.reduce((sum, r) => sum + r.remainingUsd, 0);
  }
}
