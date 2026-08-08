import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { SectionLockBadge } from '../../section-lock/section-lock-badge';
import { SectionLockInfo, SectionLockService } from '../../section-lock/section-lock.service';
import { TpLineItem, TpStage, TransferPricingService } from '../transfer-pricing.service';

@Component({
  selector: 'app-transfer-pricing-detail',
  imports: [CommonModule, FormsModule, RouterLink, SectionLockBadge],
  templateUrl: './transfer-pricing-detail.html'
})
export class TransferPricingDetailComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);

  shipmentId!: number;
  items: TpLineItem[] = [];
  loading = true;
  error = '';

  currencies: LookupEntity[] = [];
  locks: Record<string, SectionLockInfo | null> = {};

  // Latest RateToUsd per currency, used to replicate the backend's exact
  // markup-cascade formula client-side, so every stage recalculates live
  // as the user types — no save/reload round-trip needed to see the impact.
  fxRates: Record<number, number> = {};

  // Editable draft state per (lineItemId, offshorePartnerId)
  drafts: Record<string, { currencyId: number | null; markupPercent: number | null }> = {};
  savingItem: Record<number, boolean> = {};
  confirming = false;

  // Stored, not recomputed on every change-detection cycle — only
  // recalculated explicitly via onDraftChange(), triggered by actual
  // user input. Calling the calculation directly inside *ngFor was
  // rebuilding the array (and every input/select in the row) on every
  // CD cycle, which is what was causing the page to hang.
  liveStagesByItem: Record<number, (TpStage & { liveTotal: number | null; liveTotalUsd: number | null; liveMarkupPercent: number | null })[]> = {};

  constructor(
    private service: TransferPricingService,
    private lookups: SettingsLookupService,
    private lockService: SectionLockService
  ) {}

  ngOnInit(): void {
    this.shipmentId = Number(this.route.snapshot.paramMap.get('shipmentId'));
    this.lookups.getAll<LookupEntity>('currencies').subscribe({ next: (r) => { this.currencies = r; this.cdr.markForCheck(); } });
    this.lookups.getAll<{ id: number; currencyId: number; rateToUsd: number; effectiveDate: string }>('fx-rates').subscribe({
      next: (rates) => {
        // Keep only the most recent rate per currency, matching the
        // backend's own "OrderByDescending(EffectiveDate).First()" logic.
        const latest: Record<number, { rateToUsd: number; effectiveDate: string }> = {};
        for (const r of rates) {
          if (!latest[r.currencyId] || r.effectiveDate > latest[r.currencyId].effectiveDate) {
            latest[r.currencyId] = r;
          }
        }
        this.fxRates = {};
        for (const [currencyId, r] of Object.entries(latest)) this.fxRates[Number(currencyId)] = r.rateToUsd;
        this.cdr.markForCheck();
      }
    });
    this.load();
    this.loadLocks();
  }

  getRateToUsd(currencyId: number | null): number {
    if (!currencyId) return 1;
    return this.fxRates[currencyId] ?? 1;
  }

  // Recomputes the ENTIRE chain for one line item from current draft
  // inputs (not the last-saved server values), so every downstream stage
  // — including the last offshore's margin % — updates live as markups
  // or currencies change.
  // Recalculates and STORES the live chain for one item — call this from
  // (ngModelChange) on the actual inputs, never from inside a template's
  // *ngFor, which would rebuild everything on every CD cycle instead of
  // only when something real changes.
  onDraftChange(item: TpLineItem): void {
    let runningUsd = item.supplierCnfUsd;
    const result: (TpStage & { liveTotal: number | null; liveTotalUsd: number | null; liveMarkupPercent: number | null })[] = [];

    for (const stage of item.stages) {
      if (!stage.isLast) {
        const draft = this.draftFor(item.shipmentLineItemId, stage.purchaseOrderOffshorePartnerId);
        const currencyId = draft.currencyId ?? stage.currencyId;
        const markup = draft.markupPercent ?? 0;
        const rate = this.getRateToUsd(currencyId);

        const stageValueInCurrency = runningUsd * rate;
        const total = stageValueInCurrency * (1 + markup / 100);
        const totalUsd = rate === 0 ? total : total / rate;

        result.push({ ...stage, liveTotal: total, liveTotalUsd: totalUsd, liveMarkupPercent: markup });
        runningUsd = totalUsd;
      } else {
        const lastTotalUsd = stage.totalUsd;
        const liveMarkupPercent = lastTotalUsd !== null && runningUsd !== 0 ? ((lastTotalUsd - runningUsd) / runningUsd) * 100 : null;
        result.push({ ...stage, liveTotal: stage.total, liveTotalUsd: lastTotalUsd, liveMarkupPercent });
      }
    }
    this.liveStagesByItem[item.shipmentLineItemId] = result;
  }

  get isLocked(): boolean {
    return !!this.locks['transferPricing'];
  }

  confirmAndLock(): void {
    this.confirming = true;
    this.lockService.confirm('Shipment', this.shipmentId, 'transferPricing').subscribe({
      next: () => { this.confirming = false; this.loadLocks(); },
      error: () => { this.confirming = false; this.error = 'Could not confirm & lock.'; this.cdr.markForCheck(); }
    });
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

  private draftKey(lineItemId: number, partnerId: number): string {
    return `${lineItemId}-${partnerId}`;
  }

  load(): void {
    this.loading = true;
    this.service.getShipment(this.shipmentId).subscribe({
      next: (r) => {
        this.items = r;
        this.drafts = {};
        for (const item of r) {
          for (const stage of item.stages) {
            if (stage.isLast) continue;
            this.drafts[this.draftKey(item.shipmentLineItemId, stage.purchaseOrderOffshorePartnerId)] = {
              currencyId: stage.currencyId,
              markupPercent: stage.markupPercent
            };
          }
        }
        for (const item of r) this.onDraftChange(item);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.error = 'Could not load Transfer Pricing data.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  draftFor(lineItemId: number, partnerId: number) {
    const key = this.draftKey(lineItemId, partnerId);
    if (!this.drafts[key]) this.drafts[key] = { currencyId: null, markupPercent: null };
    return this.drafts[key];
  }

  saveItem(item: TpLineItem): void {
    this.savingItem[item.shipmentLineItemId] = true;
    const stages = item.stages
      .filter((s) => !s.isLast)
      .map((s) => {
        const d = this.draftFor(item.shipmentLineItemId, s.purchaseOrderOffshorePartnerId);
        return { purchaseOrderOffshorePartnerId: s.purchaseOrderOffshorePartnerId, currencyId: d.currencyId ?? 0, markupPercent: d.markupPercent };
      })
      .filter((s) => s.currencyId > 0);

    this.service.saveLineItem(item.shipmentLineItemId, stages).subscribe({
      next: () => {
        this.savingItem[item.shipmentLineItemId] = false;
        this.load();
      },
      error: () => { this.savingItem[item.shipmentLineItemId] = false; this.error = 'Could not save this item.'; this.cdr.markForCheck(); }
    });
  }
}
