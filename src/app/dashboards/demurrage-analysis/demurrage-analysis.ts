import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { AuthService } from '../../auth/auth.service';
import { DemurrageAnalysisResult, DemurrageAnalysisService, ForecastRecalcResult, ShipmentWithHitOption } from '../demurrage-analysis.service';

type PeriodType = 'Monthly' | 'Quarterly' | 'Annual';

@Component({
  selector: 'app-demurrage-analysis',
  imports: [CommonModule, FormsModule],
  templateUrl: './demurrage-analysis.html'
})
export class DemurrageAnalysis implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private auth = inject(AuthService);

  // Manager / SuperUser: one-click "recalculate all forecasts"
  get canRecalcForecasts(): boolean { return this.auth.hasRole('Manager') || this.auth.hasRole('SuperUser'); }
  recalcBusy = false;
  recalcConfirm = false;
  recalcResult: ForecastRecalcResult | null = null;
  recalcError = '';

  recalcAll(): void {
    this.recalcBusy = true;
    this.recalcError = '';
    this.recalcResult = null;
    this.service.recalculateAllForecasts().subscribe({
      next: (r) => {
        this.recalcBusy = false;
        this.recalcConfirm = false;
        this.recalcResult = r;
        this.onFilterChange();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.recalcBusy = false;
        this.recalcError = err?.error?.message ?? 'Could not recalculate the forecasts.';
        this.cdr.markForCheck();
      }
    });
  }

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

  // Subtotal only counts steps actually reached (actualDaysTaken set) —
  // matching what the table itself already displays row by row. The
  // grand total (subtotal + weekends + holidays) should reconcile with
  // ETA -> Container Return as a sanity check that nothing's double
  // counted or missing.
  get stepDaysSubtotal(): number {
    if (!this.data) return 0;
    return this.data.stepGaps.reduce((sum, g) => sum + (g.actualDaysTaken ?? 0), 0);
  }
  get slaDaysSubtotal(): number {
    if (!this.data) return 0;
    return this.data.stepGaps.reduce((sum, g) => sum + (g.targetDays ?? 0), 0);
  }
  get gapSubtotal(): number {
    return this.stepDaysSubtotal - this.slaDaysSubtotal;
  }
  // Quick sanity checks for the headline: the charge the portal calculates must follow from days spent vs
  // free days, and money actually paid with no chargeable days (or the reverse) deserves a second look.
  get chargeChecks(): string[] {
    const d = this.data;
    const tl = d?.timeline;
    if (!d || !tl) return [];
    const out: string[] = [];
    const maxChg = (lines: { chargeableDays: number }[]) => lines.reduce((m, l) => Math.max(m, l.chargeableDays), 0);
    const demChg = maxChg(tl.demurrage.lines);
    const stoChg = maxChg(tl.storage.lines);
    const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });

    if ((d.actualDemurragePaidSdg ?? 0) > 0 && demChg === 0)
      out.push(`${fmt(d.actualDemurragePaidSdg!)} SDG demurrage was paid, but ${tl.demurrage.elapsedDays} day(s) spent is within the free days - the portal calculates 0 chargeable days. Check the arrival / return dates or the shipping line's invoice.`);
    if ((d.actualStoragePaidSdg ?? 0) > 0 && stoChg === 0)
      out.push(`${fmt(d.actualStoragePaidSdg!)} SDG storage was paid, but ${tl.storage.elapsedDays} day(s) spent is within the free storage days - the portal calculates 0 chargeable days. Check the arrival / truck port entry dates or the port invoice.`);
    if (d.demurrageCostSdg > 0 && (d.actualDemurragePaidSdg ?? 0) === 0 && tl.demurrage.endIsActual)
      out.push(`The portal calculates ${fmt(d.demurrageCostSdg)} SDG demurrage (${demChg} chargeable day(s)) but no demurrage payment is recorded.`);
    if (d.storageCostSdg > 0 && (d.actualStoragePaidSdg ?? 0) === 0 && tl.storage.endIsActual)
      out.push(`The portal calculates ${fmt(d.storageCostSdg)} SDG storage (${stoChg} chargeable day(s)) but no storage payment is recorded.`);
    return out;
  }

  get grandTotalDays(): number {
    if (!this.data) return 0;
    return this.stepDaysSubtotal + this.data.weekendDays + this.data.holidayDays;
  }

  clearShipmentSelection(): void {
    this.selectedShipmentId = null;
    this.load();
  }
}
