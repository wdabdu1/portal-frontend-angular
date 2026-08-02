import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { ThousandsInputDirective } from '../../shared/thousands-input.directive';
import { BankDueRow, BankDuesService, CollectionRecord } from '../bank-dues.service';

type SortColumn = keyof BankDueRow;

@Component({
  selector: 'app-bank-dues-list',
  imports: [CommonModule, FormsModule, ThousandsInputDirective],
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

  selectedShipmentId: number | null = null;
  selectedRow: BankDueRow | null = null;
  records: CollectionRecord[] = [];
  loadingDetail = false;

  newPaymentDate = '';
  newPaymentCurrencyId: number | null = null;
  newPaymentValue: number | null = null;
  addingPayment = false;

  constructor(private service: BankDuesService, private lookups: SettingsLookupService) {}

  ngOnInit(): void {
    this.lookups.getAll<LookupEntity>('currencies').subscribe({ next: (r) => { this.currencies = r; this.cdr.markForCheck(); } });
    this.load();
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
