import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ExcelHeaderFilter } from '../../shared/excel-header-filter';
import { applyFilters, columnOptions } from '../../shared/table-filter.util';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { TablePreferencesService } from '../../table-preferences/table-preferences.service';
import { exportToExcel } from '../../shared/excel-export.util';
import { AllocationResponse, LogisticsItemRow, LogisticsService } from '../logistics.service';

type SortColumn = keyof LogisticsItemRow;

interface ColumnDef {
  key: SortColumn;
  label: string;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'businessUnit', label: 'BU' },
  { key: 'consignee', label: 'Consignee' },
  { key: 'category', label: 'Cat' },
  { key: 'modelProduct', label: 'Product/Model' },
  { key: 'blAwbNo', label: 'BL No.' },
  { key: 'plannedCompletionDate', label: 'Planned Completion' },
  { key: 'actualCompletionDate', label: 'Actual Completion' },
  { key: 'qty', label: 'Qty' },
  { key: 'unit', label: 'Units' },
  { key: 'clearanceRoute', label: 'Clearance Route' },
  { key: 'fzDestination', label: 'FZ Destination' },
  { key: 'allocatedQty', label: 'Allocated' },
  { key: 'remainingQty', label: 'Remaining' }
];

@Component({
  selector: 'app-logistics-list',
  imports: [CommonModule, FormsModule, RouterLink, ExcelHeaderFilter],
  templateUrl: './logistics-list.html'
})
export class LogisticsList implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  allItems: LogisticsItemRow[] = [];
  loading = true;
  error = '';

  sortColumn: SortColumn = 'plannedCompletionDate';
  sortAsc = true;

  // Defaults to Pending so this stays the "still needs allocating" queue —
  // fully allocated items are still one click away via the toggle.
  statusFilter: 'Pending' | 'Partial' | 'Completed' | 'All' = 'Pending';


  columns: ColumnDef[] = [...DEFAULT_COLUMNS];
  private dragFromIndex: number | null = null;

  filters: Record<string, Set<string>> = {};

  warehouses: LookupEntity[] = [];
  selectedItem: LogisticsItemRow | null = null;
  allocations: AllocationResponse[] = [];
  loadingAllocations = false;

  newWarehouseId: number | null = null;
  newQty: number | null = null;
  newContactName = '';
  newContactPhone = '';
  allocating = false;
  allocateError = '';

  constructor(
    private service: LogisticsService,
    private lookups: SettingsLookupService,
    private tablePrefs: TablePreferencesService
  ) {}

  ngOnInit(): void {
    this.lookups.getAll<LookupEntity>('warehouses').subscribe({
      next: (r) => { this.warehouses = r; this.cdr.markForCheck(); }
    });
    
    this.tablePrefs.get('logistics').subscribe({
      next: (pref) => {
        if (pref) {
          this.sortColumn = pref.sortColumn as SortColumn;
          this.sortAsc = pref.sortAsc;
        }
        this.load();
      },
      error: () => this.load()
    });

    this.tablePrefs.getColumnOrder('logistics').subscribe({
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
    this.tablePrefs.saveColumnOrder('logistics', cols.map((c) => c.key)).subscribe();
  }

  load(): void {
    this.loading = true;
    this.service.getItems().subscribe({
      next: (r) => { this.allItems = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load items.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  private ensureFilterKey(key: string): void {
    if (!this.filters[key]) this.filters[key] = new Set();
  }

  private getValue(row: LogisticsItemRow, col: string): string {
    return String((row as any)[col] ?? '');
  }

  optionsFor(col: string): string[] {
    this.ensureFilterKey(col);
    return columnOptions(this.allItems, this.filters, col, (r, c) => this.getValue(r, c));
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


  get items(): LogisticsItemRow[] {
    let filtered = applyFilters(this.allItems, this.filters, (r, col) => this.getValue(r, col));
    if (this.statusFilter === 'Pending') filtered = filtered.filter((i) => i.allocatedQty === 0);
    if (this.statusFilter === 'Partial') filtered = filtered.filter((i) => i.allocatedQty > 0 && i.remainingQty > 0);
    if (this.statusFilter === 'Completed') filtered = filtered.filter((i) => i.remainingQty <= 0);
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
    exportToExcel('Logistics', this.columns, this.items);
  }

  sortBy(column: SortColumn): void {
    if (this.sortColumn === column) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortColumn = column;
      this.sortAsc = true;
    }
    this.tablePrefs.save('logistics', this.sortColumn, this.sortAsc).subscribe();
  }

  selectItem(item: LogisticsItemRow): void {
    this.selectedItem = this.selectedItem === item ? null : item;
    this.newWarehouseId = null;
    this.newQty = null;
    this.newContactName = '';
    this.newContactPhone = '';
    this.allocateError = '';
    if (this.selectedItem) this.loadAllocations();
  }

  loadAllocations(): void {
    if (!this.selectedItem) return;
    this.loadingAllocations = true;
    this.service.getAllocations(this.selectedItem.sourceType, this.selectedItem.sourceLineItemId).subscribe({
      next: (r) => { this.allocations = r; this.loadingAllocations = false; this.cdr.markForCheck(); },
      error: () => { this.loadingAllocations = false; this.cdr.markForCheck(); }
    });
  }

  onWarehouseChange(): void {
    const wh = this.warehouses.find((w) => w.id === this.newWarehouseId);
    this.newContactName = (wh?.['contactName'] as string) ?? '';
    this.newContactPhone = (wh?.['contactPhone'] as string) ?? '';
  }

  addAllocation(): void {
    if (!this.selectedItem || !this.newWarehouseId || !this.newQty) return;
    this.allocating = true;
    this.allocateError = '';
    this.service.allocate({
      sourceType: this.selectedItem.sourceType,
      sourceLineItemId: this.selectedItem.sourceLineItemId,
      warehouseId: this.newWarehouseId,
      qty: this.newQty,
      contactName: this.newContactName || null,
      contactPhone: this.newContactPhone || null
    }).subscribe({
      next: () => {
        this.allocating = false;
        this.newWarehouseId = null;
        this.newQty = null;
        this.newContactName = '';
        this.newContactPhone = '';
        this.loadAllocations();
        this.load();
      },
      error: (err) => {
        this.allocating = false;
        this.allocateError = err?.error?.message || 'Could not save allocation.';
        this.cdr.markForCheck();
      }
    });
  }

  removeAllocation(id: number): void {
    this.service.deleteAllocation(id).subscribe({
      next: () => { this.loadAllocations(); this.load(); }
    });
  }
}
