import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { exportToExcel } from '../../shared/excel-export.util';
import { ExcelHeaderFilter } from '../../shared/excel-header-filter';
import { applyFilters, columnOptions } from '../../shared/table-filter.util';
import { TablePreferencesService } from '../../table-preferences/table-preferences.service';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { SupplierDelayLine, SupplierDelayService } from '../supplier-delay.service';

interface ColumnDef { key: string; label: string; }

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'urgencyLevel', label: 'Urgency' },
  { key: 'poNumber', label: 'PO Number' },
  { key: 'businessUnit', label: 'BU' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'category', label: 'Cat' },
  { key: 'modelProduct', label: 'Model' },
  { key: 'orderedQty', label: 'Ordered Qty' },
  { key: 'dispatchedQty', label: 'Dispatched Qty' },
  { key: 'pendingQty', label: 'Pending Qty' },
  { key: 'latestShippingDate', label: 'Latest Shipping Date' },
  { key: 'daysRemaining', label: 'Days Remaining' }
];

@Component({
  selector: 'app-supplier-delay',
  imports: [CommonModule, FormsModule, ExcelHeaderFilter],
  templateUrl: './supplier-delay.html'
})
export class SupplierDelay implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  allRows: SupplierDelayLine[] = [];
  columns: ColumnDef[] = [...DEFAULT_COLUMNS];
  filters: Record<string, Set<string>> = {};
  sortColumn = 'daysRemaining';
  sortAsc = true;

  businessUnits: LookupEntity[] = [];
  suppliers: LookupEntity[] = [];
  businessUnitId: number | null = null;
  supplierId: number | null = null;

  private dragIndex: number | null = null;

  constructor(private service: SupplierDelayService, private tablePrefs: TablePreferencesService, private lookups: SettingsLookupService) {}

  ngOnInit(): void {
    this.lookups.getAll<LookupEntity>('business-units').subscribe({ next: (r) => { this.businessUnits = r; this.cdr.markForCheck(); } });
    this.lookups.getAll<LookupEntity>('business-partners/suppliers').subscribe({ next: (r) => { this.suppliers = r; this.cdr.markForCheck(); } });
    this.load();

    this.tablePrefs.getColumnOrder('supplier-delay').subscribe({
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

  load(): void {
    this.loading = true;
    this.service.get(this.businessUnitId ?? undefined, this.supplierId ?? undefined).subscribe({
      next: (r) => { this.allRows = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  onFilterChange(): void {
    this.load();
  }

  getValue(row: any, col: string): string {
    return String(row[col] ?? '');
  }

  optionsFor(col: string): string[] {
    if (!this.filters[col]) this.filters[col] = new Set();
    return columnOptions(this.allRows, this.filters, col, (r, c) => this.getValue(r, c));
  }
  onColumnFilterChange(col: string, values: Set<string>): void { this.filters[col] = values; this.cdr.markForCheck(); }
  isColumnFiltered(col: string): boolean {
    const selected = this.filters[col];
    if (!selected || selected.size === 0) return false;
    return selected.size < this.optionsFor(col).length;
  }

  get rows(): SupplierDelayLine[] {
    const filtered = applyFilters(this.allRows, this.filters, (r, col) => this.getValue(r, col));
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
    this.tablePrefs.saveColumnOrder('supplier-delay', cols.map((c) => c.key)).subscribe();
  }

  onExportClick(): void {
    exportToExcel('Supplier Delay Watch', this.columns, this.rows);
  }
}
