import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BankDueRow, BankDuesService } from '../../bank-dues/bank-dues.service';
import { CashflowService, CustomsClearancePaymentRow, SupplierPaymentRow } from '../cashflow.service';

type SupplierView = 'Monthly' | 'Next8Weeks' | 'All';

interface MonthlyAccumulation {
  businessUnit: string;
  month: string;
  totalUsd: number;
}

@Component({
  selector: 'app-cashflow-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './cashflow-dashboard.html'
})
export class CashflowDashboard implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  loadingCustoms = true;
  loadingBank = true;
  loadingSupplier = true;

  allCustomsRows: CustomsClearancePaymentRow[] = [];
  allBankRows: BankDueRow[] = [];
  allSupplierRows: SupplierPaymentRow[] = [];

  // --- Customs & Clearance ---
  customsSearch = '';
  customsSortColumn: keyof CustomsClearancePaymentRow = 'dueDate';
  customsSortAsc = true;

  // --- Local Bank ---
  bankSearch = '';
  bankSortColumn: keyof BankDueRow = 'dueDate';
  bankSortAsc = true;

  // --- Supplier Payments ---
  supplierView: SupplierView = 'Monthly';
  supplierSearch = '';
  supplierSortColumn: keyof SupplierPaymentRow = 'dueDate';
  supplierSortAsc = true;

  constructor(private cashflowService: CashflowService, private bankDuesService: BankDuesService) {}

  ngOnInit(): void {
    this.cashflowService.getCustomsClearancePayments().subscribe({
      next: (r) => { this.allCustomsRows = r; this.loadingCustoms = false; this.cdr.markForCheck(); },
      error: () => { this.loadingCustoms = false; this.cdr.markForCheck(); }
    });
    this.bankDuesService.getOpen().subscribe({
      next: (r) => { this.allBankRows = r; this.loadingBank = false; this.cdr.markForCheck(); },
      error: () => { this.loadingBank = false; this.cdr.markForCheck(); }
    });
    this.cashflowService.getSupplierPayments().subscribe({
      next: (r) => { this.allSupplierRows = r; this.loadingSupplier = false; this.cdr.markForCheck(); },
      error: () => { this.loadingSupplier = false; this.cdr.markForCheck(); }
    });
  }

  // --- Customs & Clearance ---
  sortCustoms(col: keyof CustomsClearancePaymentRow): void {
    if (this.customsSortColumn === col) this.customsSortAsc = !this.customsSortAsc;
    else { this.customsSortColumn = col; this.customsSortAsc = true; }
  }

  get customsRows(): CustomsClearancePaymentRow[] {
    const q = this.customsSearch.trim().toLowerCase();
    let rows = this.allCustomsRows;
    if (q) rows = rows.filter((r) => r.businessUnit.toLowerCase().includes(q) || r.chargeType.toLowerCase().includes(q) || r.blAwbNo.toLowerCase().includes(q));
    const dir = this.customsSortAsc ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[this.customsSortColumn] ?? '';
      const bv = b[this.customsSortColumn] ?? '';
      return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
    });
  }

  get customsTotalSdg(): number {
    return this.customsRows.reduce((sum, r) => sum + r.valueSdg, 0);
  }

  // --- Local Bank ---
  sortBank(col: keyof BankDueRow): void {
    if (this.bankSortColumn === col) this.bankSortAsc = !this.bankSortAsc;
    else { this.bankSortColumn = col; this.bankSortAsc = true; }
  }

  get bankRows(): BankDueRow[] {
    const q = this.bankSearch.trim().toLowerCase();
    let rows = this.allBankRows;
    if (q) rows = rows.filter((r) =>
      r.businessUnit.toLowerCase().includes(q) || r.consignee.toLowerCase().includes(q) ||
      (r.receiverBank || '').toLowerCase().includes(q) || r.blAwbNo.toLowerCase().includes(q)
    );
    const dir = this.bankSortAsc ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[this.bankSortColumn] ?? '';
      const bv = b[this.bankSortColumn] ?? '';
      return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
    });
  }

  // --- Supplier Payments ---
  setSupplierView(view: SupplierView): void {
    this.supplierView = view;
  }

  sortSupplier(col: keyof SupplierPaymentRow): void {
    if (this.supplierSortColumn === col) this.supplierSortAsc = !this.supplierSortAsc;
    else { this.supplierSortColumn = col; this.supplierSortAsc = true; }
  }

  private filteredSupplierRows(): SupplierPaymentRow[] {
    const q = this.supplierSearch.trim().toLowerCase();
    let rows = this.allSupplierRows;
    if (q) rows = rows.filter((r) => r.businessUnit.toLowerCase().includes(q) || r.supplierName.toLowerCase().includes(q) || r.blAwbNo.toLowerCase().includes(q));
    return rows;
  }

  get supplierRowsAll(): SupplierPaymentRow[] {
    const dir = this.supplierSortAsc ? 1 : -1;
    return [...this.filteredSupplierRows()].sort((a, b) => {
      const av = a[this.supplierSortColumn] ?? '';
      const bv = b[this.supplierSortColumn] ?? '';
      return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
    });
  }

  get supplierRowsNext8Weeks(): SupplierPaymentRow[] {
    const today = new Date();
    const cutoff = new Date();
    cutoff.setDate(today.getDate() + 56); // 8 weeks
    return this.supplierRowsAll.filter((r) => {
      const d = new Date(r.dueDate);
      return d >= today && d <= cutoff;
    });
  }

  get supplierMonthlyAccumulation(): MonthlyAccumulation[] {
    const map = new Map<string, MonthlyAccumulation>();
    for (const r of this.filteredSupplierRows()) {
      const month = r.dueDate.slice(0, 7); // YYYY-MM
      const key = `${r.businessUnit}|${month}`;
      if (!map.has(key)) map.set(key, { businessUnit: r.businessUnit, month, totalUsd: 0 });
      map.get(key)!.totalUsd += r.amountUsd;
    }
    return [...map.values()].sort((a, b) => a.month.localeCompare(b.month) || a.businessUnit.localeCompare(b.businessUnit));
  }

  get supplierTotalUsd(): number {
    return this.filteredSupplierRows().reduce((sum, r) => sum + r.amountUsd, 0);
  }
}
