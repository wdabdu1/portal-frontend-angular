import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { ThousandsInputDirective } from '../../shared/thousands-input.directive';
import {
  EstimateLineItem, FzBalanceLine, WithdrawalCostEstimate, WithdrawalDetail, WithdrawalService
} from '../withdrawal.service';

interface GroupItemDef {
  key: string;
  label: string;
}

@Component({
  selector: 'app-withdrawal-detail',
  imports: [CommonModule, FormsModule, RouterLink, ThousandsInputDirective],
  templateUrl: './withdrawal-detail.html'
})
export class WithdrawalDetailComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);

  withdrawalId!: number;
  detail: WithdrawalDetail | null = null;
  loading = true;
  error = '';
  expanded: string | null = 'withdrawingFrom';

  balanceLines: FzBalanceLine[] = [];
  withdrawQtyByLineItem: Record<number, number> = {};
  loadingBalance = false;
  savingLineItems = false;

  generalInfoForm = { withdrawalRequestDate: '', withdrawalRequestRefNo: '' };
  savingGeneralInfo = false;

  costEstimateForm: WithdrawalCostEstimate = { estimateDate: null, notifyBuDate: null, amountSettledDate: null };
  estimateLineItems: EstimateLineItem[] = [];
  estimateTotalSdg = 0;
  chargeTypes: LookupEntity[] = [];
  newChargeTypeId: number | null = null;
  newValueSdg: number | null = null;
  newDueDate = '';
  savingCostEstimate = false;
  addingLineItem = false;

  processingForm = {
    certificateEntryDate: '', scudaDeclarationNo: '',
    motApprovalDate: '',
    ssmoFileRequestDate: '', ssmoInspectionAmountSdg: null as number | null, ssmoFeesSettlementDate: '',
    custExamStartDate: '', custExamCompletedDate: '',
    customsLabRequired: false, customsLabFeesSdg: null as number | null, labFeesPaymentDate: '', labResultIssuanceDate: '',
    ssmoExamStartDate: '', ssmoCertIssuanceDate: '',
    custEvaluationDate: '', customsDutySdg: null as number | null, customsSettlementDate: '', releaseExitPassDate: '',
    truckPortEntryPermitDate: '', clearanceActualCompletedDate: ''
  };
  savingProcessing = false;

  groups: GroupItemDef[] = [
    { key: 'certificateEntry', label: 'Customs Certificate Entry' },
    { key: 'mot', label: 'MOT' },
    { key: 'ssmoFile', label: 'SSMO File Process' },
    { key: 'customsExam', label: 'Customs Examination (Form 48)' },
    { key: 'customsLab', label: 'Customs Lab' },
    { key: 'ssmoExam', label: 'SSMO Examination' },
    { key: 'customsEval', label: 'Customs Evaluation' },
    { key: 'truck', label: 'Truck & Containers' }
  ];

  constructor(private service: WithdrawalService, private lookups: SettingsLookupService) {}

  ngOnInit(): void {
    this.withdrawalId = Number(this.route.snapshot.paramMap.get('id'));
    this.lookups.getAll<LookupEntity>('clearance-charge-types').subscribe({
      next: (r) => { this.chargeTypes = r; this.cdr.markForCheck(); }
    });
    this.load();
    this.loadBalance();
    this.loadCostEstimate();
  }

  load(): void {
    this.service.getDetail(this.withdrawalId).subscribe({
      next: (d) => {
        this.detail = d;
        this.generalInfoForm = { withdrawalRequestDate: d.withdrawalRequestDate ?? '', withdrawalRequestRefNo: d.withdrawalRequestRefNo ?? '' };
        this.processingForm = {
          certificateEntryDate: d.certificateEntryDate ?? '', scudaDeclarationNo: d.scudaDeclarationNo ?? '',
          motApprovalDate: d.motApprovalDate ?? '',
          ssmoFileRequestDate: d.ssmoFileRequestDate ?? '', ssmoInspectionAmountSdg: d.ssmoInspectionAmountSdg, ssmoFeesSettlementDate: d.ssmoFeesSettlementDate ?? '',
          custExamStartDate: d.custExamStartDate ?? '', custExamCompletedDate: d.custExamCompletedDate ?? '',
          customsLabRequired: d.customsLabRequired, customsLabFeesSdg: d.customsLabFeesSdg, labFeesPaymentDate: d.labFeesPaymentDate ?? '', labResultIssuanceDate: d.labResultIssuanceDate ?? '',
          ssmoExamStartDate: d.ssmoExamStartDate ?? '', ssmoCertIssuanceDate: d.ssmoCertIssuanceDate ?? '',
          custEvaluationDate: d.custEvaluationDate ?? '', customsDutySdg: d.customsDutySdg, customsSettlementDate: d.customsSettlementDate ?? '', releaseExitPassDate: d.releaseExitPassDate ?? '',
          truckPortEntryPermitDate: d.truckPortEntryPermitDate ?? '', clearanceActualCompletedDate: d.clearanceActualCompletedDate ?? ''
        };
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.error = 'Could not load withdrawal.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  loadBalance(): void {
    this.loadingBalance = true;
    this.service.getLineItems(this.withdrawalId).subscribe({
      next: (lines) => {
        this.balanceLines = lines;
        for (const l of lines) this.withdrawQtyByLineItem[l.shipmentLineItemId] = l.thisWithdrawalQty;
        this.loadingBalance = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loadingBalance = false; this.cdr.markForCheck(); }
    });
  }

  removeBalanceLineItem(shipmentLineItemId: number): void {
    this.service.deleteLineItem(this.withdrawalId, shipmentLineItemId).subscribe({
      next: () => this.loadBalance(),
      error: () => { this.error = 'Could not remove this item.'; this.cdr.markForCheck(); }
    });
  }

  loadCostEstimate(): void {
    this.service.getCostEstimate(this.withdrawalId).subscribe({
      next: (r) => {
        if (r.estimate) this.costEstimateForm = r.estimate;
        this.estimateLineItems = r.lineItems;
        this.estimateTotalSdg = r.totalSdg;
        this.cdr.markForCheck();
      }
    });
  }

  toggle(section: string): void {
    this.expanded = this.expanded === section ? null : section;
  }

  saveLineItems(andNext: boolean): void {
    this.savingLineItems = true;
    const lines = this.balanceLines.map((l) => ({ shipmentLineItemId: l.shipmentLineItemId, qty: this.withdrawQtyByLineItem[l.shipmentLineItemId] || 0 }));
    this.service.saveLineItems(this.withdrawalId, lines).subscribe({
      next: () => {
        this.savingLineItems = false;
        this.error = '';
        this.loadBalance();
        if (andNext) this.expanded = 'generalInfo';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.savingLineItems = false;
        this.error = err?.error?.message || 'Could not save withdrawal quantities.';
        this.cdr.markForCheck();
      }
    });
  }

  saveGeneralInfo(andNext: boolean): void {
    this.savingGeneralInfo = true;
    this.service.saveGeneralInfo(this.withdrawalId, {
      withdrawalRequestDate: this.generalInfoForm.withdrawalRequestDate || null,
      withdrawalRequestRefNo: this.generalInfoForm.withdrawalRequestRefNo || null
    }).subscribe({
      next: () => {
        this.savingGeneralInfo = false;
        if (andNext) this.expanded = 'costEstimate';
        this.cdr.markForCheck();
      },
      error: () => { this.savingGeneralInfo = false; this.error = 'Could not save General Info.'; this.cdr.markForCheck(); }
    });
  }

  saveCostEstimate(andNext: boolean): void {
    this.savingCostEstimate = true;
    this.service.saveCostEstimate(this.withdrawalId, this.costEstimateForm).subscribe({
      next: () => {
        this.savingCostEstimate = false;
        if (andNext) this.expanded = this.groups[0].key;
        this.cdr.markForCheck();
      },
      error: () => { this.savingCostEstimate = false; this.error = 'Could not save Cost Estimate.'; this.cdr.markForCheck(); }
    });
  }

  addLineItem(): void {
    if (!this.newChargeTypeId || !this.newValueSdg) return;
    this.addingLineItem = true;
    this.service.addEstimateLineItem(this.withdrawalId, {
      chargeTypeId: this.newChargeTypeId, valueSdg: this.newValueSdg, dueDate: this.newDueDate || null
    }).subscribe({
      next: () => {
        this.addingLineItem = false;
        this.newChargeTypeId = null;
        this.newValueSdg = null;
        this.newDueDate = '';
        this.loadCostEstimate();
      },
      error: () => { this.addingLineItem = false; this.cdr.markForCheck(); }
    });
  }

  removeLineItem(lineItemId: number): void {
    this.service.deleteEstimateLineItem(this.withdrawalId, lineItemId).subscribe({ next: () => this.loadCostEstimate() });
  }

  saveProcessing(andNext: boolean, nextGroupKey: string | null): void {
    this.savingProcessing = true;
    this.service.saveProcessing(this.withdrawalId, {
      certificateEntryDate: this.processingForm.certificateEntryDate || null,
      scudaDeclarationNo: this.processingForm.scudaDeclarationNo || null,
      ssmoFileRequestDate: this.processingForm.ssmoFileRequestDate || null,
      ssmoInspectionAmountSdg: this.processingForm.ssmoInspectionAmountSdg,
      ssmoFeesSettlementDate: this.processingForm.ssmoFeesSettlementDate || null,
      custExamStartDate: this.processingForm.custExamStartDate || null,
      custExamCompletedDate: this.processingForm.custExamCompletedDate || null,
      customsLabRequired: this.processingForm.customsLabRequired,
      customsLabFeesSdg: this.processingForm.customsLabFeesSdg,
      labFeesPaymentDate: this.processingForm.labFeesPaymentDate || null,
      labResultIssuanceDate: this.processingForm.labResultIssuanceDate || null,
      ssmoExamStartDate: this.processingForm.ssmoExamStartDate || null,
      ssmoCertIssuanceDate: this.processingForm.ssmoCertIssuanceDate || null,
      custEvaluationDate: this.processingForm.custEvaluationDate || null,
      customsDutySdg: this.processingForm.customsDutySdg,
      customsSettlementDate: this.processingForm.customsSettlementDate || null,
      releaseExitPassDate: this.processingForm.releaseExitPassDate || null,
      truckPortEntryPermitDate: this.processingForm.truckPortEntryPermitDate || null,
      clearanceActualCompletedDate: this.processingForm.clearanceActualCompletedDate || null
    } as any).subscribe({
      next: () => {
        this.savingProcessing = false;
        if (andNext) this.expanded = nextGroupKey;
        this.cdr.markForCheck();
      },
      error: () => { this.savingProcessing = false; this.error = 'Could not save.'; this.cdr.markForCheck(); }
    });
  }

  nextGroupKey(currentKey: string): string | null {
    const idx = this.groups.findIndex((g) => g.key === currentKey);
    return this.groups[idx + 1]?.key ?? null;
  }
}
