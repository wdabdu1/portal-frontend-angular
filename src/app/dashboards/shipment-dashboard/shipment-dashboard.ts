import { CommonModule, formatDate } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { exportToExcel } from '../../shared/excel-export.util';
import { ExcelHeaderFilter } from '../../shared/excel-header-filter';
import { applyFilters, columnOptions } from '../../shared/table-filter.util';
import { TablePreferencesService } from '../../table-preferences/table-preferences.service';
import { ShipmentDashboardRow, ShipmentDashboardService } from '../shipment-dashboard.service';

interface ColumnDef { key: string; label: string; }

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'orderCreationDate', label: 'Order Creation Date' },
  { key: 'currentStatus', label: 'Status' },
  { key: 'businessUnit', label: 'BU' },
  { key: 'blAwbNo', label: 'BL No.' },
  { key: 'poNumber', label: 'PO' },
  { key: 'category', label: 'Cat' },
  { key: 'modelProduct', label: 'Model' },
  { key: 'qty', label: 'Qty' },
  { key: 'remainingQty', label: 'Remaining Qty' },
  { key: 'unitPrice', label: 'Unit Price' },
  { key: 'currency', label: 'Currency' },
  { key: 'total', label: 'Total' },
  { key: 'paidUsd', label: 'Paid (USD)' },
  { key: 'balanceUnpaidUsd', label: 'Balance Unpaid (USD)' },
  { key: 'eta', label: 'ETA' },
  { key: 'etd', label: 'ETD' },
  { key: 'clearanceCompletionDate', label: 'Clearance Completion Date' }
];

@Component({
  selector: 'app-shipment-dashboard',
  imports: [CommonModule, FormsModule, ExcelHeaderFilter],
  templateUrl: './shipment-dashboard.html'
})
export class ShipmentDashboard implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  allRows: ShipmentDashboardRow[] = [];
  columns: ColumnDef[] = [...DEFAULT_COLUMNS];
  filters: Record<string, Set<string>> = {};
  sortColumn = 'orderCreationDate';
  sortAsc = false;

  buFilter = 'All';
  // Defaults to excluding Delivered — this stays the "still in motion"
  // work queue; fully delivered shipments are still one click away.
  statusFilter = 'Not Delivered';

  private dragIndex: number | null = null;

  constructor(private service: ShipmentDashboardService, private tablePrefs: TablePreferencesService) {}

  ngOnInit(): void {
    this.service.getAll().subscribe({
      next: (r) => { this.allRows = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });

    this.tablePrefs.getColumnOrder('shipment-dashboard').subscribe({
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

  // Every date shown on this dashboard is DD/MM/YYYY — in the cells (via
  // the template's date pipe), in each column's ▼ filter checklist (via
  // getValue below, so a filter option and the cell it matches always read
  // the same) and in the Excel export. Sorting still uses the raw value.
  private static readonly DATE_COLUMNS = new Set(['orderCreationDate', 'eta', 'etd', 'clearanceCompletionDate']);

  private fmtDate(v: string | null | undefined): string {
    return v ? formatDate(v, 'dd/MM/yyyy', 'en-US') : '';
  }

  getValue(row: any, col: string): string {
    if (ShipmentDashboard.DATE_COLUMNS.has(col)) return this.fmtDate(row[col]);
    return String(row[col] ?? '');
  }

  optionsFor(col: string): string[] {
    if (!this.filters[col]) this.filters[col] = new Set();
    const options = columnOptions(this.allRows, this.filters, col, (r, c) => this.getValue(r, c));
    if (!ShipmentDashboard.DATE_COLUMNS.has(col)) return options;
    // columnOptions sorts alphabetically, which for dd/MM/yyyy would order
    // by day first — re-sort dates chronologically (yyyy, MM, dd).
    const chrono = (s: string) => (s ? s.split('/').reverse().join('') : '');
    return [...options].sort((a, b) => chrono(a).localeCompare(chrono(b)));
  }
  onFilterChange(col: string, values: Set<string>): void { this.filters[col] = values; this.cdr.markForCheck(); }
  isColumnFiltered(col: string): boolean {
    const selected = this.filters[col];
    if (!selected || selected.size === 0) return false;
    return selected.size < this.optionsFor(col).length;
  }

  get uniqueBu(): string[] { return [...new Set(this.allRows.map((r) => r.businessUnit))].sort(); }
  get uniqueStatuses(): string[] { return [...new Set(this.allRows.map((r) => r.currentStatus))].sort(); }

  searchTerm = '';

  get rows(): ShipmentDashboardRow[] {
    let filtered = applyFilters(this.allRows, this.filters, (r, col) => this.getValue(r, col));
    if (this.buFilter !== 'All') filtered = filtered.filter((r) => r.businessUnit === this.buFilter);
    if (this.statusFilter === 'Not Delivered') filtered = filtered.filter((r) => r.currentStatus !== 'Delivered');
    else if (this.statusFilter !== 'All') filtered = filtered.filter((r) => r.currentStatus === this.statusFilter);
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      filtered = filtered.filter((r) =>
        r.blAwbNo.toLowerCase().includes(term) || r.poNumber.toLowerCase().includes(term)
      );
    }
    const dir = this.sortAsc ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = (a as any)[this.sortColumn] ?? '';
      const bv = (b as any)[this.sortColumn] ?? '';
      return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
    });
  }

  get totalUsd(): number {
    // Total is per-shipment currency, not one common unit — sum Paid/
    // Balance instead, since those are already normalized to USD.
    return this.rows.reduce((sum, r) => sum + r.total, 0);
  }
  get totalPaidUsd(): number { return this.rows.reduce((sum, r) => sum + r.paidUsd, 0); }
  get totalBalanceUsd(): number { return this.rows.reduce((sum, r) => sum + r.balanceUnpaidUsd, 0); }

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
    this.tablePrefs.saveColumnOrder('shipment-dashboard', cols.map((c) => c.key)).subscribe();
  }

  onExportClick(): void {
    // Dates exported as DD/MM/YYYY text, matching what's on screen.
    const rows = this.rows.map((r) => {
      const copy: any = { ...r };
      for (const c of ShipmentDashboard.DATE_COLUMNS) copy[c] = this.fmtDate(copy[c]);
      return copy;
    });
    exportToExcel('Shipment Dashboard', this.columns, rows);
  }
}
