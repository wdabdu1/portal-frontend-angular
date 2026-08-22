import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ExcelHeaderFilter } from '../shared/excel-header-filter';
import { applyFilters, columnOptions } from '../shared/table-filter.util';
import { TablePreferencesService } from '../table-preferences/table-preferences.service';
import { exportToExcel } from '../shared/excel-export.util';
import { PriceHistoryRow, PriceHistoryService } from './price-history.service';

type SortColumn = keyof PriceHistoryRow;

interface ColumnDef {
  key: SortColumn;
  label: string;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'businessUnit', label: 'BU' },
  { key: 'blAwbNo', label: 'BL' },
  { key: 'actualArrivalDate', label: 'Actual Arrival Date' },
  { key: 'category', label: 'Cat' },
  { key: 'modelProduct', label: 'Model/Product' },
  { key: 'hsCode', label: 'HS Code' },
  { key: 'description', label: 'Description' },
  { key: 'costPrice', label: 'CP' },
  { key: 'currency', label: 'Currency' }
];

@Component({
  selector: 'app-price-history',
  imports: [CommonModule, FormsModule, ExcelHeaderFilter],
  templateUrl: './price-history.html'
})
export class PriceHistory implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  allRows: PriceHistoryRow[] = [];
  loading = true;
  error = '';
  searchText = '';
  sortColumn: SortColumn = 'actualArrivalDate';
  sortAsc = false;

  columns: ColumnDef[] = [...DEFAULT_COLUMNS];
  private dragFromIndex: number | null = null;

  filters: Record<string, Set<string>> = {};

  constructor(private service: PriceHistoryService, private tablePrefs: TablePreferencesService) {}

  ngOnInit(): void {
    this.tablePrefs.get('priceHistory').subscribe({
      next: (pref) => {
        if (pref) {
          this.sortColumn = pref.sortColumn as SortColumn;
          this.sortAsc = pref.sortAsc;
        }
        this.load();
      },
      error: () => this.load()
    });

    this.tablePrefs.getColumnOrder('priceHistory').subscribe({
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
    this.tablePrefs.saveColumnOrder('priceHistory', cols.map((c) => c.key)).subscribe();
  }

  load(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (r) => { this.allRows = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load price history.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  private ensureFilterKey(key: string): void {
    if (!this.filters[key]) this.filters[key] = new Set();
  }

  getValue(row: PriceHistoryRow, col: string): string {
    return String((row as any)[col] ?? '');
  }

  optionsFor(col: string): string[] {
    this.ensureFilterKey(col);
    return columnOptions(this.allRows, this.filters, col, (r, c) => this.getValue(r, c));
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

  get rows(): PriceHistoryRow[] {
    let filtered = this.allRows;
    const q = this.searchText.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((r) =>
        r.blAwbNo.toLowerCase().includes(q) ||
        r.modelProduct.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q) ||
        (r.hsCode ?? '').toLowerCase().includes(q)
      );
    }
    filtered = applyFilters(filtered, this.filters, (r, col) => this.getValue(r, col));
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
    exportToExcel('Price History', this.columns, this.rows);
  }

  sortBy(column: SortColumn): void {
    if (this.sortColumn === column) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortColumn = column;
      this.sortAsc = true;
    }
    this.tablePrefs.save('priceHistory', this.sortColumn, this.sortAsc).subscribe();
  }
}
