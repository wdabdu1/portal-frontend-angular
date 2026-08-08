import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { SectionLockBadge } from '../../section-lock/section-lock-badge';
import { SectionLockInfo, SectionLockService } from '../../section-lock/section-lock.service';
import { TpLineItem, TransferPricingService } from '../transfer-pricing.service';

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

  // Editable draft state per (lineItemId, offshorePartnerId)
  drafts: Record<string, { currencyId: number | null; markupPercent: number | null }> = {};
  savingItem: Record<number, boolean> = {};

  constructor(
    private service: TransferPricingService,
    private lookups: SettingsLookupService,
    private lockService: SectionLockService
  ) {}

  ngOnInit(): void {
    this.shipmentId = Number(this.route.snapshot.paramMap.get('shipmentId'));
    this.lookups.getAll<LookupEntity>('currencies').subscribe({ next: (r) => { this.currencies = r; this.cdr.markForCheck(); } });
    this.load();
    this.loadLocks();
  }

  get isLocked(): boolean {
    return !!this.locks['transferPricing'];
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
