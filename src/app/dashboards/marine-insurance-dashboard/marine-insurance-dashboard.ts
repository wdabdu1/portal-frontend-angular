import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { exportToExcel } from '../../shared/excel-export.util';
import { ExcelHeaderFilter } from '../../shared/excel-header-filter';
import { applyFilters, columnOptions } from '../../shared/table-filter.util';
import { TablePreferencesService } from '../../table-preferences/table-preferences.service';
import { MarineInsuranceDashboardService, MarineInsuranceRow } from '../marine-insurance-dashboard.service';

interface ColumnDef { key: string; label: string; }

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'marineInsurance', label: 'Marine Insurance' },
  { key: 'businessUnit', label: 'BU' },
  { key: 'blAwbNo', label: 'BL/No' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'consignee', label: 'Consignee' },
  { key: 'category', label: 'Cat' },
  { key: 'modelProduct', label: 'Product/Model' },
  { key: 'currency', label: 'Currency' },
  { key: 'value', label: 'Value' },
  { key: 'valueUsd', label: 'Value USD (converted)' },
  { key: 'etd', label: 'ETD' },
  { key: 'actualSob', label: 'Actual SOB' },
  { key: 'portOfLoading', label: 'Port of Loading' },
  { key: 'portOfDischarge', label: 'Port of Discharge' }
];

@Component({
  selector: 'app-marine-insurance-dashboard',
  imports: [CommonModule, FormsModule, ExcelHeaderFilter],
  templateUrl: './marine-insurance-dashboard.html'
})
export class MarineInsuranceDashboard implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  error: string | null = null;
  allRows: MarineInsuranceRow[] = [];
  columns: ColumnDef[] = [...DEFAULT_COLUMNS];
  filters: Record<string, Set<string>> = {};

  // Default sort: ETD ascending, per the request.
  sortColumn = 'etd';
  sortAsc = true;

  private dragIndex: number | null = null;

  constructor(private service: MarineInsuranceDashboardService, private tablePrefs: TablePreferencesService) {}

  ngOnInit(): void {
    this.service.getAll().subscribe({
      next: (r) => {
        this.allRows = r;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = err?.status === 403
          ? 'You do not have permission to view the Marine Insurance dashboard.'
          : 'Could not load the Marine Insurance dashboard.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });

    this.tablePrefs.getColumnOrder('marine-insurance-dashboard').subscribe({
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
    if (col === 'marineInsurance') return row[col] ? 'Yes' : 'No';
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

  get rows(): MarineInsuranceRow[] {
    const filtered = applyFilters(this.allRows, this.filters, (r, col) => this.getValue(r, col));
    const dir = this.sortAsc ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = (a as any)[this.sortColumn];
      const bv = (b as any)[this.sortColumn];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
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
    this.tablePrefs.saveColumnOrder('marine-insurance-dashboard', cols.map((c) => c.key)).subscribe();
  }

  onExportClick(): void {
    exportToExcel('Marine Insurance', this.columns, this.rows);
  }
}
