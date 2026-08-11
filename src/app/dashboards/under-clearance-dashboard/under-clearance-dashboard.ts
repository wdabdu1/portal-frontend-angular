import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { exportToExcel } from '../../shared/excel-export.util';
import { ExcelHeaderFilter } from '../../shared/excel-header-filter';
import { applyFilters, columnOptions } from '../../shared/table-filter.util';
import { TablePreferencesService } from '../../table-preferences/table-preferences.service';
import { ClearanceDashboardRow, UnderClearanceDashboardService } from '../under-clearance-dashboard.service';

interface ColumnDef { key: string; label: string; }

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'blAwbNo', label: 'BL No.' },
  { key: 'clearanceProgressPercent', label: 'Clearance Progress' },
  { key: 'businessUnit', label: 'BU' },
  { key: 'category', label: 'Cat' },
  { key: 'modelProduct', label: 'Product/Model' },
  { key: 'qty', label: 'Qty' },
  { key: 'fcl', label: 'FCL' },
  { key: 'eta', label: 'ETA' },
  { key: 'clearanceCompletionDate', label: 'Clearance Completion Date' },
  { key: 'daysRemaining', label: 'Days Remaining' },
  { key: 'route', label: 'Route' },
  { key: 'clearanceFrom', label: 'Clearance From' },
  { key: 'status', label: 'Status' }
];

@Component({
  selector: 'app-under-clearance-dashboard',
  imports: [CommonModule, FormsModule, ExcelHeaderFilter],
  templateUrl: './under-clearance-dashboard.html'
})
export class UnderClearanceDashboard implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  allRows: (ClearanceDashboardRow & { fcl: string })[] = [];
  columns: ColumnDef[] = [...DEFAULT_COLUMNS];
  filters: Record<string, Set<string>> = {};
  sortColumn = 'daysRemaining';
  sortAsc = true;

  buFilter = 'All';
  // Defaults to hiding Completed — this stays the active work queue;
  // finished ones are still one click away via the toggle.
  statusFilter = 'Under Process';

  private dragIndex: number | null = null;

  constructor(private service: UnderClearanceDashboardService, private tablePrefs: TablePreferencesService) {}

  ngOnInit(): void {
    this.service.getAll().subscribe({
      next: (r) => {
        this.allRows = r.map((row) => ({ ...row, fcl: `${row.fcl20Count}x20' ${row.fcl40Count}x40'` }));
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });

    this.tablePrefs.getColumnOrder('under-clearance-dashboard').subscribe({
      next: (o) => { if (o && o.length > 0) this.columns = this.applyOrder(o); }
    });
  }

  private applyOrder(savedOrder: string[]): ColumnDef[] {
    const byKey = new Map(DEFAULT_COLUMNS.map((c) => [c.key, c]));
    const ordered: ColumnDef[] = [];
    for (const key of savedOrder) {
      const col = byKey.get(key);
      if (col) { ordered.push(col); byKey.delete(key); }
    }
    ordered.push(...byKey.values());
    return ordered;
  }

  getValue(row: any, col: string): string {
    return String(row[col] ?? '');
  }

  optionsFor(col: string): string[] {
    if (!this.filters[col]) this.filters[col] = new Set();
    return columnOptions(this.allRows, this.filters, col, (r, c) => this.getValue(r, c));
  }
  onFilterChange(col: string, values: Set<string>): void { this.filters[col] = values; this.cdr.markForCheck(); }
  isColumnFiltered(col: string): boolean {
    const selected = this.filters[col];
    if (!selected || selected.size === 0) return false;
    return selected.size < this.optionsFor(col).length;
  }

  get uniqueBu(): string[] { return [...new Set(this.allRows.map((r) => r.businessUnit))].sort(); }

  get rows(): (ClearanceDashboardRow & { fcl: string })[] {
    let filtered = applyFilters(this.allRows, this.filters, (r, col) => this.getValue(r, col));
    if (this.buFilter !== 'All') filtered = filtered.filter((r) => r.businessUnit === this.buFilter);
    if (this.statusFilter !== 'All') filtered = filtered.filter((r) => r.status === this.statusFilter);
    const dir = this.sortAsc ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = (a as any)[this.sortColumn] ?? '';
      const bv = (b as any)[this.sortColumn] ?? '';
      return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
    });
  }

  sortBy(col: string): void {
    if (this.sortColumn === col) this.sortAsc = !this.sortAsc;
    else { this.sortColumn = col; this.sortAsc = true; }
  }

  onDragStart(i: number): void { this.dragIndex = i; }
  onDrop(i: number): void {
    if (this.dragIndex === null || this.dragIndex === i) return;
    const cols = [...this.columns];
    const [moved] = cols.splice(this.dragIndex, 1);
    cols.splice(i, 0, moved);
    this.columns = cols;
    this.dragIndex = null;
    this.tablePrefs.saveColumnOrder('under-clearance-dashboard', cols.map((c) => c.key)).subscribe();
  }

  onExportClick(): void {
    exportToExcel('Under Clearance Dashboard', this.columns, this.rows);
  }
}
