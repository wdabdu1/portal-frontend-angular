import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LookupEntity, SettingsLookupService } from '../settings-lookup.service';
import { ReceiverBankAccount, ReceiverBankAccountsService } from '../receiver-bank-accounts.service';

interface ReceiverBank extends LookupEntity {
  name: string;
  bankChargeRate: number;
  imChargeRate: number;
  totalChargeRate: number;
  isActive: boolean;
  address: string | null;
  accounts: ReceiverBankAccount[];
}

@Component({
  selector: 'app-receiver-banks',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './receiver-banks.html'
})
export class ReceiverBanks implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  banks: ReceiverBank[] = [];
  loading = true;
  error = '';

  editingId: number | null = null;
  editDraft: Partial<ReceiverBank> = {};

  creating = false;
  newBank: Partial<ReceiverBank> = { name: '', bankChargeRate: 0, imChargeRate: 0, isActive: true, address: '' };

  expandedBankId: number | null = null;
  newAccount: Record<number, { accountNo: string; accountName: string }> = {};
  editingAccountId: number | null = null;
  editAccountDraft: { accountNo: string; accountName: string } = { accountNo: '', accountName: '' };

  constructor(private lookupService: SettingsLookupService, private accountsService: ReceiverBankAccountsService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.lookupService.getAll<ReceiverBank>('receiver-banks').subscribe({
      next: (r) => { this.loading = false; this.banks = r; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.error = 'Failed to load Receiver Banks.'; this.cdr.markForCheck(); }
    });
  }

  startEdit(bank: ReceiverBank): void {
    this.editingId = bank.id;
    this.editDraft = { ...bank };
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editDraft = {};
  }

  saveEdit(): void {
    if (this.editingId === null) return;
    this.lookupService.update('receiver-banks', this.editingId, this.editDraft).subscribe({
      next: () => { this.editingId = null; this.load(); },
      error: () => { this.error = 'Failed to save changes.'; this.cdr.markForCheck(); }
    });
  }

  startCreate(): void {
    this.creating = true;
    this.newBank = { name: '', bankChargeRate: 0, imChargeRate: 0, isActive: true, address: '' };
  }

  cancelCreate(): void {
    this.creating = false;
  }

  saveCreate(): void {
    this.lookupService.create('receiver-banks', this.newBank).subscribe({
      next: () => { this.creating = false; this.load(); },
      error: () => { this.error = 'Failed to create Receiver Bank.'; this.cdr.markForCheck(); }
    });
  }

  toggleAccounts(bank: ReceiverBank): void {
    this.expandedBankId = this.expandedBankId === bank.id ? null : bank.id;
    if (this.expandedBankId !== null && !this.newAccount[bank.id]) {
      this.newAccount[bank.id] = { accountNo: '', accountName: '' };
    }
  }

  addAccount(bank: ReceiverBank): void {
    const draft = this.newAccount[bank.id];
    if (!draft?.accountNo || !draft?.accountName) return;
    this.accountsService.create(bank.id, { ...draft, isActive: true }).subscribe({
      next: () => { this.newAccount[bank.id] = { accountNo: '', accountName: '' }; this.load(); },
      error: () => { this.error = 'Failed to add account.'; this.cdr.markForCheck(); }
    });
  }

  startEditAccount(account: ReceiverBankAccount): void {
    this.editingAccountId = account.id;
    this.editAccountDraft = { accountNo: account.accountNo, accountName: account.accountName };
  }

  cancelEditAccount(): void {
    this.editingAccountId = null;
  }

  saveEditAccount(bank: ReceiverBank): void {
    if (this.editingAccountId === null) return;
    this.accountsService.update(bank.id, this.editingAccountId, { ...this.editAccountDraft, isActive: true }).subscribe({
      next: () => { this.editingAccountId = null; this.load(); },
      error: () => { this.error = 'Failed to save account.'; this.cdr.markForCheck(); }
    });
  }

  removeAccount(bank: ReceiverBank, account: ReceiverBankAccount): void {
    this.accountsService.delete(bank.id, account.id).subscribe({
      next: () => this.load(),
      error: () => { this.error = 'Failed to remove account.'; this.cdr.markForCheck(); }
    });
  }
}
