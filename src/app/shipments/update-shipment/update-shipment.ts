import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { ThousandsInputDirective } from '../../shared/thousands-input.directive';
import { SectionLockBadge } from '../../section-lock/section-lock-badge';
import { SectionLockInfo, SectionLockService } from '../../section-lock/section-lock.service';
import { ShipmentInfoPanel } from '../../shared/shipment-info-panel/shipment-info-panel';
import { ErpColumn, LastOffshoreDetails, PaymentDue, ShipmentDetail, SupplierInvoiceSummary, UpdateShipmentService } from './update-shipment.service';

type SectionKey = 'orderExecution' | 'shipOnBoard' | 'forwarder' | 'acd' | 'draftDocuments' | 'ssmo' | 'mot' | 'supplierFullSet' | 'paymentDue' | 'banking' | 'erpInfo' | 'lastOffshore';

@Component({
  selector: 'app-update-shipment',
  imports: [CommonModule, FormsModule, ThousandsInputDirective, RouterLink, SectionLockBadge, ShipmentInfoPanel],
  templateUrl: './update-shipment.html'
})
export class UpdateShipment implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  shipmentId!: number;
  detail: ShipmentDetail | null = null;
  loading = true;
  error = '';

  forwarders: LookupEntity[] = [];
  currencies: LookupEntity[] = [];
  couriers: LookupEntity[] = [];
  senderBanks: LookupEntity[] = [];
  receiverBanks: LookupEntity[] = [];
  tenors: LookupEntity[] = [];

  sectionOrder: SectionKey[] = ['orderExecution', 'shipOnBoard', 'acd', 'forwarder', 'draftDocuments', 'ssmo', 'mot', 'supplierFullSet', 'paymentDue', 'erpInfo', 'banking', 'lastOffshore'];
  expandedSection: SectionKey | null = 'shipOnBoard';
  saving: Record<SectionKey, boolean> = {
    orderExecution: false, shipOnBoard: false, forwarder: false, acd: false, draftDocuments: false, ssmo: false, mot: false, supplierFullSet: false, paymentDue: false, banking: false, erpInfo: false, lastOffshore: false
  };

  erpColumns: ErpColumn[] = [];
  erpForms: Record<number, { prNo: string; poNo: string; sa: string; billReg: string; grn: string; invoiceNo: string; inspectionNo: string; remarks: string }> = {};
  savingErpColumn: Record<number, boolean> = {};
  loadingErpInfo = false;

  locks: Record<string, SectionLockInfo | null> = {};

  loadLocks(): void {
    this.lockService.getLocks('Shipment', this.shipmentId).subscribe({
      next: (list) => {
        this.locks = {};
        for (const l of list) this.locks[l.sectionKey] = l;
        this.cdr.markForCheck();
      }
    });
  }

  isLocked(key: string): boolean {
    return !!this.locks[key];
  }

  shipOnBoardForm = { sobActualDate: '' };
  confirming = false;

  forwarderForm = { forwarderId: null as number | null, actualShippingCost: null as number | null, currencyId: null as number | null, amountSaved: null as number | null, marineInsurance: false };
  acdForm = { processDate: '', costSettledDate: '', refNumber: '' };
  lastOffshoreData: LastOffshoreDetails | null = null;
  lastOffshoreForm = { currencyId: null as number | null };
  lastOffshoreItemEdits: Record<number, { hsCode: string; description: string; unitPrice: number | null }> = {};
  loadingLastOffshore = false;
  savingLastOffshore = false;
  lastOffshoreError = '';
  savingHsCodes = false;
  draftDocumentsForm = { initialDraftReceivedDate: '', finalDraftReceivedDate: '', finalDraftConfirmedDate: '' };
  ssmoForm = { cocRequired: null as boolean | null, cocAvailable: null as boolean | null, applicationDate: '', cost: null as number | null, costSettledDate: '', refNumber: '', approvalDate: '' };
  motForm = { processDate: '', cost: null as number | null, costSettledDate: '', refNumber: '', approvalDate: '', offshoreApprovedPiNumber: '' };
  supplierFullSetForm = { supplierInvoiceNo: '', supplierInvoiceDate: '', fsDispatchDate: '', fsDispatchedViaId: null as number | null, fsTrackingNumber: '', fsReceivedDate: '' };
  bankingForm = {
    senderBankId: null as number | null, osDocDispatchDate: '', osDocDispatchedViaId: null as number | null, osDocTrackingNumber: '',
    receivingBankId: null as number | null, necessaryGoodType: false, collectionRefNo: '', collectionValue: null as number | null, collectionCurrencyId: null as number | null,
    tenorId: null as number | null, addCbosAllowanceId: null as number | null
  };

  constructor(private lookups: SettingsLookupService, private service: UpdateShipmentService, private lockService: SectionLockService) {}

  ngOnInit(): void {
    this.shipmentId = Number(this.route.snapshot.paramMap.get('id'));

    this.lookups.getAll<LookupEntity>('forwarders').subscribe({ next: (r) => { this.forwarders = r; this.cdr.markForCheck(); } });
    this.lookups.getAll<LookupEntity>('currencies').subscribe({ next: (r) => { this.currencies = r; this.cdr.markForCheck(); } });
    this.lookups.getAll<LookupEntity>('couriers').subscribe({ next: (r) => { this.couriers = r; this.cdr.markForCheck(); } });
    this.lookups.getAll<LookupEntity>('sender-banks').subscribe({ next: (r) => { this.senderBanks = r; this.cdr.markForCheck(); } });
    this.lookups.getAll<LookupEntity>('receiver-banks').subscribe({ next: (r) => { this.receiverBanks = r; this.cdr.markForCheck(); } });
    this.lookups.getAll<LookupEntity>('tenors').subscribe({ next: (r) => { this.tenors = r; this.cdr.markForCheck(); } });

    this.loadDetail();
    this.loadLocks();
    this.loadPaymentDues();
    this.loadInvoiceSummary();
  }

  loadDetail(): void {
    this.service.getDetail(this.shipmentId).subscribe({
      next: (detail) => {
        this.detail = detail;

        if (detail.forwarder) this.forwarderForm = { ...detail.forwarder };
        if (detail.acd) this.acdForm = { processDate: detail.acd.processDate ?? '', costSettledDate: detail.acd.costSettledDate ?? '', refNumber: detail.acd.refNumber ?? '' };
        if (detail.draftDocuments) this.draftDocumentsForm = {
          initialDraftReceivedDate: detail.draftDocuments.initialDraftReceivedDate ?? '',
          finalDraftReceivedDate: detail.draftDocuments.finalDraftReceivedDate ?? '',
          finalDraftConfirmedDate: detail.draftDocuments.finalDraftConfirmedDate ?? ''
        };
        if (detail.ssmo) this.ssmoForm = { cocRequired: detail.ssmo.cocRequired ?? null, cocAvailable: detail.ssmo.cocAvailable ?? null, applicationDate: detail.ssmo.applicationDate ?? '', cost: detail.ssmo.cost, costSettledDate: detail.ssmo.costSettledDate ?? '', refNumber: detail.ssmo.refNumber ?? '', approvalDate: detail.ssmo.approvalDate ?? '' };
        if (detail.mot) this.motForm = {
          processDate: detail.mot.processDate ?? '', cost: detail.mot.cost, costSettledDate: detail.mot.costSettledDate ?? '', refNumber: detail.mot.refNumber ?? '',
          approvalDate: detail.mot.approvalDate ?? '', offshoreApprovedPiNumber: detail.mot.offshoreApprovedPiNumber ?? ''
        };
        if (detail.supplierFullSet) this.supplierFullSetForm = {
          supplierInvoiceNo: detail.supplierFullSet.supplierInvoiceNo ?? '', supplierInvoiceDate: detail.supplierFullSet.supplierInvoiceDate ?? '',
          fsDispatchDate: detail.supplierFullSet.fsDispatchDate ?? '', fsDispatchedViaId: detail.supplierFullSet.fsDispatchedViaId,
          fsTrackingNumber: detail.supplierFullSet.fsTrackingNumber ?? '', fsReceivedDate: detail.supplierFullSet.fsReceivedDate ?? ''
        };
        this.shipOnBoardForm = { sobActualDate: detail.sobActualDate ?? '' };
        if (detail.banking) this.bankingForm = {
          senderBankId: detail.banking.senderBankId, osDocDispatchDate: detail.banking.osDocDispatchDate ?? '', osDocDispatchedViaId: detail.banking.osDocDispatchedViaId,
          osDocTrackingNumber: detail.banking.osDocTrackingNumber ?? '', receivingBankId: detail.banking.receivingBankId, necessaryGoodType: detail.banking.necessaryGoodType,
          collectionRefNo: detail.banking.collectionRefNo ?? '', collectionValue: detail.banking.collectionValue, collectionCurrencyId: detail.banking.collectionCurrencyId,
          tenorId: detail.banking.tenorId, addCbosAllowanceId: detail.banking.addCbosAllowanceId
        };

        this.loading = false;
        this.loadErpInfo();
        this.loadLastOffshoreDetails();
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Could not load shipment.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // Every offshore now shows in this one section (including the last),
  // each showing only the fields relevant to its actual position(s).
  get allOffshoreColumns(): ErpColumn[] {
    return this.erpColumns;
  }

  get lastOffshoreCompanyName(): string {
    return this.erpColumns.find((c) => c.isLast)?.companyName ?? 'Last Offshore';
  }

  invoiceSummary: SupplierInvoiceSummary | null = null;

  loadInvoiceSummary(): void {
    this.service.getSupplierInvoiceSummary(this.shipmentId).subscribe({
      next: (r) => { this.invoiceSummary = r; this.cdr.markForCheck(); },
      error: () => {}
    });
  }

  // --- Payment Due Schedule ---
  paymentDues: PaymentDue[] = [];
  loadingPaymentDues = true;
  newDueForm = { dueDate: '', amount: null as number | null, currencyId: null as number | null, label: '' };
  addingDue = false;
  editingDueId: number | null = null;
  editDueForm = { dueDate: '', amount: null as number | null, currencyId: null as number | null, label: '' };
  savingDueId: number | null = null;
  deletingDueId: number | null = null;

  loadPaymentDues(): void {
    this.loadingPaymentDues = true;
    this.service.getPaymentDues(this.shipmentId).subscribe({
      next: (r) => { this.paymentDues = r; this.loadingPaymentDues = false; this.cdr.markForCheck(); },
      error: () => { this.loadingPaymentDues = false; this.cdr.markForCheck(); }
    });
  }

  addPaymentDue(): void {
    if (!this.newDueForm.dueDate || !this.newDueForm.amount || !this.newDueForm.currencyId) return;
    this.addingDue = true;
    this.service.addPaymentDue(this.shipmentId, {
      dueDate: this.newDueForm.dueDate, amount: this.newDueForm.amount, currencyId: this.newDueForm.currencyId, label: this.newDueForm.label || null
    }).subscribe({
      next: () => {
        this.addingDue = false;
        this.newDueForm = { dueDate: '', amount: null, currencyId: null, label: '' };
        this.loadPaymentDues();
      },
      error: () => { this.addingDue = false; this.error = 'Could not add payment due.'; this.cdr.markForCheck(); }
    });
  }

  startEditDue(due: PaymentDue): void {
    this.editingDueId = due.id;
    this.editDueForm = { dueDate: due.dueDate, amount: due.amount, currencyId: due.currencyId, label: due.label || '' };
  }

  cancelEditDue(): void {
    this.editingDueId = null;
  }

  saveEditDue(dueId: number): void {
    if (!this.editDueForm.dueDate || !this.editDueForm.amount || !this.editDueForm.currencyId) return;
    this.savingDueId = dueId;
    this.service.updatePaymentDue(this.shipmentId, dueId, {
      dueDate: this.editDueForm.dueDate, amount: this.editDueForm.amount, currencyId: this.editDueForm.currencyId, label: this.editDueForm.label || null
    }).subscribe({
      next: () => {
        this.savingDueId = null;
        this.editingDueId = null;
        this.loadPaymentDues();
      },
      error: () => { this.savingDueId = null; this.error = 'Could not save payment due.'; this.cdr.markForCheck(); }
    });
  }

  deletePaymentDue(dueId: number): void {
    this.deletingDueId = dueId;
    this.service.deletePaymentDue(this.shipmentId, dueId).subscribe({
      next: () => { this.deletingDueId = null; this.loadPaymentDues(); },
      error: () => { this.deletingDueId = null; this.error = 'Could not delete payment due.'; this.cdr.markForCheck(); }
    });
  }

  dueStatus(due: PaymentDue): 'Unpaid' | 'Partial' | 'Paid' {
    if (due.paidUsd <= 0) return 'Unpaid';
    if (due.paidUsd >= due.amountUsd) return 'Paid';
    return 'Partial';
  }

  get totalDueUsd(): number {
    return this.paymentDues.reduce((sum, d) => sum + d.amountUsd, 0);
  }

  // Compared in USD so mixed-currency due rows still total correctly
  // against the shipment's own (converted) invoice value.
  get dueScheduleExceedsShipmentValue(): boolean {
    if (!this.invoiceSummary) return false;
    return this.totalDueUsd > this.invoiceSummary.invoiceValueUsd + 0.01;
  }

  loadLastOffshoreDetails(): void {
    this.loadingLastOffshore = true;
    this.service.getLastOffshoreDetails(this.shipmentId).subscribe({
      next: (d) => {
        this.lastOffshoreData = d;
        this.lastOffshoreForm = { currencyId: d.currencyId };
        this.lastOffshoreItemEdits = {};
        for (const item of d.items) {
          this.lastOffshoreItemEdits[item.shipmentLineItemId] = {
            hsCode: item.hsCode ?? '', description: item.description ?? '', unitPrice: item.unitPrice
          };
        }
        this.loadingLastOffshore = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loadingLastOffshore = false; this.error = 'Could not load Last Offshore Details.'; this.cdr.markForCheck(); }
    });
  }

  // Live total from what's actually typed, not the stale server value —
  // so it updates instantly as the user types, rather than only after
  // a save-and-reload round trip.
  liveLastOffshoreTotal(): number {
    if (!this.lastOffshoreData) return 0;
    return this.lastOffshoreData.items.reduce((sum, item) => {
      const edit = this.lastOffshoreItemEdits[item.shipmentLineItemId];
      const price = edit?.unitPrice ?? 0;
      return sum + (price * item.qty);
    }, 0);
  }

  saveLastOffshoreDetails(): void {
    this.lastOffshoreError = '';

    // A price entered with no Currency selected saves silently but never
    // shows up in Transfer Pricing — block it here instead, with a clear
    // reason, rather than letting it fail invisibly downstream.
    const hasAnyPrice = Object.values(this.lastOffshoreItemEdits).some(e => e.unitPrice !== null && e.unitPrice > 0);
    if (hasAnyPrice && !this.lastOffshoreForm.currencyId) {
      this.lastOffshoreError = 'Please select a Currency before saving — a Unit Price without a Currency won\'t appear in Transfer Pricing.';
      this.cdr.markForCheck();
      return;
    }

    this.savingLastOffshore = true;
    const items = Object.entries(this.lastOffshoreItemEdits).map(([lineItemId, edit]) => ({
      shipmentLineItemId: Number(lineItemId),
      hsCode: edit.hsCode || null,
      description: edit.description || null,
      unitPrice: edit.unitPrice
    }));
    this.service.saveLastOffshoreDetails(this.shipmentId, {
      // Inspection No./GRN/Invoice No./Remarks now live in Offshore
      // Routes' own Last column — not sent from here, so this save
      // can't silently overwrite that with a stale/blank value.
      inspectionNo: null,
      grn: null,
      invoiceNo: null,
      remarks: null,
      currencyId: this.lastOffshoreForm.currencyId,
      items
    }).subscribe({
      next: () => {
        this.savingLastOffshore = false;
        this.loadLastOffshoreDetails();
        this.cdr.markForCheck();
      },
      error: () => { this.savingLastOffshore = false; this.lastOffshoreError = 'Could not save Last Offshore Details.'; this.cdr.markForCheck(); }
    });
  }

  sectionStatus(key: SectionKey): 'Not Started' | 'Saved' {
    if (!this.detail) return 'Not Started';
    if (key === 'shipOnBoard') return this.detail.sobActualDate ? 'Saved' : 'Not Started';
    if (key === 'erpInfo') return this.erpColumns.some((c) => this.hasAnyValue(c)) ? 'Saved' : 'Not Started';
    return (this.detail as any)[key] ? 'Saved' : 'Not Started';
  }

  private hasAnyValue(c: ErpColumn): boolean {
    return !!(c.prNo || c.poNo || c.sa || c.billReg || c.grn || c.invoiceNo || c.inspectionNo || c.remarks);
  }

  loadErpInfo(): void {
    this.loadingErpInfo = true;
    this.service.getErpColumns(this.shipmentId).subscribe({
      next: (columns) => {
        this.erpColumns = columns;
        this.erpForms = {};
        for (const c of columns) {
          this.erpForms[c.purchaseOrderOffshorePartnerId] = {
            // The first offshore's PO No. always mirrors the order's own
            // Offshore PO No. (set once at order creation) — not a
            // separately-entered value, so it's sourced from there, not
            // from whatever may have been saved on the ERP row before.
            prNo: c.prNo ?? '', poNo: c.sequenceOrder === 1 ? (this.detail?.offshorePoNo ?? '') : (c.poNo ?? ''), sa: c.sa ?? '', billReg: c.billReg ?? '',
            grn: c.grn ?? '', invoiceNo: c.invoiceNo ?? '', inspectionNo: c.inspectionNo ?? '', remarks: c.remarks ?? ''
          };
        }
        this.loadingErpInfo = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loadingErpInfo = false; this.error = 'Could not load ERP Info.'; this.cdr.markForCheck(); }
    });
  }

  saveErpColumn(offshorePartnerId: number, andNext: boolean): void {
    const form = this.erpForms[offshorePartnerId];
    this.savingErpColumn[offshorePartnerId] = true;
    this.service.saveErpColumn(this.shipmentId, offshorePartnerId, {
      prNo: form.prNo || null, poNo: form.poNo || null, sa: form.sa || null, billReg: form.billReg || null,
      grn: form.grn || null, invoiceNo: form.invoiceNo || null, inspectionNo: form.inspectionNo || null, remarks: form.remarks || null
    }).subscribe({
      next: (updated) => {
        this.savingErpColumn[offshorePartnerId] = false;
        const idx = this.erpColumns.findIndex((c) => c.purchaseOrderOffshorePartnerId === offshorePartnerId);
        if (idx >= 0) this.erpColumns[idx] = updated;
        if (andNext) this.goToNext('erpInfo');
        this.cdr.markForCheck();
      },
      error: () => { this.savingErpColumn[offshorePartnerId] = false; this.error = 'Could not save this ERP column.'; this.cdr.markForCheck(); }
    });
  }

  // MOT relates to whichever offshore entity hands off directly to Onshore —
  // i.e. the last one in the chain, regardless of how many offshore hops
  // this particular PO has (1, 2, or more).
  get motRelatedOffshoreName(): string {
    const names = this.detail?.offshorePartnerNames ?? [];
    return names.length > 0 ? names[names.length - 1] : 'Offshore';
  }

  get collectionCurrencyCode(): string {
    const currency = this.currencies.find((c) => c.id === this.bankingForm.collectionCurrencyId);
    return (currency?.['code'] as string) ?? '';
  }

  // Amount Saved is fully derived — Budget vs. the freight cost already
  // converted to USD by the backend — never entered directly, so it can't
  // drift from the two real inputs that actually determine it.
  get amountSaved(): number | null {
    const budget = this.detail?.buShippingBudget;
    const costUsd = this.detail?.forwarder?.actualShippingCostUsd;
    if (budget == null || costUsd == null) return null;
    return budget - costUsd;
  }

  get amountSavedPercentOfBudget(): number | null {
    const budget = this.detail?.buShippingBudget;
    const saved = this.amountSaved;
    if (!budget || saved === null) return null;
    return (saved / budget) * 100;
  }

  toggleSection(key: SectionKey): void {
    this.expandedSection = this.expandedSection === key ? null : key;
  }

  goToNext(current: SectionKey): void {
    const idx = this.sectionOrder.indexOf(current);
    this.expandedSection = this.sectionOrder[idx + 1] ?? null;
    this.cdr.markForCheck();
  }

  private genericSave<K extends SectionKey>(
    key: K,
    save$: () => import('rxjs').Observable<any>,
    andNext: boolean
  ): void {
    this.saving[key] = true;
    save$().subscribe({
      next: (updated) => {
        this.saving[key] = false;
        if (this.detail) this.detail = { ...this.detail, [key]: updated };
        if (andNext) this.goToNext(key);
        this.cdr.markForCheck();
      },
      error: () => {
        this.saving[key] = false;
        this.error = `Could not save this section.`;
        this.cdr.markForCheck();
      }
    });
  }

  saveShipOnBoard(andNext: boolean): void {
    this.saving.shipOnBoard = true;
    this.service.saveShipOnBoard(this.shipmentId, { sobActualDate: this.shipOnBoardForm.sobActualDate || null }).subscribe({
      next: () => {
        this.saving.shipOnBoard = false;
        if (this.detail) this.detail = { ...this.detail, sobActualDate: this.shipOnBoardForm.sobActualDate || null };
        if (andNext) this.goToNext('shipOnBoard');
        this.cdr.markForCheck();
      },
      error: () => { this.saving.shipOnBoard = false; this.error = 'Could not save Ship on Board.'; this.cdr.markForCheck(); }
    });
  }

  saveForwarder(andNext: boolean): void {
    // amountSaved is derived (see the getter above), not entered — never
    // sent as part of the save; the backend computes actualShippingCostUsd
    // from actualShippingCost + currencyId, and Amount Saved is calculated
    // from that plus the order's own BU Shipping Budget.
    const { amountSaved, ...rest } = this.forwarderForm;
    this.genericSave('forwarder', () => this.service.saveForwarder(this.shipmentId, { ...rest, amountSaved: null }), andNext);
  }

  saveAcd(andNext: boolean): void {
    this.genericSave('acd', () => this.service.saveAcd(this.shipmentId, {
      processDate: this.acdForm.processDate || null,
      costSettledDate: this.acdForm.costSettledDate || null, refNumber: this.acdForm.refNumber || null
    }), andNext);
  }

  saveDraftDocuments(andNext: boolean): void {
    this.genericSave('draftDocuments', () => this.service.saveDraftDocuments(this.shipmentId, {
      initialDraftReceivedDate: this.draftDocumentsForm.initialDraftReceivedDate || null,
      finalDraftReceivedDate: this.draftDocumentsForm.finalDraftReceivedDate || null,
      finalDraftConfirmedDate: this.draftDocumentsForm.finalDraftConfirmedDate || null
    }), andNext);
  }

  saveSsmo(andNext: boolean): void {
    this.genericSave('ssmo', () => this.service.saveSsmo(this.shipmentId, {
      applicationDate: this.ssmoForm.applicationDate || null, cost: this.ssmoForm.cost,
      costSettledDate: this.ssmoForm.costSettledDate || null, refNumber: this.ssmoForm.refNumber || null,
      approvalDate: this.ssmoForm.approvalDate || null
    }), andNext);
  }

  saveMot(andNext: boolean): void {
    this.genericSave('mot', () => this.service.saveMot(this.shipmentId, {
      processDate: this.motForm.processDate || null, cost: this.motForm.cost, costSettledDate: this.motForm.costSettledDate || null,
      refNumber: this.motForm.refNumber || null, approvalDate: this.motForm.approvalDate || null,
      offshoreApprovedPiNumber: this.motForm.offshoreApprovedPiNumber || null
    }), andNext);
  }

  saveSupplierFullSet(andNext: boolean): void {
    this.genericSave('supplierFullSet', () => this.service.saveSupplierFullSet(this.shipmentId, {
      supplierInvoiceNo: this.supplierFullSetForm.supplierInvoiceNo || null, supplierInvoiceDate: this.supplierFullSetForm.supplierInvoiceDate || null,
      fsDispatchDate: this.supplierFullSetForm.fsDispatchDate || null, fsDispatchedViaId: this.supplierFullSetForm.fsDispatchedViaId,
      fsTrackingNumber: this.supplierFullSetForm.fsTrackingNumber || null, fsReceivedDate: this.supplierFullSetForm.fsReceivedDate || null
    }), andNext);
  }

  saveBanking(andNext: boolean): void {
    this.genericSave('banking', () => this.service.saveBanking(this.shipmentId, {
      senderBankId: this.bankingForm.senderBankId, osDocDispatchDate: this.bankingForm.osDocDispatchDate || null,
      osDocDispatchedViaId: this.bankingForm.osDocDispatchedViaId, osDocTrackingNumber: this.bankingForm.osDocTrackingNumber || null,
      receivingBankId: this.bankingForm.receivingBankId, necessaryGoodType: this.bankingForm.necessaryGoodType,
      collectionRefNo: this.bankingForm.collectionRefNo || null, collectionValue: this.bankingForm.collectionValue,
      collectionCurrencyId: this.bankingForm.collectionCurrencyId, tenorId: this.bankingForm.tenorId,
      addCbosAllowanceId: this.bankingForm.addCbosAllowanceId
    }), andNext);
  }

  confirmShipment(): void {
    this.confirming = true;
    this.service.confirmShipment(this.shipmentId).subscribe({
      next: () => {
        this.confirming = false;
        this.router.navigate(['/shipments']);
      },
      error: () => {
        this.confirming = false;
        this.error = 'Could not confirm shipment.';
        this.cdr.markForCheck();
      }
    });
  }
}
