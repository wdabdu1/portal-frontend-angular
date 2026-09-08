import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';
import { SectionLockBadge } from '../../section-lock/section-lock-badge';
import { SectionLockInfo, SectionLockService } from '../../section-lock/section-lock.service';
import { ShipmentInfoPanel } from '../../shared/shipment-info-panel/shipment-info-panel';
import { ThousandsInputDirective } from '../../shared/thousands-input.directive';
import { ErpColumn, LastOffshoreDetails, ShipmentDetail, UpdateShipmentService } from '../update-shipment/update-shipment.service';

type SectionKey = 'ssmo' | 'mot' | 'erpInfo';

// Split out of Update Shipment: SSMO, MOT and ERP Info aren't something
// shipment users need day to day, so they live on their own page reached
// via the "Additional" nav entry rather than mixed in with the main
// Banking/Forwarder/etc. accordion. Deliberately not cross-linked with
// Update Shipment — the two are reached independently, each via its own
// list (Shipments / Additional).
@Component({
  selector: 'app-shipment-additional',
  imports: [CommonModule, FormsModule, RouterLink, ThousandsInputDirective, SectionLockBadge, ShipmentInfoPanel],
  templateUrl: './shipment-additional.html'
})
export class ShipmentAdditional implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);

  shipmentId!: number;
  detail: ShipmentDetail | null = null;
  loading = true;
  error = '';

  sectionOrder: SectionKey[] = ['ssmo', 'mot', 'erpInfo'];
  expandedSection: SectionKey | null = 'ssmo';
  saving: Record<SectionKey, boolean> = { ssmo: false, mot: false, erpInfo: false };

  locks: Record<string, SectionLockInfo | null> = {};

  ssmoForm = { cocRequired: null as boolean | null, cocAvailable: null as boolean | null, applicationDate: '', cost: null as number | null, costSettledDate: '', refNumber: '', approvalDate: '' };
  motForm = { processDate: '', cost: null as number | null, costSettledDate: '', refNumber: '', approvalDate: '', offshoreApprovedPiNumber: '' };

  erpColumns: ErpColumn[] = [];
  erpForms: Record<number, { prNo: string; poNo: string; sa: string; billReg: string; grn: string; invoiceNo: string; inspectionNo: string; remarks: string }> = {};
  savingErpColumn: Record<number, boolean> = {};
  loadingErpInfo = false;

  lastOffshoreData: LastOffshoreDetails | null = null;
  loadingLastOffshore = false;

  constructor(private service: UpdateShipmentService, private lockService: SectionLockService) {}

  ngOnInit(): void {
    this.shipmentId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadDetail();
    this.loadLocks();
  }

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

  loadDetail(): void {
    this.service.getDetail(this.shipmentId).subscribe({
      next: (detail) => {
        this.detail = detail;
        if (detail.ssmo) this.ssmoForm = { cocRequired: detail.ssmo.cocRequired ?? null, cocAvailable: detail.ssmo.cocAvailable ?? null, applicationDate: detail.ssmo.applicationDate ?? '', cost: detail.ssmo.cost, costSettledDate: detail.ssmo.costSettledDate ?? '', refNumber: detail.ssmo.refNumber ?? '', approvalDate: detail.ssmo.approvalDate ?? '' };
        if (detail.mot) this.motForm = {
          processDate: detail.mot.processDate ?? '', cost: detail.mot.cost, costSettledDate: detail.mot.costSettledDate ?? '', refNumber: detail.mot.refNumber ?? '',
          approvalDate: detail.mot.approvalDate ?? '', offshoreApprovedPiNumber: detail.mot.offshoreApprovedPiNumber ?? ''
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

  get allOffshoreColumns(): ErpColumn[] {
    return this.erpColumns;
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

  loadLastOffshoreDetails(): void {
    this.loadingLastOffshore = true;
    this.service.getLastOffshoreDetails(this.shipmentId).subscribe({
      next: (d) => {
        this.lastOffshoreData = d;
        this.loadingLastOffshore = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loadingLastOffshore = false; this.error = 'Could not load Last Offshore Details.'; this.cdr.markForCheck(); }
    });
  }

  // MOT relates to whichever offshore entity hands off directly to Onshore —
  // i.e. the last one in the chain, regardless of how many offshore hops
  // this particular PO has (1, 2, or more).
  get motRelatedOffshoreName(): string {
    const names = this.detail?.offshorePartnerNames ?? [];
    return names.length > 0 ? names[names.length - 1] : 'Offshore';
  }

  sectionStatus(key: SectionKey): 'Not Started' | 'Saved' {
    if (!this.detail) return 'Not Started';
    if (key === 'erpInfo') return this.erpColumns.some((c) => this.hasAnyValue(c)) ? 'Saved' : 'Not Started';
    return (this.detail as any)[key] ? 'Saved' : 'Not Started';
  }

  private hasAnyValue(c: ErpColumn): boolean {
    return !!(c.prNo || c.poNo || c.sa || c.billReg || c.grn || c.invoiceNo || c.inspectionNo || c.remarks);
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
        this.error = 'Could not save this section.';
        this.cdr.markForCheck();
      }
    });
  }

  saveSsmo(andNext: boolean): void {
    this.genericSave('ssmo', () => this.service.saveSsmo(this.shipmentId, {
      cocRequired: this.ssmoForm.cocRequired, cocAvailable: this.ssmoForm.cocAvailable,
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
}
