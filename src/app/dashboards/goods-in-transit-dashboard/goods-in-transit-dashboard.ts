import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { exportToExcel } from '../../shared/excel-export.util';
import { ExcelHeaderFilter } from '../../shared/excel-header-filter';
import { applyFilters, columnOptions } from '../../shared/table-filter.util';
import { TablePreferencesService } from '../../table-preferences/table-preferences.service';
import { GoodsInTransitDashboardService, GoodsInTransitRow } from '../goods-in-transit-dashboard.service';

interface ColumnDef { key: string; label: string; }

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'businessUnit', label: 'BU' },
  { key: 'category', label: 'Cat' },
  { key: 'modelProduct', label: 'Product/Model' },
  { key: 'qty', label: 'Qty' },
  { key: 'pickFrom', label: 'Pick From' },
  { key: 'pickupDate', label: 'Pickup Date' },
  { key: 'dropOffTo', label: 'Drop off To' },
  { key: 'dropOffTargetDate', label: 'Drop off Target Date' },
  { key: 'dropOffActualDate', label: 'Drop off Actual Date' },
  { key: 'truckNo', label: 'Truck No.' },
  { key: 'driverName', label: 'Driver Name' },
  { key: 'status', label: 'Status' }
];

@Component({
  selector: 'app-goods-in-transit-dashboard',
  imports: [CommonModule, FormsModule, ExcelHeaderFilter],
  templateUrl: './goods-in-transit-dashboard.html'
})
export class GoodsInTransitDashboard implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  allRows: (GoodsInTransitRow & { dropOffTo: string })[] = [];
  columns: ColumnDef[] = [...DEFAULT_COLUMNS];
  filters: Record<string, Set<string>> = {};
  sortColumn = 'pickupDate';
  sortAsc = false;

  buFilter = 'All';
  // Defaults to hiding Delivered — this stays the active "still moving"
  // work queue; delivered loads are still one click away.
  statusFilter = 'On the Way';

  private dragIndex: number | null = null;

  constructor(private service: GoodsInTransitDashboardService, private tablePrefs: TablePreferencesService) {}

  ngOnInit(): void {
    this.service.getAll().subscribe({
      next: (r) => {
        this.allRows = r.map((row) => ({ ...row, dropOffTo: `${row.dropOffWarehouse} (${row.dropOffCity})` }));
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });

    this.tablePrefs.getColumnOrder('goods-in-transit-dashboard').subscribe({
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

  get rows(): (GoodsInTransitRow & { dropOffTo: string })[] {
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

  isLate(row: GoodsInTransitRow): boolean {
    if (row.status === 'Delivered' || !row.dropOffTargetDate) return false;
    return new Date(row.dropOffTargetDate) < new Date(new Date().toDateString());
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
    this.tablePrefs.saveColumnOrder('goods-in-transit-dashboard', cols.map((c) => c.key)).subscribe();
  }

  onExportClick(): void {
    exportToExcel('Goods in Transit', this.columns, this.rows);
  }
}
