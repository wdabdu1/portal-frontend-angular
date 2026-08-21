import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LookupEntity, SettingsLookupService } from '../settings/settings-lookup.service';
import { ReceiverBankAccount } from '../settings/receiver-bank-accounts.service';
import { PayableDueRow, PayBankDuesService, SenderBankOption } from './pay-bank-dues.service';

interface ReceiverBank extends LookupEntity {
  name: string;
  address: string | null;
  accounts: ReceiverBankAccount[];
}

type SortKey = 'dueDate' | 'cbosDueDate' | 'blAwbNo' | 'remainingAed';

@Component({
  selector: 'app-pay-bank-dues',
  imports: [CommonModule, FormsModule],
  templateUrl: './pay-bank-dues.html'
})
export class PayBankDues implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  banks: ReceiverBank[] = [];
  loadingBanks = true;

  // Initial, unfiltered landing view
  allDues: PayableDueRow[] = [];
  loadingAll = true;
  showSettled = false;
  sortKey: SortKey = 'dueDate';
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

  constructor(private lookupService: SettingsLookupService, private service: PayBankDuesService) {}

  ngOnInit(): void {
    this.lookupService.getAll<ReceiverBank>('receiver-banks').subscribe({
      next: (r) => { this.loadingBanks = false; this.banks = r.filter(b => b.isActive); this.cdr.markForCheck(); },
      error: () => { this.loadingBanks = false; this.error = 'Failed to load Receiver Banks.'; this.cdr.markForCheck(); }
    });
    this.loadAll();
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

  setSort(key: SortKey): void {
    if (this.sortKey === key) { this.sortAsc = !this.sortAsc; }
    else { this.sortKey = key; this.sortAsc = true; }
  }

  sortedAllDues(): PayableDueRow[] {
    const dir = this.sortAsc ? 1 : -1;
    return [...this.allDues].sort((a, b) => {
      const av = a[this.sortKey] as any;
      const bv = b[this.sortKey] as any;
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return av > bv ? dir : av < bv ? -dir : 0;
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

  // Comma-formatted amount handling — stored as text, parsed to a number
  // only when needed, to avoid fat-finger errors on large values.
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
