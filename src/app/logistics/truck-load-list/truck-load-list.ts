import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExcelHeaderFilter } from '../../shared/excel-header-filter';
import { applyFilters, columnOptions } from '../../shared/table-filter.util';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { TablePreferencesService } from '../../table-preferences/table-preferences.service';
import { exportToExcel } from '../../shared/excel-export.util';
import { TruckLoadItemRow, TruckLoadService } from '../truck-load.service';

type SortColumn = keyof TruckLoadItemRow;

interface ColumnDef {
  key: SortColumn;
  label: string;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'plateNo', label: 'Truck' },
  { key: 'driverName', label: 'Driver' },
  { key: 'loadDate', label: 'Load Date' },
  { key: 'warehouseName', label: 'Warehouse' },
  { key: 'city', label: 'City' },
  { key: 'expectedDeliveryDate', label: 'Expected Delivery' },
  { key: 'modelProduct', label: 'Product/Model' },
  { key: 'unit', label: 'Unit' },
  { key: 'qty', label: 'Qty' },
  { key: 'inHousePrice', label: 'In-House Price' },
  { key: 'parallelMarketPrice', label: 'Parallel Market Price' }
];

@Component({
  selector: 'app-truck-load-list',
  imports: [CommonModule, FormsModule, ExcelHeaderFilter],
  templateUrl: './truck-load-list.html'
})
export class TruckLoadList implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  allItems: TruckLoadItemRow[] = [];
  loading = true;
  error = '';

  sortColumn: SortColumn = 'loadDate';
  sortAsc = false;

  columns: ColumnDef[] = [...DEFAULT_COLUMNS];
  private dragFromIndex: number | null = null;

  filters: Record<string, Set<string>> = {};

  trucks: LookupEntity[] = [];
  drivers: LookupEntity[] = [];

  showNewForm = false;
  newTruckId: number | null = null;
  newDriverId: number | null = null;
  newLoadDate = '';
  newNotes = '';
  creating = false;

  constructor(
    private service: TruckLoadService,
    private lookups: SettingsLookupService,
    private tablePrefs: TablePreferencesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.lookups.getAll<LookupEntity>('trucks').subscribe({ next: (r) => { this.trucks = r.filter((t) => t['isActive']); this.cdr.markForCheck(); } });
    this.lookups.getAll<LookupEntity>('drivers').subscribe({ next: (r) => { this.drivers = r; this.cdr.markForCheck(); } });

    this.tablePrefs.get('truckLoads').subscribe({
      next: (pref) => {
        if (pref) {
          this.sortColumn = pref.sortColumn as SortColumn;
          this.sortAsc = pref.sortAsc;
        }
        this.load();
      },
      error: () => this.load()
    });

    this.tablePrefs.getColumnOrder('truckLoads').subscribe({
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
    this.tablePrefs.saveColumnOrder('truckLoads', cols.map((c) => c.key)).subscribe();
  }

  load(): void {
    this.loading = true;
    this.service.getItems().subscribe({
      next: (r) => { this.allItems = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load truck load items.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  private ensureFilterKey(key: string): void {
    if (!this.filters[key]) this.filters[key] = new Set();
  }

  private getValue(row: TruckLoadItemRow, col: string): string {
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

  get items(): TruckLoadItemRow[] {
    const filtered = applyFilters(this.allItems, this.filters, (r, col) => this.getValue(r, col));
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
    exportToExcel('Truck Loads', this.columns, this.items);
  }

  sortBy(column: SortColumn): void {
    if (this.sortColumn === column) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortColumn = column;
      this.sortAsc = true;
    }
    this.tablePrefs.save('truckLoads', this.sortColumn, this.sortAsc).subscribe();
  }

  toggleNewForm(): void {
    this.showNewForm = !this.showNewForm;
  }

  onTruckChange(): void {
    const truck = this.trucks.find((t) => t.id === this.newTruckId);
    this.newDriverId = (truck?.['driverId'] as number) ?? null;
  }

  createLoad(): void {
    if (!this.newTruckId || !this.newLoadDate) return;
    this.creating = true;
    this.service.create({
      truckId: this.newTruckId, driverId: this.newDriverId, loadDate: this.newLoadDate, notes: this.newNotes || null
    }).subscribe({
      next: (r) => {
        this.creating = false;
        this.router.navigate(['/logistics/truck-loads', r.id]);
      },
      error: () => { this.creating = false; this.error = 'Could not create truck load.'; this.cdr.markForCheck(); }
    });
  }

  openTruckLoad(truckLoadId: number): void {
    this.router.navigate(['/logistics/truck-loads', truckLoadId]);
  }
}
