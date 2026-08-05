import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ThousandsInputDirective } from '../../shared/thousands-input.directive';
import { SectionLockBadge } from '../../section-lock/section-lock-badge';
import { SectionLockInfo, SectionLockService } from '../../section-lock/section-lock.service';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import {
  ClearanceCertificateEntry, ClearanceCostEstimate, ClearanceDeliveryOrder,
  ClearanceDetail, ClearanceRoute1Details, ClearanceRoute2Details, ClearanceRoute3Details,
  ClearanceService, DemurrageStorageResult, FzBalanceLine, FzDepositOption, ScheduleItem
} from '../clearance.service';

interface GroupItemDef {
  key: string;
  label: string;
}

@Component({
  selector: 'app-clearance-detail',
  imports: [CommonModule, FormsModule, RouterLink, ThousandsInputDirective, SectionLockBadge],
  templateUrl: './clearance-detail.html'
})
export class ClearanceDetailComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  shipmentId!: number;
  detail: ClearanceDetail | null = null;
  loading = true;
  error = '';

  schedule: ScheduleItem[] = [];
  estimatedCompletionDate: string | null = null;
  demurrageStorage: DemurrageStorageResult | null = null;

  expanded: string | null = 'route';
  savingRoute = false;
  savingGeneralInfo = false;
  savingDeliveryOrder = false;
  savingCostEstimate = false;
  savingCertificateEntry = false;
  savingRouteDetail = false;

  selectedRoute: number = 0;

  generalInfoForm = {
    copyOfBlReceivedDate: '', originalShipmentSetReceivedDate: '', shipmentEta: '',
    lcNo: '', imFormNo: '', imFormDate: ''
  };

  deliveryOrderForm: ClearanceDeliveryOrder = { copyOfDoCollectedDate: null, receiveDoDate: null, actualArrivalDate: null, depositRequired: false, doActualFeesSdg: null, doFeesSettledDate: null, doReceivedDate: null };
  costEstimateForm: ClearanceCostEstimate = { estimateDate: null, notifyBuDate: null, amountSettledDate: null };
  estimateTotalSdg = 0;
  certificateEntryForm: ClearanceCertificateEntry = { certificateEntryDate: null, scudaDeclarationNo: null };

  route1Form: ClearanceRoute1Details = this.emptyRoute1();
  route2Form: ClearanceRoute2Details = this.emptyRoute2();
  route3Form: ClearanceRoute3Details = this.emptyRoute3();

  freeZoneDestinations: LookupEntity[] = [];
  fzDepositOptions: FzDepositOption[] = [];
  fzBalanceLines: FzBalanceLine[] = [];
  withdrawQtyByLineItem: Record<number, number> = {};
  loadingFzBalance = false;

  route1Groups: GroupItemDef[] = [
    { key: 'Containers Move Process', label: 'Containers Move Process' },
    { key: 'SSMO File Process', label: 'SSMO File Process' },
    { key: 'Customs Examination (Form 48)', label: 'Customs Examination (Form 48)' },
    { key: 'Customs Lab', label: 'Customs Lab' },
    { key: 'SSMO Examination', label: 'SSMO Examination' },
    { key: 'Customs Evaluation', label: 'Customs Evaluation' },
    { key: 'SPC Bill', label: 'SPC Bill' },
    { key: 'Truck & Containers', label: 'Truck & Containers' }
  ];
  route2Groups: GroupItemDef[] = [
    { key: 'FZ Deposit Request', label: 'FZ Deposit Request' },
    { key: 'Customs Inspection', label: 'Customs Inspection' },
    { key: 'SPC Bill', label: 'SPC Bill' },
    { key: 'Truck & Containers', label: 'Truck & Containers' }
  ];
  route3Groups: GroupItemDef[] = [
    { key: 'Customs Certificate Entry', label: 'Customs Certificate Entry' },
    { key: 'SSMO File Process', label: 'SSMO File Process' },
    { key: 'Customs Examination (Form 48)', label: 'Customs Examination (Form 48)' },
    { key: 'Customs Lab', label: 'Customs Lab' },
    { key: 'SSMO Examination', label: 'SSMO Examination' },
    { key: 'Customs Evaluation', label: 'Customs Evaluation' },
    { key: 'Truck & Containers', label: 'Truck & Containers' }
  ];

  locks: Record<string, SectionLockInfo | null> = {};

  loadLocks(): void {
    this.lockService.getLocks('Clearance', this.shipmentId).subscribe({
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

  get activeRouteLockKey(): string {
    return `route${this.detail?.route ?? this.selectedRoute}`;
  }
  constructor(private service: ClearanceService, private lockService: SectionLockService) {}

  ngOnInit(): void {
    this.shipmentId = Number(this.route.snapshot.paramMap.get('id'));
    const section = this.route.snapshot.queryParamMap.get('section');
    if (section) this.expanded = section;
    this.load();
    this.loadLocks();
  }

  emptyRoute1(): ClearanceRoute1Details {
    return {
      moveRequestDate: null, billAmountSdg: null, billSettlementDate: null,
      ssmoFileRequestDate: null, ssmoInspectionAmountSdg: null, ssmoFeesSettlementDate: null,
      custExamStartDate: null, custExamCompletedDate: null,
      customsLabRequired: false, customsLabFeesSdg: null, labFeesPaymentDate: null, labResultIssuanceDate: null,
      ssmoExamStartDate: null, ssmoCertIssuanceDate: null,
      custEvaluationDate: null, customsDutySdg: null, customsSettlementDate: null, releaseExitPassDate: null,
      spcBillRequestDate: null, spcBillValueSdg: null, spcBillSettlementDate: null,
      truckPortEntryPermitDate: null, containersReturnedDate: null,
      shippingLineDepositReturnDate: null, depositValue: null, clearanceActualCompletedDate: null
    };
  }

  emptyRoute2(): ClearanceRoute2Details {
    return {
      depositRequestDate: null, requestApprovalDate: null,
      depositRefNo: null, fzInvoiceNo: null, destinationId: null,
      inspectionDate: null,
      spcBillRequestDate: null, spcBillValueSdg: null, spcBillSettlementDate: null, policeSecurityAppointedDate: null,
      truckPortEntryPermitDate: null, containersReceivedAtFzDate: null, containersReturnedDate: null,
      shippingLineDepositReturnDate: null, depositValue: null, clearanceActualCompletedDate: null
    };
  }

  emptyRoute3(): ClearanceRoute3Details {
    return {
      depositShipmentId: null, withdrawals: null,
      certificateEntryDate: null, scudaDeclarationNo: null,
      ssmoFileRequestDate: null, ssmoInspectionAmountSdg: null, ssmoFeesSettlementDate: null,
      custExamStartDate: null, custExamCompletedDate: null,
      customsLabRequired: false, customsLabFeesSdg: null, labFeesPaymentDate: null, labResultIssuanceDate: null,
      ssmoExamStartDate: null, ssmoCertIssuanceDate: null,
      custEvaluationDate: null, customsDutySdg: null, customsSettlementDate: null, releaseExitPassDate: null,
      truckPortEntryPermitDate: null, clearanceActualCompletedDate: null
    };
  }

  load(): void {
    this.service.getDetail(this.shipmentId).subscribe({
      next: (detail) => {
        this.detail = detail;
        this.selectedRoute = detail.route;
        this.generalInfoForm = {
          copyOfBlReceivedDate: detail.copyOfBlReceivedDate ?? '',
          originalShipmentSetReceivedDate: detail.originalShipmentSetReceivedDate ?? '',
          shipmentEta: detail.eta ?? '',
          lcNo: detail.lcNo ?? '',
          imFormNo: detail.imFormNo ?? '',
          imFormDate: detail.imFormDate ?? ''
        };
        this.loading = false;
        this.loadGeneralSubSections();
        this.loadRouteDetail();
        this.loadSchedule();
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Could not load clearance details.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadSchedule(): void {
    this.service.getSchedule(this.shipmentId).subscribe({
      next: (r) => {
        this.schedule = r.items;
        this.estimatedCompletionDate = r.estimatedCompletionDate;
        this.cdr.markForCheck();
      }
    });
    this.service.getDemurrageStorage(this.shipmentId).subscribe({
      next: (r) => {
        this.demurrageStorage = r;
        this.cdr.markForCheck();
      }
    });
  }

  loadGeneralSubSections(): void {
    this.service.getDeliveryOrder(this.shipmentId).subscribe({ next: (r) => { if (r) this.deliveryOrderForm = r; this.cdr.markForCheck(); } });
    this.service.getCostEstimate(this.shipmentId).subscribe({
      next: (r) => {
        if (r.estimate) this.costEstimateForm = r.estimate;
        this.estimateTotalSdg = r.totalSdg;
        this.cdr.markForCheck();
      }
    });
    this.service.getCertificateEntry(this.shipmentId).subscribe({ next: (r) => { if (r) this.certificateEntryForm = r; this.cdr.markForCheck(); } });
  }

  loadRouteDetail(): void {
    if (this.selectedRoute === 1) {
      this.service.getRoute1(this.shipmentId).subscribe({ next: (r) => { if (r) this.route1Form = r; this.cdr.markForCheck(); } });
    } else if (this.selectedRoute === 2) {
      this.service.getRoute2(this.shipmentId).subscribe({ next: (r) => { if (r) this.route2Form = r; this.cdr.markForCheck(); } });
    } else if (this.selectedRoute === 3) {
      this.service.getRoute3(this.shipmentId).subscribe({ next: (r) => { if (r) this.route3Form = r; this.cdr.markForCheck(); } });
    }
  }

  toggle(section: string): void {
    this.expanded = this.expanded === section ? null : section;
  }

  scheduleFor(division: string, groupItem: string): ScheduleItem | undefined {
    return this.schedule.find((s) => s.division === division && s.groupItem === groupItem);
  }

  lightColor(light: string | undefined): string {
    switch (light) {
      case 'Green': return '#2a7d2a';
      case 'Amber': return '#c98a00';
      case 'Red': return '#c0392b';
      default: return '#ccc';
    }
  }

  get activeRouteGroups(): GroupItemDef[] {
    if (this.selectedRoute === 1) return this.route1Groups;
    if (this.selectedRoute === 2) return this.route2Groups;
    if (this.selectedRoute === 3) return this.route3Groups;
    return [];
  }

  saveGeneralInfo(andNext: boolean): void {
    this.savingGeneralInfo = true;
    this.service.saveGeneralInfo(this.shipmentId, {
      copyOfBlReceivedDate: this.generalInfoForm.copyOfBlReceivedDate || null,
      originalShipmentSetReceivedDate: this.generalInfoForm.originalShipmentSetReceivedDate || null,
      lcNo: this.generalInfoForm.lcNo || null,
      imFormNo: this.generalInfoForm.imFormNo || null,
      imFormDate: this.generalInfoForm.imFormDate || null,
      shipmentEta: this.generalInfoForm.shipmentEta || null
    } as any).subscribe({
      next: () => {
        this.savingGeneralInfo = false;
        if (this.detail) {
          this.detail = { ...this.detail, eta: this.generalInfoForm.shipmentEta || null };
        }
        this.loadSchedule();
        if (andNext) this.expanded = 'costEstimate';
        this.cdr.markForCheck();
      },
      error: () => { this.savingGeneralInfo = false; this.error = 'Could not save General Info.'; this.cdr.markForCheck(); }
    });
  }

  saveRoute(andNext: boolean): void {
    if (!this.selectedRoute) return;
    this.savingRoute = true;
    this.service.setRoute(this.shipmentId, this.selectedRoute).subscribe({
      next: () => {
        this.savingRoute = false;
        if (this.detail) this.detail = { ...this.detail, route: this.selectedRoute };
        this.loadRouteDetail();
        this.loadSchedule();
        if (andNext) this.expanded = 'generalInfo';
        this.cdr.markForCheck();
      },
      error: () => {
        this.savingRoute = false;
        this.error = 'Could not save route.';
        this.cdr.markForCheck();
      }
    });
  }

  saveCostEstimate(andNext: boolean): void {
    this.savingCostEstimate = true;
    this.service.saveCostEstimate(this.shipmentId, this.costEstimateForm).subscribe({
      next: () => {
        this.savingCostEstimate = false;
        this.loadSchedule();
        if (andNext) this.expanded = 'deliveryOrder';
        this.cdr.markForCheck();
      },
      error: () => { this.savingCostEstimate = false; this.error = 'Could not save Cost Estimate.'; this.cdr.markForCheck(); }
    });
  }

  saveDeliveryOrder(andNext: boolean): void {
    this.savingDeliveryOrder = true;
    this.service.saveDeliveryOrder(this.shipmentId, this.deliveryOrderForm).subscribe({
      next: () => {
        this.savingDeliveryOrder = false;
        this.loadSchedule();
        if (andNext) this.expanded = 'certificateEntry';
        this.cdr.markForCheck();
      },
      error: () => { this.savingDeliveryOrder = false; this.error = 'Could not save Delivery Order.'; this.cdr.markForCheck(); }
    });
  }

  saveCertificateEntry(andNext: boolean): void {
    this.savingCertificateEntry = true;
    this.service.saveCertificateEntry(this.shipmentId, this.certificateEntryForm).subscribe({
      next: () => {
        this.savingCertificateEntry = false;
        this.loadSchedule();
        if (andNext) this.expanded = this.activeRouteGroups[0]?.key ?? null;
        this.cdr.markForCheck();
      },
      error: () => { this.savingCertificateEntry = false; this.error = 'Could not save Certificate Entry.'; this.cdr.markForCheck(); }
    });
  }

  saveRouteDetail(andNext: boolean, nextGroupKey: string | null): void {
    this.savingRouteDetail = true;
    const save$ = this.selectedRoute === 1
      ? this.service.saveRoute1(this.shipmentId, this.route1Form)
      : this.selectedRoute === 2
      ? this.service.saveRoute2(this.shipmentId, this.route2Form)
      : this.service.saveRoute3(this.shipmentId, this.route3Form);

    save$.subscribe({
      next: () => {
        this.savingRouteDetail = false;
        this.loadSchedule();
        if (andNext) this.expanded = nextGroupKey;
        this.cdr.markForCheck();
      },
      error: () => {
        this.savingRouteDetail = false;
        this.error = 'Could not save route details.';
        this.cdr.markForCheck();
      }
    });
  }

  nextGroupKey(currentKey: string): string | null {
    const groups = this.activeRouteGroups;
    const idx = groups.findIndex((g) => g.key === currentKey);
    return groups[idx + 1]?.key ?? null;
  }

  routeName(route: number): string {
    switch (route) {
      case 1: return 'Route 1 — Clear at Port';
      case 2: return 'Route 2 — FZ Deposit';
      case 3: return 'Route 3 — Clear from FZ';
      default: return 'Not selected';
    }
  }

  get plannedVsCurrentText(): string | null {
    if (!this.estimatedCompletionDate) return null;
    const current = this.detail?.clearanceCompleteDate ?? this.estimatedCompletionDate;
    if (current === this.estimatedCompletionDate) return null; // no actual completion recorded yet, nothing to compare
    const plannedMs = new Date(this.estimatedCompletionDate).getTime();
    const currentMs = new Date(current).getTime();
    const diffDays = Math.round((currentMs - plannedMs) / 86400000);
    if (diffDays === 0) return 'On plan';
    return diffDays > 0 ? `Behind by ${diffDays} day(s)` : `Ahead by ${-diffDays} day(s)`;
  }
}
