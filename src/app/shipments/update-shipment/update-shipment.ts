import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { ThousandsInputDirective } from '../../shared/thousands-input.directive';
import { ShipmentDetail, UpdateShipmentService } from './update-shipment.service';

type SectionKey = 'forwarder' | 'acd' | 'draftDocuments' | 'ssmo' | 'mot' | 'supplierFullSet' | 'supplierPayment' | 'banking';

@Component({
  selector: 'app-update-shipment',
  imports: [CommonModule, FormsModule, ThousandsInputDirective],
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

  sectionOrder: SectionKey[] = ['forwarder', 'acd', 'draftDocuments', 'ssmo', 'mot', 'supplierFullSet', 'supplierPayment', 'banking'];
  expandedSection: SectionKey | null = 'forwarder';
  saving: Record<SectionKey, boolean> = {
    forwarder: false, acd: false, draftDocuments: false, ssmo: false, mot: false, supplierFullSet: false, supplierPayment: false, banking: false
  };
  confirming = false;

  forwarderForm = { forwarderId: null as number | null, actualShippingCost: null as number | null, currencyId: null as number | null, amountSaved: null as number | null, marineInsurance: false };
  acdForm = { processDate: '', costUsd: null as number | null, costSettledDate: '', refNumber: '' };
  draftDocumentsForm = { initialDraftReceivedDate: '', finalDraftReceivedDate: '', finalDraftConfirmedDate: '' };
  ssmoForm = { applicationDate: '', cost: null as number | null, costSettledDate: '', refNumber: '' };
  motForm = { processDate: '', cost: null as number | null, costSettledDate: '', refNumber: '', offshoreApprovedPiNumber: '', offshoreApprovedPiDate: '' };
  supplierFullSetForm = { supplierInvoiceNo: '', supplierInvoiceDate: '', fsDispatchDate: '', fsDispatchedViaId: null as number | null, fsTrackingNumber: '', fsReceivedDate: '' };
  supplierPaymentForm = {
    currencyId: null as number | null,
    advanceValue: null as number | null, advanceDueDate: '', advanceActualPaymentDate: '',
    remainingValue: null as number | null, remainingDueDate: '', remainingActualPaymentDate: '',
    remarks: ''
  };  bankingForm = {
    senderBankId: null as number | null, osDocDispatchDate: '', osDocDispatchedViaId: null as number | null, osDocTrackingNumber: '',
    receivingBankId: null as number | null, necessaryGoodType: false, collectionRefNo: '', collectionValue: null as number | null, collectionCurrencyId: null as number | null,
    tenorId: null as number | null, collectionDueDate: '', collectionAmountSettled: null as number | null, imFormNo: '', imFormDate: ''
  };

  constructor(private lookups: SettingsLookupService, private service: UpdateShipmentService) {}

  ngOnInit(): void {
    this.shipmentId = Number(this.route.snapshot.paramMap.get('id'));

    this.lookups.getAll<LookupEntity>('forwarders').subscribe({ next: (r) => { this.forwarders = r; this.cdr.markForCheck(); } });
    this.lookups.getAll<LookupEntity>('currencies').subscribe({ next: (r) => { this.currencies = r; this.cdr.markForCheck(); } });
    this.lookups.getAll<LookupEntity>('couriers').subscribe({ next: (r) => { this.couriers = r; this.cdr.markForCheck(); } });
    this.lookups.getAll<LookupEntity>('sender-banks').subscribe({ next: (r) => { this.senderBanks = r; this.cdr.markForCheck(); } });
    this.lookups.getAll<LookupEntity>('receiver-banks').subscribe({ next: (r) => { this.receiverBanks = r; this.cdr.markForCheck(); } });
    this.lookups.getAll<LookupEntity>('tenors').subscribe({ next: (r) => { this.tenors = r; this.cdr.markForCheck(); } });

    this.loadDetail();
  }

  loadDetail(): void {
    this.service.getDetail(this.shipmentId).subscribe({
      next: (detail) => {
        this.detail = detail;

        if (detail.forwarder) this.forwarderForm = { ...detail.forwarder };
        if (detail.acd) this.acdForm = { processDate: detail.acd.processDate ?? '', costUsd: detail.acd.costUsd, costSettledDate: detail.acd.costSettledDate ?? '', refNumber: detail.acd.refNumber ?? '' };
        if (detail.draftDocuments) this.draftDocumentsForm = {
          initialDraftReceivedDate: detail.draftDocuments.initialDraftReceivedDate ?? '',
          finalDraftReceivedDate: detail.draftDocuments.finalDraftReceivedDate ?? '',
          finalDraftConfirmedDate: detail.draftDocuments.finalDraftConfirmedDate ?? ''
        };
        if (detail.ssmo) this.ssmoForm = { applicationDate: detail.ssmo.applicationDate ?? '', cost: detail.ssmo.cost, costSettledDate: detail.ssmo.costSettledDate ?? '', refNumber: detail.ssmo.refNumber ?? '' };
        if (detail.mot) this.motForm = {
          processDate: detail.mot.processDate ?? '', cost: detail.mot.cost, costSettledDate: detail.mot.costSettledDate ?? '', refNumber: detail.mot.refNumber ?? '',
          offshoreApprovedPiNumber: detail.mot.offshoreApprovedPiNumber ?? '', offshoreApprovedPiDate: detail.mot.offshoreApprovedPiDate ?? ''
        };
        if (detail.supplierFullSet) this.supplierFullSetForm = {
          supplierInvoiceNo: detail.supplierFullSet.supplierInvoiceNo ?? '', supplierInvoiceDate: detail.supplierFullSet.supplierInvoiceDate ?? '',
          fsDispatchDate: detail.supplierFullSet.fsDispatchDate ?? '', fsDispatchedViaId: detail.supplierFullSet.fsDispatchedViaId,
          fsTrackingNumber: detail.supplierFullSet.fsTrackingNumber ?? '', fsReceivedDate: detail.supplierFullSet.fsReceivedDate ?? ''
        };
        if (detail.supplierPayment) this.supplierPaymentForm = {
          currencyId: detail.supplierPayment.currencyId,
          advanceValue: detail.supplierPayment.advanceValue, advanceDueDate: detail.supplierPayment.advanceDueDate ?? '', advanceActualPaymentDate: detail.supplierPayment.advanceActualPaymentDate ?? '',
          remainingValue: detail.supplierPayment.remainingValue, remainingDueDate: detail.supplierPayment.remainingDueDate ?? '', remainingActualPaymentDate: detail.supplierPayment.remainingActualPaymentDate ?? '',
          remarks: detail.supplierPayment.remarks ?? ''
        };
        if (detail.banking) this.bankingForm = {
          senderBankId: detail.banking.senderBankId, osDocDispatchDate: detail.banking.osDocDispatchDate ?? '', osDocDispatchedViaId: detail.banking.osDocDispatchedViaId,
          osDocTrackingNumber: detail.banking.osDocTrackingNumber ?? '', receivingBankId: detail.banking.receivingBankId, necessaryGoodType: detail.banking.necessaryGoodType,
          collectionRefNo: detail.banking.collectionRefNo ?? '', collectionValue: detail.banking.collectionValue, collectionCurrencyId: detail.banking.collectionCurrencyId,
          tenorId: detail.banking.tenorId, collectionDueDate: detail.banking.collectionDueDate ?? '', collectionAmountSettled: detail.banking.collectionAmountSettled,
          imFormNo: detail.banking.imFormNo ?? '', imFormDate: detail.banking.imFormDate ?? ''
        };

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Could not load shipment.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  sectionStatus(key: SectionKey): 'Not Started' | 'Saved' {
    if (!this.detail) return 'Not Started';
    return this.detail[key] ? 'Saved' : 'Not Started';
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

  saveForwarder(andNext: boolean): void {
    this.genericSave('forwarder', () => this.service.saveForwarder(this.shipmentId, this.forwarderForm), andNext);
  }

  saveAcd(andNext: boolean): void {
    this.genericSave('acd', () => this.service.saveAcd(this.shipmentId, {
      processDate: this.acdForm.processDate || null, costUsd: this.acdForm.costUsd,
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
      costSettledDate: this.ssmoForm.costSettledDate || null, refNumber: this.ssmoForm.refNumber || null
    }), andNext);
  }

  saveMot(andNext: boolean): void {
    this.genericSave('mot', () => this.service.saveMot(this.shipmentId, {
      processDate: this.motForm.processDate || null, cost: this.motForm.cost, costSettledDate: this.motForm.costSettledDate || null,
      refNumber: this.motForm.refNumber || null, offshoreApprovedPiNumber: this.motForm.offshoreApprovedPiNumber || null,
      offshoreApprovedPiDate: this.motForm.offshoreApprovedPiDate || null
    }), andNext);
  }

  saveSupplierFullSet(andNext: boolean): void {
    this.genericSave('supplierFullSet', () => this.service.saveSupplierFullSet(this.shipmentId, {
      supplierInvoiceNo: this.supplierFullSetForm.supplierInvoiceNo || null, supplierInvoiceDate: this.supplierFullSetForm.supplierInvoiceDate || null,
      fsDispatchDate: this.supplierFullSetForm.fsDispatchDate || null, fsDispatchedViaId: this.supplierFullSetForm.fsDispatchedViaId,
      fsTrackingNumber: this.supplierFullSetForm.fsTrackingNumber || null, fsReceivedDate: this.supplierFullSetForm.fsReceivedDate || null
    }), andNext);
  }

  saveSupplierPayment(andNext: boolean): void {
    this.genericSave('supplierPayment', () => this.service.saveSupplierPayment(this.shipmentId, {
      currencyId: this.supplierPaymentForm.currencyId,
      advanceValue: this.supplierPaymentForm.advanceValue, advanceDueDate: this.supplierPaymentForm.advanceDueDate || null, advanceActualPaymentDate: this.supplierPaymentForm.advanceActualPaymentDate || null,
      remainingValue: this.supplierPaymentForm.remainingValue, remainingDueDate: this.supplierPaymentForm.remainingDueDate || null, remainingActualPaymentDate: this.supplierPaymentForm.remainingActualPaymentDate || null,
      remarks: this.supplierPaymentForm.remarks || null
    }), andNext);
  }

  saveBanking(andNext: boolean): void {
    this.genericSave('banking', () => this.service.saveBanking(this.shipmentId, {
      senderBankId: this.bankingForm.senderBankId, osDocDispatchDate: this.bankingForm.osDocDispatchDate || null,
      osDocDispatchedViaId: this.bankingForm.osDocDispatchedViaId, osDocTrackingNumber: this.bankingForm.osDocTrackingNumber || null,
      receivingBankId: this.bankingForm.receivingBankId, necessaryGoodType: this.bankingForm.necessaryGoodType,
      collectionRefNo: this.bankingForm.collectionRefNo || null, collectionValue: this.bankingForm.collectionValue,
      collectionCurrencyId: this.bankingForm.collectionCurrencyId, tenorId: this.bankingForm.tenorId,
      collectionDueDate: this.bankingForm.collectionDueDate || null, collectionAmountSettled: this.bankingForm.collectionAmountSettled,
      imFormNo: this.bankingForm.imFormNo || null, imFormDate: this.bankingForm.imFormDate || null
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
