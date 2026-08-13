import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { DemurrageAnalysisResult, DemurrageAnalysisService, ShipmentWithHitOption } from '../demurrage-analysis.service';

type PeriodType = 'Monthly' | 'Quarterly' | 'Annual';

@Component({
  selector: 'app-demurrage-analysis',
  imports: [CommonModule, FormsModule],
  templateUrl: './demurrage-analysis.html'
})
export class DemurrageAnalysis implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  data: DemurrageAnalysisResult | null = null;
  hitOptions: ShipmentWithHitOption[] = [];
  selectedShipmentId: number | null = null;

  periodType: PeriodType = 'Monthly';
  today = new Date();
  selectedYear = this.today.getFullYear();
  selectedMonth = this.today.getMonth() + 1;
  selectedQuarter = Math.floor(this.today.getMonth() / 3) + 1;

  businessUnits: LookupEntity[] = [];
  consignees: LookupEntity[] = [];
  shippingLines: LookupEntity[] = [];
  businessUnitId: number | null = null;
  consigneeId: number | null = null;
  shippingLineId: number | null = null;

  years = Array.from({ length: 6 }, (_, i) => this.today.getFullYear() - 4 + i);
  months = [
    { value: 1, label: 'Jan' }, { value: 2, label: 'Feb' }, { value: 3, label: 'Mar' }, { value: 4, label: 'Apr' },
    { value: 5, label: 'May' }, { value: 6, label: 'Jun' }, { value: 7, label: 'Jul' }, { value: 8, label: 'Aug' },
    { value: 9, label: 'Sep' }, { value: 10, label: 'Oct' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dec' }
  ];
  quarters = [1, 2, 3, 4];

  constructor(private service: DemurrageAnalysisService, private lookups: SettingsLookupService) {}

  ngOnInit(): void {
    this.lookups.getAll<LookupEntity>('business-units').subscribe({ next: (r) => { this.businessUnits = r; this.cdr.markForCheck(); } });
    this.lookups.getAll<LookupEntity>('business-partners/consignees').subscribe({ next: (r) => { this.consignees = r; this.cdr.markForCheck(); } });
    this.lookups.getAll<LookupEntity>('shipping-lines').subscribe({ next: (r) => { this.shippingLines = r; this.cdr.markForCheck(); } });
    this.loadOptions();
    this.load();
  }

  private computeRange(): { from: string; to: string } {
    if (this.periodType === 'Monthly') {
      const from = new Date(this.selectedYear, this.selectedMonth - 1, 1);
      const to = new Date(this.selectedYear, this.selectedMonth, 0);
      return { from: this.toIso(from), to: this.toIso(to) };
    }
    if (this.periodType === 'Quarterly') {
      const startMonth = (this.selectedQuarter - 1) * 3;
      const from = new Date(this.selectedYear, startMonth, 1);
      const to = new Date(this.selectedYear, startMonth + 3, 0);
      return { from: this.toIso(from), to: this.toIso(to) };
    }
    const from = new Date(this.selectedYear, 0, 1);
    const to = new Date(this.selectedYear, 11, 31);
    return { from: this.toIso(from), to: this.toIso(to) };
  }

  private toIso(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private currentFilters() {
    const range = this.computeRange();
    return {
      etaFrom: range.from, etaTo: range.to,
      businessUnitId: this.businessUnitId ?? undefined,
      consigneeId: this.consigneeId ?? undefined,
      shippingLineId: this.shippingLineId ?? undefined
    };
  }

  loadOptions(): void {
    this.service.getShipmentsWithHits(this.currentFilters()).subscribe({
      next: (r) => {
        this.hitOptions = r;
        // Reset selection if it no longer matches the filtered set.
        if (this.selectedShipmentId && !r.some((o) => o.shipmentId === this.selectedShipmentId)) {
          this.selectedShipmentId = null;
        }
        this.cdr.markForCheck();
      }
    });
  }

  load(): void {
    this.loading = true;
    const filters = { ...this.currentFilters(), shipmentId: this.selectedShipmentId ?? undefined };
    this.service.get(filters).subscribe({
      next: (r) => { this.data = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  onFilterChange(): void {
    this.loadOptions();
    this.load();
  }

  onShipmentChange(): void {
    this.load();
  }

  clearShipmentSelection(): void {
    this.selectedShipmentId = null;
    this.load();
  }
}
