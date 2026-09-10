import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ExcelHeaderFilter } from '../../shared/excel-header-filter';
import { applyFilters, columnOptions } from '../../shared/table-filter.util';
import { TablePreferencesService } from '../../table-preferences/table-preferences.service';
import { exportToExcel } from '../../shared/excel-export.util';
import { TpOrderSummary, TransferPricingService } from '../transfer-pricing.service';

// Row shape actually rendered — adds the display-only fields computed once
// per load (the chain string with the consignee folded in, and a plain
// text status label) so sorting/filtering/export can treat them like any
// other column instead of special-casing them.
interface TpOrderRow extends TpOrderSummary {
  categorisations: string;
  statusLabel: string;
}

type SortColumn = keyof TpOrderRow;

interface ColumnDef {
  key: SortColumn;
  label: string;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'createdAt', label: 'Created' },
  { key: 'businessUnit', label: 'BU' },
  { key: 'blAwbNo', label: 'BL/AWB No.' },
  { key: 'poNumber', label: 'PO Number' },
  { key: 'supplierName', label: 'Supplier' },
  { key: 'supplierValueUsd', label: 'TTL Value (USD)' },
  { key: 'eta', label: 'ETA' },
  { key: 'categorisations', label: 'Categorisations' },
  { key: 'statusLabel', label: 'Status' }
];

function buildRow(o: TpOrderSummary): TpOrderRow {
  const chain = [...o.routeCompanyNames, 'Onshore'];
  if (o.consigneeName) chain.push(o.consigneeName);
  return {
    ...o,
    categorisations: chain.join(' - '),
    statusLabel: o.isConfirmed ? 'Confirmed' : 'Pending'
  };
}

@Component({
  selector: 'app-transfer-pricing-list',
  imports: [CommonModule, FormsModule, RouterLink, ExcelHeaderFilter],
  templateUrl: './transfer-pricing-list.html'
})
export class TransferPricingList implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  allOrders: TpOrderRow[] = [];
  loading = true;
  error = '';

  // Defaults to Pending so Corp Finance lands on their actual work queue —
  // Confirmed orders are still one click away via the toggle.
  statusFilter: 'Pending' | 'Confirmed' | 'All' = 'Pending';
  searchText = '';

  sortColumn: SortColumn = 'createdAt';
  sortAsc = false;

  columns: ColumnDef[] = [...DEFAULT_COLUMNS];
  private dragFromIndex: number | null = null;

  filters: Record<string, Set<string>> = {};

  constructor(
    private service: TransferPricingService,
    private router: Router,
    private tablePrefs: TablePreferencesService
  ) {}

  ngOnInit(): void {
    this.tablePrefs.get('transferPricingOrders').subscribe({
      next: (pref) => {
        if (pref) {
          this.sortColumn = pref.sortColumn as SortColumn;
          this.sortAsc = pref.sortAsc;
        }
        this.load();
      },
      error: () => this.load()
    });

    this.tablePrefs.getColumnOrder('transferPricingOrders').subscribe({
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

  onDragStart(index: number): void { this.dragFromIndex = index; }
  onDragOver(event: DragEvent): void { event.preventDefault(); }
  onDrop(index: number): void {
    if (this.dragFromIndex === null || this.dragFromIndex === index) return;
    const cols = [...this.columns];
    const [moved] = cols.splice(this.dragFromIndex, 1);
    cols.splice(index, 0, moved);
    this.columns = cols;
    this.dragFromIndex = null;
    this.tablePrefs.saveColumnOrder('transferPricingOrders', cols.map((c) => c.key)).subscribe();
  }

  load(): void {
    this.loading = true;
    this.service.getOrders().subscribe({
      next: (r) => { this.allOrders = r.map(buildRow); this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load orders.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  private ensureFilterKey(key: string): void {
    if (!this.filters[key]) this.filters[key] = new Set();
  }

  private getValue(row: TpOrderRow, col: string): string {
    return String((row as any)[col] ?? '');
  }

  optionsFor(col: string): string[] {
    this.ensureFilterKey(col);
    return columnOptions(this.allOrders, this.filters, col, (r, c) => this.getValue(r, c));
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

  get orders(): TpOrderRow[] {
    let filtered = applyFilters(this.allOrders, this.filters, (r, col) => this.getValue(r, col));
    if (this.statusFilter === 'Pending') filtered = filtered.filter((o) => !o.isConfirmed);
    if (this.statusFilter === 'Confirmed') filtered = filtered.filter((o) => o.isConfirmed);

    const q = this.searchText.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((o) =>
        o.blAwbNo.toLowerCase().includes(q) || o.poNumber.toLowerCase().includes(q) || o.businessUnit.toLowerCase().includes(q)
      );
    }

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
    this.tablePrefs.save('transferPricingOrders', this.sortColumn, this.sortAsc).subscribe();
  }

  onExportClick(): void {
    exportToExcel('P Simulator Orders', this.columns, this.orders);
  }

  openOrder(shipmentId: number): void {
    this.router.navigate(['/transfer-pricing', shipmentId]);
  }
}
