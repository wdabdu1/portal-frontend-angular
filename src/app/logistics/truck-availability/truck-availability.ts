import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ExcelHeaderFilter } from '../../shared/excel-header-filter';
import { applyFilters, columnOptions } from '../../shared/table-filter.util';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { TablePreferencesService } from '../../table-preferences/table-preferences.service';
import { exportToExcel } from '../../shared/excel-export.util';
import { TruckAvailabilityRow, TruckAvailabilityService, TruckMovementRow } from '../truck-availability.service';
import { TruckLoadService } from '../truck-load.service';

type SortColumn = keyof TruckAvailabilityRow;

interface ColumnDef {
  key: SortColumn;
  label: string;
}

// Two independent tables instead of one table + a dropdown filter, so both
// "who's free right now" and "who's en route" are visible simultaneously.
// "Status" is dropped as a column on both — which table a row is in already
// says that.
const DEFAULT_AVAILABLE_COLUMNS: ColumnDef[] = [
  { key: 'plateNo', label: 'Truck' },
  { key: 'driverName', label: 'Driver' },
  { key: 'cityName', label: 'City' }
];

const DEFAULT_IN_TRANSIT_COLUMNS: ColumnDef[] = [
  { key: 'plateNo', label: 'Truck' },
  { key: 'driverName', label: 'Driver' },
  { key: 'cityName', label: 'Heading To' },
  { key: 'expectedAvailableDate', label: 'Available From' }
];

const AVAILABLE_PREF_KEY = 'truckAvailabilityAvailable';
const IN_TRANSIT_PREF_KEY = 'truckAvailabilityInTransit';

@Component({
  selector: 'app-truck-availability',
  imports: [CommonModule, FormsModule, ExcelHeaderFilter],
  templateUrl: './truck-availability.html'
})
export class TruckAvailability implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  error = '';

  // Raw split of the last load — source of truth for each table's filter
  // option lists and for recomputing rows after a sort/filter change.
  private availableItems: TruckAvailabilityRow[] = [];
  private inTransitItems: TruckAvailabilityRow[] = [];

  // Computed once per load/sort/filter and stored as plain properties, not
  // live getters — a live getter here previously handed *ngFor a brand-new
  // array of brand-new objects on every change-detection cycle, forcing a
  // full DOM rebuild on every keystroke/click and hanging the page. Same
  // fix as Truck Allocations' `groups`.
  availableRows: TruckAvailabilityRow[] = [];
  inTransitRows: TruckAvailabilityRow[] = [];

  availableColumns: ColumnDef[] = [...DEFAULT_AVAILABLE_COLUMNS];
  inTransitColumns: ColumnDef[] = [...DEFAULT_IN_TRANSIT_COLUMNS];
  private dragFromIndexAvailable: number | null = null;
  private dragFromIndexInTransit: number | null = null;

  sortAvailableColumn: SortColumn = 'plateNo';
  sortAvailableAsc = true;
  sortInTransitColumn: SortColumn = 'expectedAvailableDate';
  sortInTransitAsc = true;

  filtersAvailable: Record<string, Set<string>> = {};
  filtersInTransit: Record<string, Set<string>> = {};

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

  // Editing the active drop's dates for an in-transit truck — separate
  // from the manual move fields above, since these two dates are a
  // different action (updating the planned/actual leg of an existing
  // truck load, not logging an ad-hoc move).
  expectedDeliveryDraft = '';
  actualDropOffDraft = '';
  savingDropDates = false;
  dropDatesError = '';

  constructor(
    private service: TruckAvailabilityService,
    private truckLoadService: TruckLoadService,
    private lookups: SettingsLookupService,
    private tablePrefs: TablePreferencesService
  ) {}

  ngOnInit(): void {
    this.lookups.getAll<LookupEntity>('logistics-cities').subscribe({ next: (r) => { this.cities = r; this.cdr.markForCheck(); } });

    this.tablePrefs.get(AVAILABLE_PREF_KEY).subscribe({
      next: (pref) => {
        if (pref) {
          this.sortAvailableColumn = pref.sortColumn as SortColumn;
          this.sortAvailableAsc = pref.sortAsc;
        }
        this.load();
      },
      error: () => this.load()
    });

    this.tablePrefs.get(IN_TRANSIT_PREF_KEY).subscribe({
      next: (pref) => {
        if (pref) {
          this.sortInTransitColumn = pref.sortColumn as SortColumn;
          this.sortInTransitAsc = pref.sortAsc;
        }
      }
    });

    this.tablePrefs.getColumnOrder(AVAILABLE_PREF_KEY).subscribe({
      next: (order) => { if (order && order.length > 0) this.applyColumnOrder(order, DEFAULT_AVAILABLE_COLUMNS, (c) => (this.availableColumns = c)); }
    });

    this.tablePrefs.getColumnOrder(IN_TRANSIT_PREF_KEY).subscribe({
      next: (order) => { if (order && order.length > 0) this.applyColumnOrder(order, DEFAULT_IN_TRANSIT_COLUMNS, (c) => (this.inTransitColumns = c)); }
    });
  }

  private applyColumnOrder(savedOrder: string[], defaults: ColumnDef[], assign: (cols: ColumnDef[]) => void): void {
    const byKey = new Map(defaults.map((c) => [c.key, c]));
    const ordered: ColumnDef[] = [];
    for (const key of savedOrder) {
      const col = byKey.get(key as SortColumn);
      if (col) { ordered.push(col); byKey.delete(key as SortColumn); }
    }
    ordered.push(...byKey.values());
    assign(ordered);
    this.cdr.markForCheck();
  }

  // --- Available table ---

  onAvailableDragStart(index: number): void { this.dragFromIndexAvailable = index; }
  onAvailableDragOver(event: DragEvent): void { event.preventDefault(); }
  onAvailableDrop(index: number): void {
    if (this.dragFromIndexAvailable === null || this.dragFromIndexAvailable === index) return;
    const cols = [...this.availableColumns];
    const [moved] = cols.splice(this.dragFromIndexAvailable, 1);
    cols.splice(index, 0, moved);
    this.availableColumns = cols;
    this.dragFromIndexAvailable = null;
    this.tablePrefs.saveColumnOrder(AVAILABLE_PREF_KEY, cols.map((c) => c.key)).subscribe();
  }

  availableOptionsFor(col: string): string[] {
    this.ensureFilterKey(this.filtersAvailable, col);
    return columnOptions(this.availableItems, this.filtersAvailable, col, (r, c) => this.getValue(r, c));
  }

  onAvailableFilterChange(col: string, values: Set<string>): void {
    this.filtersAvailable[col] = values;
    this.recomputeAvailable();
    this.cdr.markForCheck();
  }

  isAvailableColumnFiltered(col: string): boolean {
    const selected = this.filtersAvailable[col];
    if (!selected || selected.size === 0) return false;
    return selected.size < this.availableOptionsFor(col).length;
  }

  sortAvailableBy(column: SortColumn): void {
    if (this.sortAvailableColumn === column) {
      this.sortAvailableAsc = !this.sortAvailableAsc;
    } else {
      this.sortAvailableColumn = column;
      this.sortAvailableAsc = true;
    }
    this.recomputeAvailable();
    this.tablePrefs.save(AVAILABLE_PREF_KEY, this.sortAvailableColumn, this.sortAvailableAsc).subscribe();
  }

  onExportAvailableClick(): void {
    exportToExcel('Truck Availability - Available', this.availableColumns, this.availableRows);
  }

  private recomputeAvailable(): void {
    const filtered = applyFilters(this.availableItems, this.filtersAvailable, (r, c) => this.getValue(r, c));
    this.availableRows = this.sortRows(filtered, this.sortAvailableColumn, this.sortAvailableAsc);
  }

  // --- In Transit table ---

  onInTransitDragStart(index: number): void { this.dragFromIndexInTransit = index; }
  onInTransitDragOver(event: DragEvent): void { event.preventDefault(); }
  onInTransitDrop(index: number): void {
    if (this.dragFromIndexInTransit === null || this.dragFromIndexInTransit === index) return;
    const cols = [...this.inTransitColumns];
    const [moved] = cols.splice(this.dragFromIndexInTransit, 1);
    cols.splice(index, 0, moved);
    this.inTransitColumns = cols;
    this.dragFromIndexInTransit = null;
    this.tablePrefs.saveColumnOrder(IN_TRANSIT_PREF_KEY, cols.map((c) => c.key)).subscribe();
  }

  inTransitOptionsFor(col: string): string[] {
    this.ensureFilterKey(this.filtersInTransit, col);
    return columnOptions(this.inTransitItems, this.filtersInTransit, col, (r, c) => this.getValue(r, c));
  }

  onInTransitFilterChange(col: string, values: Set<string>): void {
    this.filtersInTransit[col] = values;
    this.recomputeInTransit();
    this.cdr.markForCheck();
  }

  isInTransitColumnFiltered(col: string): boolean {
    const selected = this.filtersInTransit[col];
    if (!selected || selected.size === 0) return false;
    return selected.size < this.inTransitOptionsFor(col).length;
  }

  sortInTransitBy(column: SortColumn): void {
    if (this.sortInTransitColumn === column) {
      this.sortInTransitAsc = !this.sortInTransitAsc;
    } else {
      this.sortInTransitColumn = column;
      this.sortInTransitAsc = true;
    }
    this.recomputeInTransit();
    this.tablePrefs.save(IN_TRANSIT_PREF_KEY, this.sortInTransitColumn, this.sortInTransitAsc).subscribe();
  }

  onExportInTransitClick(): void {
    exportToExcel('Truck Availability - In Transit', this.inTransitColumns, this.inTransitRows);
  }

  private recomputeInTransit(): void {
    const filtered = applyFilters(this.inTransitItems, this.filtersInTransit, (r, c) => this.getValue(r, c));
    this.inTransitRows = this.sortRows(filtered, this.sortInTransitColumn, this.sortInTransitAsc);
  }

  // --- Shared ---

  private ensureFilterKey(filters: Record<string, Set<string>>, key: string): void {
    if (!filters[key]) filters[key] = new Set();
  }

  getValue(row: TruckAvailabilityRow, col: string): string {
    if (col === 'isAvailable') return row.isAvailable ? 'Available' : 'In Transit';
    return String((row as any)[col] ?? '');
  }

  private sortRows(rows: TruckAvailabilityRow[], column: SortColumn, asc: boolean): TruckAvailabilityRow[] {
    const dir = asc ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[column];
      const bv = b[column];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }

  load(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (r) => {
        this.availableItems = r.filter((t) => t.isAvailable);
        this.inTransitItems = r.filter((t) => !t.isAvailable);
        this.recomputeAvailable();
        this.recomputeInTransit();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.error = 'Could not load truck availability.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  selectTruck(truck: TruckAvailabilityRow): void {
    this.selectedTruck = this.selectedTruck === truck ? null : truck;
    this.moveToCityId = null;
    this.moveDate = '';
    this.moveReason = '';
    this.moveValue = null;
    this.moveNotes = '';
    this.moveError = '';
    this.expectedDeliveryDraft = this.selectedTruck?.expectedAvailableDate ?? '';
    this.actualDropOffDraft = '';
    this.dropDatesError = '';
    if (this.selectedTruck) this.loadMovements();
  }

  saveExpectedDelivery(): void {
    if (!this.selectedTruck?.activeDropId) return;
    this.savingDropDates = true;
    this.dropDatesError = '';
    this.truckLoadService.updateExpectedDelivery(this.selectedTruck.activeDropId, this.expectedDeliveryDraft || null).subscribe({
      next: () => { this.savingDropDates = false; this.load(); },
      error: (err: any) => { this.savingDropDates = false; this.dropDatesError = err?.error?.message || 'Could not update expected delivery date.'; this.cdr.markForCheck(); }
    });
  }

  saveActualDropOff(): void {
    if (!this.selectedTruck?.activeDropId) return;
    this.savingDropDates = true;
    this.dropDatesError = '';
    this.truckLoadService.setActualDropOff(this.selectedTruck.activeDropId, this.actualDropOffDraft || null).subscribe({
      next: () => {
        this.savingDropDates = false;
        // The truck may now be Available and have moved to the other
        // table — its row reference is stale either way once reloaded.
        this.selectedTruck = null;
        this.load();
      },
      error: (err: any) => { this.savingDropDates = false; this.dropDatesError = err?.error?.message || 'Could not save actual drop off date.'; this.cdr.markForCheck(); }
    });
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
      error: (err: any) => { this.moving = false; this.moveError = err?.error?.message || 'Could not set starting city.'; this.cdr.markForCheck(); }
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
      error: (err: any) => { this.moving = false; this.moveError = err?.error?.message || 'Could not move truck.'; this.cdr.markForCheck(); }
    });
  }
}
