import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { exportToExcel } from '../../shared/excel-export.util';
import { ExcelHeaderFilter } from '../../shared/excel-header-filter';
import { applyFilters, columnOptions } from '../../shared/table-filter.util';
import { TablePreferencesService } from '../../table-preferences/table-preferences.service';
import { PoDashboardRow, PoDashboardService } from '../po-dashboard.service';

interface ColumnDef { key: string; label: string; }

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'poNumber', label: 'PO Number' },
  { key: 'businessUnit', label: 'BU' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'consignee', label: 'Consignee' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Created' },
  { key: 'orderValueUsd', label: 'Order Value (USD)' },
  { key: 'shipmentCount', label: 'BLs' }
];

@Component({
  selector: 'app-po-dashboard',
  imports: [CommonModule, FormsModule, ExcelHeaderFilter],
  templateUrl: './po-dashboard.html'
})
export class PoDashboard implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  allRows: (PoDashboardRow & { shipmentCount: number })[] = [];
  columns: ColumnDef[] = [...DEFAULT_COLUMNS];
  filters: Record<string, Set<string>> = {};
  sortColumn = 'createdAt';
  sortAsc = false;
  expandedPoId: number | null = null;

  buFilter = 'All';
  supplierFilter = 'All';

  private dragIndex: number | null = null;

  constructor(private service: PoDashboardService, private tablePrefs: TablePreferencesService) {}

  ngOnInit(): void {
    this.service.getAll().subscribe({
      next: (r) => {
        this.allRows = r.map((row) => ({ ...row, shipmentCount: new Set(row.shipments.map((s) => s.blAwbNo)).size }));
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });

    this.tablePrefs.getColumnOrder('po-dashboard').subscribe({
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
  get uniqueSuppliers(): string[] { return [...new Set(this.allRows.map((r) => r.supplier))].sort(); }

  get rows(): (PoDashboardRow & { shipmentCount: number })[] {
    let filtered = applyFilters(this.allRows, this.filters, (r, col) => this.getValue(r, col));
    if (this.buFilter !== 'All') filtered = filtered.filter((r) => r.businessUnit === this.buFilter);
    if (this.supplierFilter !== 'All') filtered = filtered.filter((r) => r.supplier === this.supplierFilter);
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

  toggle(poId: number): void {
    this.expandedPoId = this.expandedPoId === poId ? null : poId;
  }

  onDragStart(i: number): void { this.dragIndex = i; }
  onDrop(i: number): void {
    if (this.dragIndex === null || this.dragIndex === i) return;
    const cols = [...this.columns];
    const [moved] = cols.splice(this.dragIndex, 1);
    cols.splice(i, 0, moved);
    this.columns = cols;
    this.dragIndex = null;
    this.tablePrefs.saveColumnOrder('po-dashboard', cols.map((c) => c.key)).subscribe();
  }

  onExportClick(): void {
    interface FlatRow {
      poNumber: string; businessUnit: string; supplier: string; consignee: string; status: string;
      createdAt: string; orderValueUsd: number; blAwbNo: string; category: string; modelProduct: string;
      qty: number | null; unitPrice: number | null; currency: string; total: number | null;
      eta: string | null; etd: string | null; expectedClearanceCompletion: string | null;
    }

    const flattened: FlatRow[] = this.rows.flatMap((po): FlatRow[] =>
      po.shipments.length > 0
        ? po.shipments.map((s): FlatRow => ({
            poNumber: po.poNumber, businessUnit: po.businessUnit, supplier: po.supplier, consignee: po.consignee,
            status: po.status, createdAt: po.createdAt, orderValueUsd: po.orderValueUsd,
            blAwbNo: s.blAwbNo, category: s.category, modelProduct: s.modelProduct, qty: s.qty,
            unitPrice: s.unitPrice, currency: s.currency, total: s.total, eta: s.eta, etd: s.etd,
            expectedClearanceCompletion: s.expectedClearanceCompletion
          }))
        : [{
            poNumber: po.poNumber, businessUnit: po.businessUnit, supplier: po.supplier, consignee: po.consignee,
            status: po.status, createdAt: po.createdAt, orderValueUsd: po.orderValueUsd,
            blAwbNo: '', category: '', modelProduct: '', qty: null, unitPrice: null, currency: '', total: null,
            eta: null, etd: null, expectedClearanceCompletion: null
          }]
    );
    exportToExcel('PO Dashboard', [
      { key: 'poNumber', label: 'PO Number' },
      { key: 'businessUnit', label: 'BU' },
      { key: 'supplier', label: 'Supplier' },
      { key: 'consignee', label: 'Consignee' },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Created' },
      { key: 'orderValueUsd', label: 'Order Value (USD)' },
      { key: 'blAwbNo', label: 'BL No.' },
      { key: 'category', label: 'Cat' },
      { key: 'modelProduct', label: 'Model' },
      { key: 'qty', label: 'Qty' },
      { key: 'unitPrice', label: 'Unit Price' },
      { key: 'currency', label: 'Currency' },
      { key: 'total', label: 'Total' },
      { key: 'eta', label: 'ETA' },
      { key: 'etd', label: 'ETD' },
      { key: 'expectedClearanceCompletion', label: 'Expected Clearance Completion' }
    ], flattened);
  }
}
