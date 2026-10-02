import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExcelHeaderFilter } from '../../shared/excel-header-filter';
import { applyFilters, columnOptions } from '../../shared/table-filter.util';
import { TablePreferencesService } from '../../table-preferences/table-preferences.service';
import { exportToExcel } from '../../shared/excel-export.util';
import { ClearanceService, ClearanceShipmentSummary } from '../clearance.service';
import { SettingsLookupService } from '../../settings/settings-lookup.service';

type SortColumn = keyof ClearanceShipmentSummary;

interface ColumnDef {
  key: SortColumn;
  label: string;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'businessUnit', label: 'BU' },
  { key: 'blAwbNo', label: 'BL/AWB' },
  { key: 'category', label: 'Category' },
  { key: 'type', label: 'Type' },
  { key: 'shippingLine', label: 'Shipping Line' },
  { key: 'eta', label: 'ETA' },
  { key: 'originalShipmentSetReceivedDate', label: 'Originals Received' },
  { key: 'demurrageFreeDaysRemaining', label: 'Line Free Days' },
  { key: 'fclCount', label: 'FCL' },
  { key: 'declarationNo', label: 'Declaration No.' },
  { key: 'product', label: 'Product/Model' },
  { key: 'qty', label: 'Qty' },
  { key: 'unit', label: 'Units' },
  { key: 'routeStatus', label: 'Route' },
  { key: 'slaPercent', label: 'SLA Progress' },
  { key: 'doComments', label: 'DO Comments' },
  { key: 'customsExaminationComments', label: 'Customs Examination Comments' },
  { key: 'ssmoExaminationComments', label: 'SSMO Examination Comments' },
  { key: 'truckContainersComments', label: 'Truck & Containers Comments' }
];

const ROUTE_LABELS: Record<string, string> = {
  NotSelected: 'Not Started',
  Route1ClearAtPort: 'Clear at Port',
  Route2FzDeposit: 'FZ Deposit',
  Route3ClearFromFz: 'Clear from FZ'
};

@Component({
  selector: 'app-clearance-list',
  imports: [CommonModule, FormsModule, ExcelHeaderFilter],
  templateUrl: './clearance-list.html'
})
export class ClearanceList implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  allShipments: ClearanceShipmentSummary[] = [];
  loading = true;
  error = '';
  searchText = '';

  // Defaults to Pending so users land on their actual work queue, same
  // pattern as TP Orders — Confirmed (completed) clearances are still one
  // click away.
  statusFilter: 'Pending' | 'Confirmed' | 'All' = 'Pending';
  sortColumn: SortColumn = 'eta';
  sortAsc = true;

  columns: ColumnDef[] = [...DEFAULT_COLUMNS];
  private dragFromIndex: number | null = null;

  filters: Record<string, Set<string>> = {};

  // SPC Euro Rate banner — so every user landing on Clearance can see at
  // a glance whether the rate behind SPC storage-fee calculations is
  // current, without having to open Settings. Reuses the same
  // GET api/settings/spc-rates endpoint Settings > FX Rates already
  // calls; no backend change needed since it's open to any authenticated
  // user. latestSpcRate stays null while loading/on error — the banner
  // template just omits itself in that case.
  latestSpcRate: { euroToSdgRate: number; effectiveDate: string } | null = null;

  constructor(
    private service: ClearanceService,
    private router: Router,
    private tablePrefs: TablePreferencesService,
    private lookups: SettingsLookupService
  ) {}

  ngOnInit(): void {
    this.loadSpcRate();

    this.tablePrefs.get('clearance').subscribe({
      next: (pref) => {
        if (pref) {
          this.sortColumn = pref.sortColumn as SortColumn;
          this.sortAsc = pref.sortAsc;
        }
        this.load();
      },
      error: () => this.load()
    });

    this.tablePrefs.getColumnOrder('clearance').subscribe({
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
    this.tablePrefs.saveColumnOrder('clearance', cols.map((c) => c.key)).subscribe();
  }

  load(): void {
    this.loading = true;
    this.service.getShipmentsForClearance(this.searchText || undefined).subscribe({
      next: (r) => { this.allShipments = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load shipments.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  private loadSpcRate(): void {
    this.lookups.getAll<{ id: number; euroToSdgRate: number; effectiveDate: string }>('spc-rates').subscribe({
      next: (rates) => {
        // Same "latest by EffectiveDate" rule as every other rate lookup
        // in this app (e.g. Transfer Pricing's FX-rate resolution) —
        // sort descending and take the first rather than trusting insertion order.
        this.latestSpcRate = rates.length
          ? [...rates].sort((a, b) => (a.effectiveDate < b.effectiveDate ? 1 : -1))[0]
          : null;
        this.cdr.markForCheck();
      },
      error: () => { this.latestSpcRate = null; this.cdr.markForCheck(); }
    });
  }

  // Days between the rate's effective date and today. Used to flag a
  // rate that looks like it hasn't been refreshed in a while so users
  // know to double check with admin — not an enforced business rule,
  // just a 30-day heuristic (adjustable if the actual update cadence
  // turns out to be different).
  get spcRateAgeDays(): number {
    if (!this.latestSpcRate) return 0;
    const ms = Date.now() - new Date(this.latestSpcRate.effectiveDate).getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }

  get spcRateIsStale(): boolean {
    return this.spcRateAgeDays > 30;
  }

  onSearchChange(): void {
    this.load();
  }

  private ensureFilterKey(key: string): void {
    if (!this.filters[key]) this.filters[key] = new Set();
  }

  private getValue(row: ClearanceShipmentSummary, col: string): string {
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

  get shipments(): ClearanceShipmentSummary[] {
    let filtered = applyFilters(this.allShipments, this.filters, (r, col) => this.getValue(r, col));
    if (this.statusFilter === 'Pending') filtered = filtered.filter((s) => !s.isCompleted);
    if (this.statusFilter === 'Confirmed') filtered = filtered.filter((s) => s.isCompleted);

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
    exportToExcel('Clearance', this.columns, this.shipments);
  }

  sortBy(column: SortColumn): void {
    if (this.sortColumn === column) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortColumn = column;
      this.sortAsc = true;
    }
    this.tablePrefs.save('clearance', this.sortColumn, this.sortAsc).subscribe();
  }

  routeLabel(status: string): string {
    return ROUTE_LABELS[status] ?? status;
  }

  viewDetails(shipmentId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.router.navigate(['/shipments', shipmentId]);
  }

  goToClearance(shipmentId: number): void {
    this.router.navigate(['/clearance', shipmentId]);
  }

  trafficColor(light: string): string {
    switch (light) {
      case 'Green': return '#2a7d2a';
      case 'Amber': return '#c98a00';
      case 'Red': return '#c0392b';
      default: return '#999';
    }
  }
}
