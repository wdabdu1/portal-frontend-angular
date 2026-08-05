import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { ThousandsInputDirective } from '../../shared/thousands-input.directive';
import { TablePreferencesService } from '../../table-preferences/table-preferences.service';
import {
  PaymentRecord, SupplierDueRow, SupplierDuesService, SupplierInvoiceSummary
} from '../supplier-dues.service';

type SortColumn = keyof SupplierDueRow;

@Component({
  selector: 'app-supplier-dues-list',
  imports: [CommonModule, FormsModule, ThousandsInputDirective],
  templateUrl: './supplier-dues-list.html'
})
export class SupplierDuesList implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  allRows: SupplierDueRow[] = [];
  loading = true;
  error = '';
  searchText = '';
  sortColumn: SortColumn = 'supplierName';
  sortAsc = true;

  currencies: LookupEntity[] = [];

  filterBusinessUnit = '';
  filterPaymentTerm = '';

  selectedShipmentId: number | null = null;
  summary: SupplierInvoiceSummary | null = null;
  paymentRecords: PaymentRecord[] = [];
  loadingDetail = false;

  newPaymentDate = '';
  newPaymentCurrencyId: number | null = null;
  newPaymentValue: number | null = null;
  addingPayment = false;

  constructor(private service: SupplierDuesService, private lookups: SettingsLookupService, private tablePrefs: TablePreferencesService) {}

  ngOnInit(): void {
    this.lookups.getAll<LookupEntity>('currencies').subscribe({ next: (r) => { this.currencies = r; this.cdr.markForCheck(); } });
    this.tablePrefs.get('supplierDues').subscribe({
      next: (pref) => {
        if (pref) {
          this.sortColumn = pref.sortColumn as SortColumn;
          this.sortAsc = pref.sortAsc;
        }
        this.load();
      },
      error: () => this.load()
    });
  }
  load(): void {
    this.loading = true;
    this.service.getOpen().subscribe({
      next: (r) => { this.allRows = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load supplier dues.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  get businessUnitOptions(): string[] {
    return [...new Set(this.allRows.map((r) => r.businessUnit))].sort();
  }

  get paymentTermOptions(): string[] {
    return [...new Set(this.allRows.map((r) => r.paymentTerm))].sort();
  }

  get rows(): SupplierDueRow[] {
    let filtered = this.allRows;
    const q = this.searchText.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((r) =>
        r.supplierName.toLowerCase().includes(q) ||
        r.poNumber.toLowerCase().includes(q) ||
        r.blAwbNo.toLowerCase().includes(q)
      );
    }
    if (this.filterBusinessUnit) filtered = filtered.filter((r) => r.businessUnit === this.filterBusinessUnit);
    if (this.filterPaymentTerm) filtered = filtered.filter((r) => r.paymentTerm === this.filterPaymentTerm);
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
    this.tablePrefs.save('supplierDues', this.sortColumn, this.sortAsc).subscribe();
  }

  get totalValueUsd(): number {
    return this.rows.reduce((sum, r) => sum + r.totalValueUsd, 0);
  }

  get totalUnpaidUsd(): number {
    return this.rows.reduce((sum, r) => sum + r.totalUnpaidUsd, 0);
  }

  select(shipmentId: number): void {
    this.selectedShipmentId = shipmentId;
    this.loadingDetail = true;
    this.summary = null;
    this.paymentRecords = [];

    this.service.getInvoiceSummary(shipmentId).subscribe({
      next: (s) => { this.summary = s; this.loadingDetail = false; this.cdr.markForCheck(); },
      error: () => { this.loadingDetail = false; this.error = 'Could not load invoice summary.'; this.cdr.markForCheck(); }
    });
    this.service.getPaymentRecords(shipmentId).subscribe({
      next: (r) => { this.paymentRecords = r; this.cdr.markForCheck(); }
    });
  }

  addPayment(): void {
    if (!this.selectedShipmentId || !this.newPaymentDate || !this.newPaymentCurrencyId || !this.newPaymentValue) return;
    this.addingPayment = true;
    this.service.addPaymentRecord(this.selectedShipmentId, {
      paymentDate: this.newPaymentDate, currencyId: this.newPaymentCurrencyId, value: this.newPaymentValue
    }).subscribe({
      next: () => {
        this.addingPayment = false;
        this.newPaymentDate = '';
        this.newPaymentCurrencyId = null;
        this.newPaymentValue = null;
        this.select(this.selectedShipmentId!);
        this.load();
      },
      error: () => { this.addingPayment = false; this.error = 'Could not add payment.'; this.cdr.markForCheck(); }
    });
  }

  removePayment(recordId: number): void {
    if (!this.selectedShipmentId) return;
    this.service.deletePaymentRecord(this.selectedShipmentId, recordId).subscribe({
      next: () => { this.select(this.selectedShipmentId!); this.load(); },
      error: () => { this.error = 'Could not remove payment.'; this.cdr.markForCheck(); }
    });
  }
}
