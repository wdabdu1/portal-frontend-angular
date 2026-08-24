import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ExcelHeaderFilter } from '../../shared/excel-header-filter';
import { applyFilters, columnOptions } from '../../shared/table-filter.util';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { TablePreferencesService } from '../../table-preferences/table-preferences.service';
import { exportToExcel } from '../../shared/excel-export.util';
import { TruckAvailabilityRow, TruckAvailabilityService, TruckMovementRow } from '../truck-availability.service';

type SortColumn = keyof TruckAvailabilityRow;

interface ColumnDef {
  key: SortColumn;
  label: string;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'plateNo', label: 'Truck' },
  { key: 'driverName', label: 'Driver' },
  { key: 'isAvailable', label: 'Status' },
  { key: 'cityName', label: 'City' },
  { key: 'expectedAvailableDate', label: 'Available From' }
];

@Component({
  selector: 'app-truck-availability',
  imports: [CommonModule, FormsModule, ExcelHeaderFilter],
  templateUrl: './truck-availability.html'
})
export class TruckAvailability implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  allRows: TruckAvailabilityRow[] = [];
  loading = true;
  error = '';

  sortColumn: SortColumn = 'cityName';
  sortAsc = true;

  // Defaults to Available so this reads as "who can I dispatch right now" —
  // trucks still en route are one click away via the toggle.
  statusFilter: 'Available' | 'InTransit' | 'All' = 'Available';

  columns: ColumnDef[] = [...DEFAULT_COLUMNS];
  private dragFromIndex: number | null = null;

  filters: Record<string, Set<string>> = {};

  cities: LookupEntity[] = [];

  selectedTruck: TruckAvailabilityRow | null = null;
  movements: TruckMovementRow[] = [];
  loadingMovements = false;

  moveToCityId: number | null = null;
  moveDate = '';
  moveReason = '';
  moveValue: number | null = null;
  moveNotes = '';
  moving = false;
  moveError = '';

  constructor(
    private service: TruckAvailabilityService,
    private lookups: SettingsLookupService,
    private tablePrefs: TablePreferencesService
  ) {}

  ngOnInit(): void {
    this.lookups.getAll<LookupEntity>('logistics-cities').subscribe({ next: (r) => { this.cities = r; this.cdr.markForCheck(); } });

    this.tablePrefs.get('truckAvailability').subscribe({
      next: (pref) => {
        if (pref) {
          this.sortColumn = pref.sortColumn as SortColumn;
          this.sortAsc = pref.sortAsc;
        }
        this.load();
      },
      error: () => this.load()
    });

    this.tablePrefs.getColumnOrder('truckAvailability').subscribe({
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
    this.tablePrefs.saveColumnOrder('truckAvailability', cols.map((c) => c.key)).subscribe();
  }

  load(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (r) => { this.allRows = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load truck availability.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  private ensureFilterKey(key: string): void {
    if (!this.filters[key]) this.filters[key] = new Set();
  }

  getValue(row: TruckAvailabilityRow, col: string): string {
    if (col === 'isAvailable') return row.isAvailable ? 'Available' : 'In Transit';
    return String((row as any)[col] ?? '');
  }

  optionsFor(col: string): string[] {
    this.ensureFilterKey(col);
    return columnOptions(this.allRows, this.filters, col, (r, c) => this.getValue(r, c));
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

  get rows(): TruckAvailabilityRow[] {
    let filtered = applyFilters(this.allRows, this.filters, (r, col) => this.getValue(r, col));
    if (this.statusFilter === 'Available') filtered = filtered.filter((r) => r.isAvailable);
    if (this.statusFilter === 'InTransit') filtered = filtered.filter((r) => !r.isAvailable);
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
    exportToExcel('Truck Availability', this.columns, this.rows);
  }

  sortBy(column: SortColumn): void {
    if (this.sortColumn === column) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortColumn = column;
      this.sortAsc = true;
    }
    this.tablePrefs.save('truckAvailability', this.sortColumn, this.sortAsc).subscribe();
  }

  selectTruck(truck: TruckAvailabilityRow): void {
    this.selectedTruck = this.selectedTruck === truck ? null : truck;
    this.moveToCityId = null;
    this.moveDate = '';
    this.moveReason = '';
    this.moveValue = null;
    this.moveNotes = '';
    this.moveError = '';
    if (this.selectedTruck) this.loadMovements();
  }

  loadMovements(): void {
    if (!this.selectedTruck) return;
    this.loadingMovements = true;
    this.service.getMovements(this.selectedTruck.truckId).subscribe({
      next: (r) => { this.movements = r; this.loadingMovements = false; this.cdr.markForCheck(); },
      error: () => { this.loadingMovements = false; this.cdr.markForCheck(); }
    });
  }

  setStartingCity(): void {
    if (!this.selectedTruck || !this.moveToCityId) return;
    this.moving = true;
    this.moveError = '';
    this.service.setStartingCity(this.selectedTruck.truckId, this.moveToCityId).subscribe({
      next: () => { this.moving = false; this.load(); this.selectedTruck = null; },
      error: (err) => { this.moving = false; this.moveError = err?.error?.message || 'Could not set starting city.'; this.cdr.markForCheck(); }
    });
  }

  moveTruck(): void {
    if (!this.selectedTruck || !this.moveToCityId || !this.moveDate) return;
    this.moving = true;
    this.moveError = '';
    this.service.move(this.selectedTruck.truckId, {
      toCityId: this.moveToCityId, moveDate: this.moveDate,
      reason: this.moveReason || null, value: this.moveValue, notes: this.moveNotes || null
    }).subscribe({
      next: () => {
        this.moving = false;
        this.moveToCityId = null; this.moveDate = ''; this.moveReason = ''; this.moveValue = null; this.moveNotes = '';
        this.loadMovements();
        this.load();
      },
      error: (err) => { this.moving = false; this.moveError = err?.error?.message || 'Could not move truck.'; this.cdr.markForCheck(); }
    });
  }
}
