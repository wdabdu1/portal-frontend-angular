import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { ThousandsInputDirective } from '../../shared/thousands-input.directive';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { OrderDetailsService, PoPaymentItem, PoPaymentsSummary, PurchaseOrderDetail } from './order-details.service';

@Component({
  selector: 'app-order-details',
  imports: [CommonModule, RouterLink, FormsModule, ThousandsInputDirective],
  templateUrl: './order-details.html'
})
export class OrderDetails implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private lookups = inject(SettingsLookupService);
  private orderId = 0;

  order: PurchaseOrderDetail | null = null;
  loading = true;
  error = '';

  // Payments against the whole PO (advance, pre-dispatch balance, ...).
  // Entered BY VALUE in a chosen currency (defaults to the PO's own);
  // the % of the order is calculated by the server and shown read-only.
  payments: PoPaymentsSummary | null = null;
  currencies: LookupEntity[] = [];
  formOpen = false;
  editingPaymentId: number | null = null;
  saving = false;
  payError = '';
  form = this.blankForm();

  // Role check mirrors the backend OrdersShipmentsEditors policy.
  get canEditPayments(): boolean {
    return this.auth.hasAnyRole(['IP_User', 'IP_Supervisor', 'SuperUser']);
  }

  constructor(private service: OrderDetailsService, public auth: AuthService) {}

  ngOnInit(): void {
    this.orderId = Number(this.route.snapshot.paramMap.get('id'));
    this.lookups.getAll<LookupEntity>('currencies').subscribe({ next: (r) => { this.currencies = r; this.cdr.markForCheck(); } });
    this.load();
  }

  private blankForm() {
    return { description: '', amount: null as number | null, currencyId: 0, plannedDate: '', executedDate: '', note: '' };
  }

  load(): void {
    this.service.get(this.orderId).subscribe({
      next: (r) => { this.order = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load order details.'; this.loading = false; this.cdr.markForCheck(); }
    });
    this.loadPayments();
  }

  private loadPayments(): void {
    this.service.getPayments(this.orderId).subscribe({
      next: (p) => { this.payments = p; this.cdr.markForCheck(); },
      error: () => { this.payments = null; this.cdr.markForCheck(); }
    });
  }

  // Currency shown next to "PO total" etc. A mixed-currency PO is totalled in USD.
  get poCurrencyLabel(): string {
    if (!this.payments) return '';
    return this.payments.isMixedCurrency ? 'USD' : this.payments.defaultCurrencyCode;
  }

  get poTotalDisplay(): number {
    if (!this.payments) return 0;
    return this.payments.isMixedCurrency ? this.payments.poTotalUsd : this.payments.poTotalNative;
  }

  get formCurrencyCode(): string {
    return (this.currencies.find((c) => c['id'] === Number(this.form.currencyId))?.['code'] as string | undefined) ?? '';
  }

  // Live preview of the % this value represents (the server recalculates on save).
  get previewPercent(): number | null {
    if (!this.payments || !this.form.amount || this.form.amount <= 0) return null;
    const p = this.payments;
    const sameAsPo = !p.isMixedCurrency && Number(this.form.currencyId) === p.defaultCurrencyId;
    if (sameAsPo) return p.poTotalNative > 0 ? (this.form.amount / p.poTotalNative) * 100 : null;
    return null; // other currency: the server converts at the current FX rate
  }

  get previewTotalPercent(): number | null {
    const pv = this.previewPercent;
    if (pv === null || !this.payments) return null;
    const others = this.payments.items.filter((i) => i.id !== this.editingPaymentId).reduce((a, i) => a + i.percent, 0);
    return others + pv;
  }

  startAdd(): void {
    this.editingPaymentId = null;
    this.form = this.blankForm();
    this.form.currencyId = this.payments?.defaultCurrencyId ?? 0;
    this.form.description = (this.payments?.items.length ?? 0) === 0 ? 'Advance' : `Payment ${(this.payments?.items.length ?? 0) + 1}`;
    this.payError = '';
    this.formOpen = true;
  }

  startEdit(p: PoPaymentItem): void {
    this.editingPaymentId = p.id;
    this.form = {
      description: p.description,
      amount: p.amount,
      currencyId: p.currencyId,
      plannedDate: p.plannedDate ?? '',
      executedDate: p.executedDate ?? '',
      note: p.note ?? ''
    };
    this.payError = '';
    this.formOpen = true;
  }

  cancelForm(): void {
    this.formOpen = false;
    this.editingPaymentId = null;
    this.payError = '';
  }

  save(): void {
    if (!this.form.amount || this.form.amount <= 0) { this.payError = 'Enter the payment amount.'; return; }
    if (!this.form.currencyId) { this.payError = 'Choose the currency of the amount.'; return; }
    if (!this.form.plannedDate && !this.form.executedDate) { this.payError = 'Enter a planned date (and the actual execution date once paid).'; return; }

    const req = {
      description: this.form.description.trim() || null,
      amount: this.form.amount,
      currencyId: Number(this.form.currencyId),
      plannedDate: this.form.plannedDate || null,
      executedDate: this.form.executedDate || null,
      note: this.form.note.trim() || null
    };
    this.saving = true;
    this.payError = '';
    const call = this.editingPaymentId === null
      ? this.service.addPayment(this.orderId, req)
      : this.service.updatePayment(this.orderId, this.editingPaymentId, req);
    call.subscribe({
      next: (p) => { this.payments = p; this.saving = false; this.formOpen = false; this.editingPaymentId = null; this.cdr.markForCheck(); },
      error: (e) => {
        this.saving = false;
        this.payError = e?.error?.message ?? 'Could not save. Only order editors can update payments.';
        this.cdr.markForCheck();
      }
    });
  }

  remove(p: PoPaymentItem): void {
    if (!confirm(`Delete payment "${p.description}"? Its lines will be removed from every linked shipment's Payment Due Schedule.`)) return;
    this.service.deletePayment(this.orderId, p.id).subscribe({
      next: (r) => { this.payments = r; this.payError = ''; this.cdr.markForCheck(); },
      error: (e) => { this.payError = e?.error?.message ?? 'Could not delete this payment.'; this.cdr.markForCheck(); }
    });
  }
}
