import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { ThousandsInputDirective } from '../../shared/thousands-input.directive';
import { ShipmentDetail, UpdateShipmentService } from './update-shipment.service';

type SectionKey = 'forwarder' | 'acd';

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

  sectionOrder: SectionKey[] = ['forwarder', 'acd'];
  expandedSection: SectionKey | null = 'forwarder';

  forwarderForm = { forwarderId: null as number | null, actualShippingCost: null as number | null, currencyId: null as number | null, amountSaved: null as number | null, marineInsurance: false };
  forwarderSaving = false;

  acdForm = { processDate: '', costUsd: null as number | null, costSettledDate: '', refNumber: '' };
  acdSaving = false;

  confirming = false;

  constructor(private lookups: SettingsLookupService, private service: UpdateShipmentService) {}

  ngOnInit(): void {
    this.shipmentId = Number(this.route.snapshot.paramMap.get('id'));

    this.lookups.getAll<LookupEntity>('forwarders').subscribe({ next: (r) => { this.forwarders = r; this.cdr.markForCheck(); } });
    this.lookups.getAll<LookupEntity>('currencies').subscribe({ next: (r) => { this.currencies = r; this.cdr.markForCheck(); } });

    this.loadDetail();
  }

  loadDetail(): void {
    this.service.getDetail(this.shipmentId).subscribe({
      next: (detail) => {
        this.detail = detail;
        if (detail.forwarder) {
          this.forwarderForm = {
            forwarderId: detail.forwarder.forwarderId,
            actualShippingCost: detail.forwarder.actualShippingCost,
            currencyId: detail.forwarder.currencyId,
            amountSaved: detail.forwarder.amountSaved,
            marineInsurance: detail.forwarder.marineInsurance
          };
        }
        if (detail.acd) {
          this.acdForm = {
            processDate: detail.acd.processDate ?? '',
            costUsd: detail.acd.costUsd,
            costSettledDate: detail.acd.costSettledDate ?? '',
            refNumber: detail.acd.refNumber ?? ''
          };
        }
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
    if (key === 'forwarder') return this.detail.forwarder ? 'Saved' : 'Not Started';
    if (key === 'acd') return this.detail.acd ? 'Saved' : 'Not Started';
    return 'Not Started';
  }

  toggleSection(key: SectionKey): void {
    this.expandedSection = this.expandedSection === key ? null : key;
  }

  goToNext(current: SectionKey): void {
    const idx = this.sectionOrder.indexOf(current);
    const next = this.sectionOrder[idx + 1] ?? null;
    this.expandedSection = next;
    this.cdr.markForCheck();
  }

  saveForwarder(andNext: boolean): void {
    this.forwarderSaving = true;
    this.service.saveForwarder(this.shipmentId, this.forwarderForm).subscribe({
      next: (updated) => {
        this.forwarderSaving = false;
        if (this.detail) this.detail = { ...this.detail, forwarder: updated as any };
        if (andNext) this.goToNext('forwarder');
        this.cdr.markForCheck();
      },
      error: () => {
        this.forwarderSaving = false;
        this.error = 'Could not save Forwarder section.';
        this.cdr.markForCheck();
      }
    });
  }

  saveAcd(andNext: boolean): void {
    this.acdSaving = true;
    this.service.saveAcd(this.shipmentId, {
      processDate: this.acdForm.processDate || null,
      costUsd: this.acdForm.costUsd,
      costSettledDate: this.acdForm.costSettledDate || null,
      refNumber: this.acdForm.refNumber || null
    }).subscribe({
      next: (updated) => {
        this.acdSaving = false;
        if (this.detail) this.detail = { ...this.detail, acd: updated as any };
        if (andNext) this.goToNext('acd');
        this.cdr.markForCheck();
      },
      error: () => {
        this.acdSaving = false;
        this.error = 'Could not save ACD section.';
        this.cdr.markForCheck();
      }
    });
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
