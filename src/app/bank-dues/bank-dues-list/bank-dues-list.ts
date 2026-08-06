import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { ExcelHeaderFilter } from '../../shared/excel-header-filter';
import { applyFilters, columnOptions } from '../../shared/table-filter.util';
import { ThousandsInputDirective } from '../../shared/thousands-input.directive';
import { TablePreferencesService } from '../../table-preferences/table-preferences.service';
import { BankDueRow, BankDuesService, CollectionRecord } from '../bank-dues.service';

type SortColumn = keyof BankDueRow;

interface ColumnDef {
  key: SortColumn;
  label: string;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'businessUnit', label: 'BU' },
  { key: 'consignee', label: 'Consignee' },
  { key: 'receiverBank', label: 'Receiver Bank' },
  { key: 'blAwbNo', label: 'BL/AWB' },
  { key: 'sob', label: 'Actual SOB' },
  { key: 'lastOffshoreInvoiceNo', label: 'Last Offshore Invoice No.' },
  { key: 'tenorDays', label: 'Tenor' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'imFormNo', label: 'IM Form No.' },
  { key: 'imFormDate', label: 'IM Form Date' },
  { key: 'value', label: 'Value' },
  { key: 'currency', label: 'Currency' },
  { key: 'valueAed', label: 'Value (AED)' },
  { key: 'paidAed', label: 'Paid (AED)' },
  { key: 'balanceAed', label: 'Balance (AED)' }
];

@Component({
  selector: 'app-bank-dues-list',
  imports: [CommonModule, FormsModule, ThousandsInputDirective, ExcelHeaderFilter],
  templateUrl: './bank-dues-list.html'
})
export class BankDuesList implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  allRows: BankDueRow[] = [];
  loading = true;
  error = '';
  searchText = '';
  sortColumn: SortColumn = 'consignee';
  sortAsc = true;

  currencies: LookupEntity[] = [];

  columns: ColumnDef[] = [...DEFAULT_COLUMNS];
  private dragFromIndex: number | null = null;

  filters: Record<string, Set<string>> = {};

  selectedShipmentId: number | null = null;
  selectedRow: BankDueRow | null = null;
  records: CollectionRecord[] = [];
  loadingDetail = false;

  newPaymentDate = '';
  newPaymentCurrencyId: number | null = null;
  newPaymentValue: number | null = null;
  addingPayment = false;

  constructor(private service: BankDuesService, private lookups: SettingsLookupService, private tablePrefs: TablePreferencesService) {}

  ngOnInit(): void {
    this.lookups.getAll<LookupEntity>('currencies').subscribe({ next: (r) => { this.currencies = r; this.cdr.markForCheck(); } });
    this.tablePrefs.get('bankDues').subscribe({
      next: (pref) => {
        if (pref) {
          this.sortColumn = pref.sortColumn as SortColumn;
          this.sortAsc = pref.sortAsc;
        }
        this.load();
      },
      error: () => this.load()
    });

    this.tablePrefs.getColumnOrder('bankDues').subscribe({
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
    this.tablePrefs.saveColumnOrder('bankDues', cols.map((c) => c.key)).subscribe();
  }

    load(): void {
    this.loading = true;
    this.service.getOpen().subscribe({
      next: (r) => {
        this.allRows = r;
        this.loading = false;
        // Keep the open detail panel in sync with the freshly reloaded row
        // (fixes stale Paid/Balance in the summary line after add/remove).
        if (this.selectedShipmentId !== null) {
          this.selectedRow = r.find((row) => row.shipmentId === this.selectedShipmentId) ?? this.selectedRow;
        }
        this.cdr.markForCheck();
      },
      error: () => { this.error = 'Could not load bank dues.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  private ensureFilterKey(key: string): void {
    if (!this.filters[key]) this.filters[key] = new Set();
  }

  private getValue(row: BankDueRow, col: string): string {
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

  get rows(): BankDueRow[] {
    let filtered = this.allRows;
    const q = this.searchText.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((r) =>
        r.consignee.toLowerCase().includes(q) ||
        (r.receiverBank ?? '').toLowerCase().includes(q) ||
        r.blAwbNo.toLowerCase().includes(q) ||
        (r.imFormNo ?? '').toLowerCase().includes(q)
      );
    }
    filtered = applyFilters(filtered, this.filters, (r, col) => this.getValue(r, col));
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
    this.tablePrefs.save('bankDues', this.sortColumn, this.sortAsc).subscribe();
  }

  get totalValueAed(): number {
    return this.rows.reduce((sum, r) => sum + r.valueAed, 0);
  }

  get totalBalanceAed(): number {
    return this.rows.reduce((sum, r) => sum + r.balanceAed, 0);
  }

  select(row: BankDueRow): void {
    this.selectedShipmentId = row.shipmentId;
    this.selectedRow = row;
    this.loadingDetail = true;
    this.records = [];

    this.service.getRecords(row.shipmentId).subscribe({
      next: (r) => { this.records = r; this.loadingDetail = false; this.cdr.markForCheck(); },
      error: () => { this.loadingDetail = false; this.error = 'Could not load collection records.'; this.cdr.markForCheck(); }
    });
  }

  addPayment(): void {
    if (!this.selectedShipmentId || !this.newPaymentDate || !this.newPaymentCurrencyId || !this.newPaymentValue) return;
    this.addingPayment = true;
    this.service.addRecord(this.selectedShipmentId, {
      paymentDate: this.newPaymentDate, currencyId: this.newPaymentCurrencyId, value: this.newPaymentValue
    }).subscribe({
      next: () => {
        this.addingPayment = false;
        this.newPaymentDate = '';
        this.newPaymentCurrencyId = null;
        this.newPaymentValue = null;
        const row = this.selectedRow!;
        this.select(row);
        this.load();
      },
      error: () => { this.addingPayment = false; this.error = 'Could not add collection.'; this.cdr.markForCheck(); }
    });
  }

  removePayment(recordId: number): void {
    if (!this.selectedShipmentId) return;
    const row = this.selectedRow!;
    this.service.deleteRecord(this.selectedShipmentId, recordId).subscribe({
      next: () => { this.select(row); this.load(); },
      error: () => { this.error = 'Could not remove collection.'; this.cdr.markForCheck(); }
    });
  }
}
