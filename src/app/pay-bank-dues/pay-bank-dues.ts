import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LookupEntity, SettingsLookupService } from '../settings/settings-lookup.service';
import { ReceiverBankAccount } from '../settings/receiver-bank-accounts.service';
import { ExcelHeaderFilter } from '../shared/excel-header-filter';
import { applyFilters, columnOptions } from '../shared/table-filter.util';
import { TablePreferencesService } from '../table-preferences/table-preferences.service';
import { PayableDueRow, PayBankDuesService, SenderBankOption } from './pay-bank-dues.service';

interface ReceiverBank extends LookupEntity {
  name: string;
  address: string | null;
  accounts: ReceiverBankAccount[];
}

type SortColumn = keyof PayableDueRow;

interface ColumnDef {
  key: SortColumn;
  label: string;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'blAwbNo', label: 'BL/AWB' },
  { key: 'category', label: 'Category' },
  { key: 'receiverBankName', label: 'Receiving Bank' },
  { key: 'senderBankName', label: 'Sender Bank' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'cbosDueDate', label: 'CBOS Due' },
  { key: 'necessaryGoodType', label: 'Necessary Good' },
  { key: 'remainingAed', label: 'Remaining (AED)' },
];

@Component({
  selector: 'app-pay-bank-dues',
  imports: [CommonModule, FormsModule, ExcelHeaderFilter],
  templateUrl: './pay-bank-dues.html'
})
export class PayBankDues implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  banks: ReceiverBank[] = [];
  loadingBanks = true;

  // Initial, unfiltered landing view — filterable/sortable/reorderable,
  // same pattern as the existing Collecting Bank Dues table.
  allDues: PayableDueRow[] = [];
  loadingAll = true;
  showSettled = false;

  columns: ColumnDef[] = [...DEFAULT_COLUMNS];
  private dragFromIndex: number | null = null;
  filters: Record<string, Set<string>> = {};
  sortColumn: SortColumn = 'dueDate';
  sortAsc = true;

  // Filtered / payment mode
  filtering = false;
  selectedBankId: number | null = null;
  selectedBank: ReceiverBank | null = null;
  senderBanks: SenderBankOption[] = [];
  selectedSenderBankId: number | null = null;
  selectedAccountId: number | null = null;
  dues: PayableDueRow[] = [];
  loadingDues = false;

  error = '';

  // shipmentId -> entered AED amount (as a formatted string with commas), only while selected
  selected: Record<number, boolean> = {};
  amountText: Record<number, string> = {};

  confirming = false;
  submitting = false;
  submitError = '';
  done = false;

  constructor(private lookupService: SettingsLookupService, private service: PayBankDuesService, private tablePrefs: TablePreferencesService) {}

  ngOnInit(): void {
    this.lookupService.getAll<ReceiverBank>('receiver-banks').subscribe({
      next: (r) => { this.loadingBanks = false; this.banks = r.filter(b => b.isActive); this.cdr.markForCheck(); },
      error: () => { this.loadingBanks = false; this.error = 'Failed to load Receiver Banks.'; this.cdr.markForCheck(); }
    });

    this.tablePrefs.get('payBankDues').subscribe({
      next: (pref) => {
        if (pref) { this.sortColumn = pref.sortColumn as SortColumn; this.sortAsc = pref.sortAsc; }
        this.loadAll();
      },
      error: () => this.loadAll()
    });
    this.tablePrefs.getColumnOrder('payBankDues').subscribe({
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
    this.tablePrefs.saveColumnOrder('payBankDues', cols.map((c) => c.key)).subscribe();
  }

  loadAll(): void {
    this.loadingAll = true;
    this.service.getAllDues(this.showSettled).subscribe({
      next: (r) => { this.loadingAll = false; this.allDues = r; this.cdr.markForCheck(); },
      error: () => { this.loadingAll = false; this.error = 'Failed to load dues.'; this.cdr.markForCheck(); }
    });
  }

  toggleShowSettled(): void {
    this.showSettled = !this.showSettled;
    this.loadAll();
  }

  sortBy(column: SortColumn): void {
    if (this.sortColumn === column) { this.sortAsc = !this.sortAsc; }
    else { this.sortColumn = column; this.sortAsc = true; }
    this.tablePrefs.save('payBankDues', this.sortColumn, this.sortAsc).subscribe();
  }

  private ensureFilterKey(key: string): void {
    if (!this.filters[key]) this.filters[key] = new Set();
  }

  getValue(row: PayableDueRow, col: string): string {
    return String((row as any)[col] ?? '');
  }

  optionsFor(col: string): string[] {
    this.ensureFilterKey(col);
    return columnOptions(this.allDues, this.filters, col, (r, c) => this.getValue(r, c));
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

  get rows(): PayableDueRow[] {
    let filtered = applyFilters(this.allDues, this.filters, (r, col) => this.getValue(r, col));
    const dir = this.sortAsc ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[this.sortColumn] as any;
      const bv = b[this.sortColumn] as any;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }

  // Jump from the landing view straight into filtered mode, pre-picking
  // the bank a row belongs to — saves re-selecting from scratch.
  startFilteringFrom(row: PayableDueRow): void {
    this.filtering = true;
    this.selectedBankId = row.receiverBankId;
    this.onReceiverBankChange();
  }

  startFiltering(): void {
    this.filtering = true;
  }

  backToAll(): void {
    this.filtering = false;
    this.selectedBankId = null;
    this.selectedBank = null;
    this.selectedSenderBankId = null;
    this.selectedAccountId = null;
    this.senderBanks = [];
    this.dues = [];
    this.resetSelections();
    this.loadAll();
  }

  onReceiverBankChange(): void {
    this.selectedBank = this.banks.find(b => b.id === this.selectedBankId) ?? null;
    this.selectedSenderBankId = null;
    this.selectedAccountId = null;
    this.senderBanks = [];
    this.dues = [];
    this.resetSelections();

    if (this.selectedBankId === null) return;
    this.service.getSenderBanks(this.selectedBankId).subscribe({
      next: (r) => { this.senderBanks = r; this.cdr.markForCheck(); },
      error: () => { this.error = 'Failed to load Sender Banks for this Receiver Bank.'; this.cdr.markForCheck(); }
    });
  }

  onSenderBankChange(): void {
    this.dues = [];
    this.resetSelections();
    if (this.selectedBankId === null || this.selectedSenderBankId === null) return;

    this.loadingDues = true;
    this.service.getDues(this.selectedBankId, this.selectedSenderBankId, this.showSettled).subscribe({
      next: (r) => { this.loadingDues = false; this.dues = r; this.cdr.markForCheck(); },
      error: () => { this.loadingDues = false; this.error = 'Failed to load outstanding dues.'; this.cdr.markForCheck(); }
    });
  }

  resetSelections(): void {
    this.selected = {};
    this.amountText = {};
  }

  private parseAmount(text: string | undefined): number {
    if (!text) return 0;
    const n = parseFloat(text.replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
  }

  amountFor(shipmentId: number): number {
    return this.parseAmount(this.amountText[shipmentId]);
  }

  onAmountInput(row: PayableDueRow, raw: string): void {
    const numeric = this.parseAmount(raw);
    this.amountText[row.shipmentId] = numeric > 0 ? numeric.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : raw;
  }

  toggleSelect(row: PayableDueRow): void {
    this.selected[row.shipmentId] = !this.selected[row.shipmentId];
    if (this.selected[row.shipmentId] && !this.amountText[row.shipmentId]) {
      this.amountText[row.shipmentId] = row.remainingAed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  }

  subtotal(): number {
    return this.dues
      .filter(r => this.selected[r.shipmentId])
      .reduce((sum, r) => sum + this.amountFor(r.shipmentId), 0);
  }

  selectedCount(): number {
    return Object.values(this.selected).filter(Boolean).length;
  }

  canConfirm(): boolean {
    return this.selectedAccountId !== null && this.selectedCount() > 0 &&
      this.dues.filter(r => this.selected[r.shipmentId]).every(r => this.amountFor(r.shipmentId) > 0 && this.amountFor(r.shipmentId) <= r.remainingAed + 0.01);
  }

  startConfirm(): void {
    if (!this.canConfirm()) return;
    this.confirming = true;
  }

  cancelConfirm(): void {
    this.confirming = false;
  }

  submit(): void {
    if (this.selectedBankId === null || this.selectedSenderBankId === null || this.selectedAccountId === null) return;

    const lines = this.dues
      .filter(r => this.selected[r.shipmentId])
      .map(r => ({ shipmentId: r.shipmentId, paymentAmountAed: this.amountFor(r.shipmentId) }));

    this.confirming = false;
    this.submitting = true;
    this.submitError = '';

    this.service.confirm(this.selectedBankId, this.selectedSenderBankId, this.selectedAccountId, lines).subscribe({
      next: (response) => {
        this.submitting = false;
        this.done = true;

        const blob = response.body!;
        const disposition = response.headers.get('content-disposition') ?? '';
        const match = disposition.match(/filename="?([^"]+)"?/);
        const fileName = match ? match[1] : 'Settlement_Letter.docx';

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.submitting = false;
        this.submitError = err?.error?.message ?? 'Failed to confirm settlement.';
        this.cdr.markForCheck();
      }
    });
  }

  startNew(): void {
    this.done = false;
    this.submitError = '';
    this.backToAll();
  }
}
