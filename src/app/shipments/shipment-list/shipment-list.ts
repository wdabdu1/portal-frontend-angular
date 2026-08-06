import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ExcelHeaderFilter } from '../../shared/excel-header-filter';
import { applyFilters, columnOptions } from '../../shared/table-filter.util';
import { TablePreferencesService } from '../../table-preferences/table-preferences.service';
import { ShipmentSummary, ShipmentsService } from '../shipments.service';

type SortColumn = keyof ShipmentSummary;

interface ColumnDef {
  key: SortColumn;
  label: string;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'businessUnit', label: 'BU' },
  { key: 'blAwbNo', label: 'BL/AWB No.' },
  { key: 'poNumber', label: 'PO Number' },
  { key: 'shippingLine', label: 'Shipping Line' },
  { key: 'lineItemCount', label: 'Line Items' },
  { key: 'eta', label: 'ETA' },
  { key: 'status', label: 'Status' }
];

@Component({
  selector: 'app-shipment-list',
  imports: [CommonModule, FormsModule, RouterLink, ExcelHeaderFilter],
  templateUrl: './shipment-list.html'
})
export class ShipmentList implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  allShipments: ShipmentSummary[] = [];
  loading = true;
  error = '';

  sortColumn: SortColumn = 'blAwbNo';
  sortAsc = true;

  columns: ColumnDef[] = [...DEFAULT_COLUMNS];
  private dragFromIndex: number | null = null;

  filters: Record<string, Set<string>> = {};

  constructor(private shipmentsService: ShipmentsService, private router: Router, private tablePrefs: TablePreferencesService) {}

  viewDetails(id: number): void {
    this.router.navigate(['/shipments', id]);
  }

  ngOnInit(): void {
    this.tablePrefs.get('shipments').subscribe({
      next: (pref) => {
        if (pref) {
          this.sortColumn = pref.sortColumn as SortColumn;
          this.sortAsc = pref.sortAsc;
        }
        this.load();
      },
      error: () => this.load()
    });

    this.tablePrefs.getColumnOrder('shipments').subscribe({
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
    this.tablePrefs.saveColumnOrder('shipments', cols.map((c) => c.key)).subscribe();
  }

  load(): void {
    this.shipmentsService.getAll().subscribe({
      next: (shipments) => {
        this.allShipments = shipments;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Could not load shipments.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private ensureFilterKey(key: string): void {
    if (!this.filters[key]) this.filters[key] = new Set();
  }

  private getValue(row: ShipmentSummary, col: string): string {
    return String((row as any)[col] ?? '');
  }

  optionsFor(col: string): string[] {
    this.ensureFilterKey(col);
    return columnOptions(this.allShipments, this.filters, col, (r, c) => this.getValue(r, c));
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

  get shipments(): ShipmentSummary[] {
    const filtered = applyFilters(this.allShipments, this.filters, (r, col) => this.getValue(r, col));

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
    this.tablePrefs.save('shipments', this.sortColumn, this.sortAsc).subscribe();
  }
}
