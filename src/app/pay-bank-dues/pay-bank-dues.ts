import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LookupEntity, SettingsLookupService } from '../settings/settings-lookup.service';
import { ReceiverBankAccount } from '../settings/receiver-bank-accounts.service';
import { PayableDueRow, PayBankDuesService, SenderBankOption } from './pay-bank-dues.service';

interface ReceiverBank extends LookupEntity {
  name: string;
  address: string | null;
  accounts: ReceiverBankAccount[];
}

@Component({
  selector: 'app-pay-bank-dues',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pay-bank-dues.html'
})
export class PayBankDues implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  banks: ReceiverBank[] = [];
  loadingBanks = true;

  selectedBankId: number | null = null;
  selectedBank: ReceiverBank | null = null;

  senderBanks: SenderBankOption[] = [];
  selectedSenderBankId: number | null = null;

  selectedAccountId: number | null = null;

  dues: PayableDueRow[] = [];
  loadingDues = false;
  error = '';

  // shipmentId -> entered AED amount, only while selected
  selected: Record<number, boolean> = {};
  amounts: Record<number, number> = {};

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
    this.service.getDues(this.selectedBankId, this.selectedSenderBankId).subscribe({
      next: (r) => { this.loadingDues = false; this.dues = r; this.cdr.markForCheck(); },
      error: () => { this.loadingDues = false; this.error = 'Failed to load outstanding dues.'; this.cdr.markForCheck(); }
    });
  }

  resetSelections(): void {
    this.selected = {};
    this.amounts = {};
  }

  toggleSelect(row: PayableDueRow): void {
    this.selected[row.shipmentId] = !this.selected[row.shipmentId];
    if (this.selected[row.shipmentId] && !this.amounts[row.shipmentId]) {
      this.amounts[row.shipmentId] = row.remainingAed;
    }
  }

  subtotal(): number {
    return this.dues
      .filter(r => this.selected[r.shipmentId])
      .reduce((sum, r) => sum + (this.amounts[r.shipmentId] || 0), 0);
  }

  selectedCount(): number {
    return Object.values(this.selected).filter(Boolean).length;
  }

  canConfirm(): boolean {
    return this.selectedAccountId !== null && this.selectedCount() > 0 &&
      this.dues.filter(r => this.selected[r.shipmentId]).every(r => (this.amounts[r.shipmentId] || 0) > 0 && (this.amounts[r.shipmentId] || 0) <= r.remainingAed + 0.01);
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
      .map(r => ({ shipmentId: r.shipmentId, paymentAmountAed: this.amounts[r.shipmentId] }));

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
    this.selectedBankId = null;
    this.selectedBank = null;
    this.selectedSenderBankId = null;
    this.selectedAccountId = null;
    this.senderBanks = [];
    this.dues = [];
    this.resetSelections();
    this.done = false;
    this.submitError = '';
  }
}
