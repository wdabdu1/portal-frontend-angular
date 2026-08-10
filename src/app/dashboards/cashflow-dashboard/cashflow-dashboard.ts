import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BankDueRow, BankDuesService } from '../../bank-dues/bank-dues.service';
import { exportToExcel } from '../../shared/excel-export.util';
import { ExcelHeaderFilter } from '../../shared/excel-header-filter';
import { applyFilters, columnOptions } from '../../shared/table-filter.util';
import { TablePreferencesService } from '../../table-preferences/table-preferences.service';
import { CashflowService, CustomsClearancePaymentRow, SupplierPaymentRow } from '../cashflow.service';

type SupplierView = 'Monthly' | 'Next8Weeks' | 'All';
interface ColumnDef { key: string; label: string; }

interface MonthlyAccumulation {
  businessUnit: string;
  month: string;
  totalUsd: number;
}

// Local Bank rows extended with a display-friendly Due Amount field
// (native value shown with its currency) so it works with the same
// generic getValue/columnOptions helpers as everything else.
interface BankRowWithDueAmount extends BankDueRow {
  dueAmountDisplay: string;
}

const CUSTOMS_COLUMNS: ColumnDef[] = [
  { key: 'businessUnit', label: 'BU' },
  { key: 'chargeType', label: 'Charge Type' },
  { key: 'blAwbNo', label: 'BL/AWB No.' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'valueSdg', label: 'Value (SDG)' }
];

const BANK_COLUMNS: ColumnDef[] = [
  { key: 'businessUnit', label: 'BU' },
  { key: 'consignee', label: 'Consignee' },
  { key: 'receiverBank', label: 'Bank' },
  { key: 'imFormNo', label: 'IM Form No.' },
  { key: 'blAwbNo', label: 'BL' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'dueAmountDisplay', label: 'Due Amount' }
];

const SUPPLIER_COLUMNS: ColumnDef[] = [
  { key: 'businessUnit', label: 'BU' },
  { key: 'supplierName', label: 'Supplier Name' },
  { key: 'blAwbNo', label: 'BL' },
  { key: 'label', label: 'Label' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'amountUsd', label: 'Amount (USD)' }
];

@Component({
  selector: 'app-cashflow-dashboard',
  imports: [CommonModule, FormsModule, ExcelHeaderFilter],
  templateUrl: './cashflow-dashboard.html'
})
export class CashflowDashboard implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  loadingCustoms = true;
  loadingBank = true;
  loadingSupplier = true;

  allCustomsRows: CustomsClearancePaymentRow[] = [];
  allBankRows: BankRowWithDueAmount[] = [];
  allSupplierRows: SupplierPaymentRow[] = [];

  customsColumns: ColumnDef[] = [...CUSTOMS_COLUMNS];
  bankColumns: ColumnDef[] = [...BANK_COLUMNS];
  supplierColumns: ColumnDef[] = [...SUPPLIER_COLUMNS];

  customsFilters: Record<string, Set<string>> = {};
  bankFilters: Record<string, Set<string>> = {};
  supplierFilters: Record<string, Set<string>> = {};

  customsSortColumn = 'dueDate';
  customsSortAsc = true;
  bankSortColumn = 'dueDate';
  bankSortAsc = true;
  supplierSortColumn = 'dueDate';
  supplierSortAsc = true;

  // High-level dropdown filters (on top of per-column Excel filters)
  customsBuFilter = 'All';
  customsChargeTypeFilter = 'All';
  customsNextWeekOnly = false;

  bankBuFilter = 'All';
  bankBankFilter = 'All';
  bankNextWeekOnly = false;

  supplierView: SupplierView = 'Monthly';

  private dragFrom: { table: 'customs' | 'bank' | 'supplier'; index: number } | null = null;

  constructor(
    private cashflowService: CashflowService,
    private bankDuesService: BankDuesService,
    private tablePrefs: TablePreferencesService
  ) {}

  ngOnInit(): void {
    this.cashflowService.getCustomsClearancePayments().subscribe({
      next: (r) => { this.allCustomsRows = r; this.loadingCustoms = false; this.cdr.markForCheck(); },
      error: () => { this.loadingCustoms = false; this.cdr.markForCheck(); }
    });
    this.bankDuesService.getOpen().subscribe({
      next: (r) => {
        this.allBankRows = r.map((row) => ({ ...row, dueAmountDisplay: row.value !== null ? `${row.value} ${row.currency ?? ''}`.trim() : '—' }));
        this.loadingBank = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loadingBank = false; this.cdr.markForCheck(); }
    });
    this.cashflowService.getSupplierPayments().subscribe({
      next: (r) => { this.allSupplierRows = r; this.loadingSupplier = false; this.cdr.markForCheck(); },
      error: () => { this.loadingSupplier = false; this.cdr.markForCheck(); }
    });

    this.tablePrefs.getColumnOrder('cashflow-customs').subscribe({ next: (o) => { if (o && o.length > 0) this.customsColumns = this.applyOrder(CUSTOMS_COLUMNS, o); } });
    this.tablePrefs.getColumnOrder('cashflow-bank').subscribe({ next: (o) => { if (o && o.length > 0) this.bankColumns = this.applyOrder(BANK_COLUMNS, o); } });
    this.tablePrefs.getColumnOrder('cashflow-supplier').subscribe({ next: (o) => { if (o && o.length > 0) this.supplierColumns = this.applyOrder(SUPPLIER_COLUMNS, o); } });
  }

  private applyOrder(defaults: ColumnDef[], savedOrder: string[]): ColumnDef[] {
    const byKey = new Map(defaults.map((c) => [c.key, c]));
    const ordered: ColumnDef[] = [];
    for (const key of savedOrder) {
      const col = byKey.get(key);
      if (col) { ordered.push(col); byKey.delete(key); }
    }
    ordered.push(...byKey.values());
    return ordered;
  }

  private getValue(row: any, col: string): string {
    return String(row[col] ?? '');
  }

  private isWithinNextWeek(dueDate: string | null): boolean {
    if (!dueDate) return false;
    const d = new Date(dueDate);
    const today = new Date();
    const cutoff = new Date();
    cutoff.setDate(today.getDate() + 7);
    return d >= today && d <= cutoff;
  }

  // --- Customs & Clearance ---
  customsOptionsFor(col: string): string[] {
    if (!this.customsFilters[col]) this.customsFilters[col] = new Set();
    return columnOptions(this.allCustomsRows, this.customsFilters, col, (r, c) => this.getValue(r, c));
  }
  onCustomsFilterChange(col: string, values: Set<string>): void { this.customsFilters[col] = values; this.cdr.markForCheck(); }
  isCustomsColumnFiltered(col: string): boolean {
    const selected = this.customsFilters[col];
    if (!selected || selected.size === 0) return false;
    return selected.size < this.customsOptionsFor(col).length;
  }
  get uniqueCustomsBu(): string[] { return [...new Set(this.allCustomsRows.map((r) => r.businessUnit))].sort(); }
  get uniqueChargeTypes(): string[] { return [...new Set(this.allCustomsRows.map((r) => r.chargeType))].sort(); }

  get customsRows(): CustomsClearancePaymentRow[] {
    let rows = applyFilters(this.allCustomsRows, this.customsFilters, (r, col) => this.getValue(r, col));
    if (this.customsBuFilter !== 'All') rows = rows.filter((r) => r.businessUnit === this.customsBuFilter);
    if (this.customsChargeTypeFilter !== 'All') rows = rows.filter((r) => r.chargeType === this.customsChargeTypeFilter);
    if (this.customsNextWeekOnly) rows = rows.filter((r) => this.isWithinNextWeek(r.dueDate));
    const dir = this.customsSortAsc ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = (a as any)[this.customsSortColumn] ?? '';
      const bv = (b as any)[this.customsSortColumn] ?? '';
      return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
    });
  }
  get customsTotalSdg(): number { return this.customsRows.reduce((sum, r) => sum + r.valueSdg, 0); }
  sortCustoms(col: string): void {
    if (this.customsSortColumn === col) this.customsSortAsc = !this.customsSortAsc;
    else { this.customsSortColumn = col; this.customsSortAsc = true; }
  }
  onCustomsDragStart(i: number): void { this.dragFrom = { table: 'customs', index: i }; }
  onCustomsDrop(i: number): void {
    if (!this.dragFrom || this.dragFrom.table !== 'customs' || this.dragFrom.index === i) return;
    const cols = [...this.customsColumns];
    const [moved] = cols.splice(this.dragFrom.index, 1);
    cols.splice(i, 0, moved);
    this.customsColumns = cols;
    this.dragFrom = null;
    this.tablePrefs.saveColumnOrder('cashflow-customs', cols.map((c) => c.key)).subscribe();
  }
  onExportCustoms(): void { exportToExcel('Customs and Clearance Payments', this.customsColumns, this.customsRows); }

  // --- Local Bank ---
  bankOptionsFor(col: string): string[] {
    if (!this.bankFilters[col]) this.bankFilters[col] = new Set();
    return columnOptions(this.allBankRows, this.bankFilters, col, (r, c) => this.getValue(r, c));
  }
  onBankFilterChange(col: string, values: Set<string>): void { this.bankFilters[col] = values; this.cdr.markForCheck(); }
  isBankColumnFiltered(col: string): boolean {
    const selected = this.bankFilters[col];
    if (!selected || selected.size === 0) return false;
    return selected.size < this.bankOptionsFor(col).length;
  }
  get uniqueBankBu(): string[] { return [...new Set(this.allBankRows.map((r) => r.businessUnit))].sort(); }
  get uniqueBanks(): string[] { return [...new Set(this.allBankRows.map((r) => r.receiverBank).filter((b): b is string => !!b))].sort(); }

  get bankRows(): BankRowWithDueAmount[] {
    let rows = applyFilters(this.allBankRows, this.bankFilters, (r, col) => this.getValue(r, col));
    if (this.bankBuFilter !== 'All') rows = rows.filter((r) => r.businessUnit === this.bankBuFilter);
    if (this.bankBankFilter !== 'All') rows = rows.filter((r) => r.receiverBank === this.bankBankFilter);
    if (this.bankNextWeekOnly) rows = rows.filter((r) => this.isWithinNextWeek(r.dueDate));
    const dir = this.bankSortAsc ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = (a as any)[this.bankSortColumn] ?? '';
      const bv = (b as any)[this.bankSortColumn] ?? '';
      return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
    });
  }
  sortBank(col: string): void {
    if (this.bankSortColumn === col) this.bankSortAsc = !this.bankSortAsc;
    else { this.bankSortColumn = col; this.bankSortAsc = true; }
  }
  onBankDragStart(i: number): void { this.dragFrom = { table: 'bank', index: i }; }
  onBankDrop(i: number): void {
    if (!this.dragFrom || this.dragFrom.table !== 'bank' || this.dragFrom.index === i) return;
    const cols = [...this.bankColumns];
    const [moved] = cols.splice(this.dragFrom.index, 1);
    cols.splice(i, 0, moved);
    this.bankColumns = cols;
    this.dragFrom = null;
    this.tablePrefs.saveColumnOrder('cashflow-bank', cols.map((c) => c.key)).subscribe();
  }
  onExportBank(): void { exportToExcel('Local Bank Payments', this.bankColumns, this.bankRows); }

  // --- Supplier Payments ---
  supplierOptionsFor(col: string): string[] {
    if (!this.supplierFilters[col]) this.supplierFilters[col] = new Set();
    return columnOptions(this.allSupplierRows, this.supplierFilters, col, (r, c) => this.getValue(r, c));
  }
  onSupplierFilterChange(col: string, values: Set<string>): void { this.supplierFilters[col] = values; this.cdr.markForCheck(); }
  isSupplierColumnFiltered(col: string): boolean {
    const selected = this.supplierFilters[col];
    if (!selected || selected.size === 0) return false;
    return selected.size < this.supplierOptionsFor(col).length;
  }

  private filteredSupplierRows(): SupplierPaymentRow[] {
    return applyFilters(this.allSupplierRows, this.supplierFilters, (r, col) => this.getValue(r, col));
  }

  get supplierRowsAll(): SupplierPaymentRow[] {
    const dir = this.supplierSortAsc ? 1 : -1;
    return [...this.filteredSupplierRows()].sort((a, b) => {
      const av = (a as any)[this.supplierSortColumn] ?? '';
      const bv = (b as any)[this.supplierSortColumn] ?? '';
      return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
    });
  }

  get supplierRowsNext8Weeks(): SupplierPaymentRow[] {
    const today = new Date();
    const cutoff = new Date();
    cutoff.setDate(today.getDate() + 56);
    return this.supplierRowsAll.filter((r) => {
      const d = new Date(r.dueDate);
      return d >= today && d <= cutoff;
    });
  }

  get supplierMonthlyAccumulation(): MonthlyAccumulation[] {
    const map = new Map<string, MonthlyAccumulation>();
    for (const r of this.filteredSupplierRows()) {
      const month = r.dueDate.slice(0, 7);
      const key = `${r.businessUnit}|${month}`;
      if (!map.has(key)) map.set(key, { businessUnit: r.businessUnit, month, totalUsd: 0 });
      map.get(key)!.totalUsd += r.amountUsd;
    }
    return [...map.values()].sort((a, b) => a.month.localeCompare(b.month) || a.businessUnit.localeCompare(b.businessUnit));
  }

  get supplierTotalUsd(): number { return this.filteredSupplierRows().reduce((sum, r) => sum + r.amountUsd, 0); }

  setSupplierView(view: SupplierView): void { this.supplierView = view; }
  sortSupplier(col: string): void {
    if (this.supplierSortColumn === col) this.supplierSortAsc = !this.supplierSortAsc;
    else { this.supplierSortColumn = col; this.supplierSortAsc = true; }
  }
  onSupplierDragStart(i: number): void { this.dragFrom = { table: 'supplier', index: i }; }
  onSupplierDrop(i: number): void {
    if (!this.dragFrom || this.dragFrom.table !== 'supplier' || this.dragFrom.index === i) return;
    const cols = [...this.supplierColumns];
    const [moved] = cols.splice(this.dragFrom.index, 1);
    cols.splice(i, 0, moved);
    this.supplierColumns = cols;
    this.dragFrom = null;
    this.tablePrefs.saveColumnOrder('cashflow-supplier', cols.map((c) => c.key)).subscribe();
  }
  onExportSupplier(): void {
    const rows = this.supplierView === 'Monthly' ? this.supplierMonthlyAccumulation
      : this.supplierView === 'All' ? this.supplierRowsAll : this.supplierRowsNext8Weeks;
    const cols = this.supplierView === 'Monthly'
      ? [{ key: 'businessUnit', label: 'BU' }, { key: 'month', label: 'Month' }, { key: 'totalUsd', label: 'Total Due (USD)' }]
      : this.supplierColumns;
    exportToExcel(`Supplier Payments - ${this.supplierView}`, cols, rows as any);
  }
}
