import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { FilterOption, ProcessPerformanceResult, ProcessPerformanceService, ShipmentSearchResult } from '../process-performance.service';

type PeriodType = 'Monthly' | 'Quarterly' | 'Annual';

@Component({
  selector: 'app-process-performance',
  imports: [CommonModule, FormsModule],
  templateUrl: './process-performance.html'
})
export class ProcessPerformance implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  data: ProcessPerformanceResult | null = null;

  periodType: PeriodType = 'Monthly';
  today = new Date();
  selectedYear = this.today.getFullYear();
  selectedMonth = this.today.getMonth() + 1;
  selectedQuarter = Math.floor(this.today.getMonth() / 3) + 1;
  years = Array.from({ length: 6 }, (_, i) => this.today.getFullYear() - 4 + i);
  months = [
    { value: 1, label: 'Jan' }, { value: 2, label: 'Feb' }, { value: 3, label: 'Mar' }, { value: 4, label: 'Apr' },
    { value: 5, label: 'May' }, { value: 6, label: 'Jun' }, { value: 7, label: 'Jul' }, { value: 8, label: 'Aug' },
    { value: 9, label: 'Sep' }, { value: 10, label: 'Oct' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dec' }
  ];
  quarters = [1, 2, 3, 4];

  // Cascading options — see loadFilterOptions(). Each list only ever
  // contains values that actually appear among ongoing shipments
  // matching every OTHER currently-selected filter, so these narrow
  // (or widen) after every filter change instead of always showing the
  // full Settings lookup.
  businessUnits: FilterOption[] = [];
  consignees: FilterOption[] = [];
  categories: FilterOption[] = [];
  suppliers: FilterOption[] = [];
  shippingLines: FilterOption[] = [];
  senderBanks: FilterOption[] = [];
  receiverBanks: FilterOption[] = [];

  businessUnitId: number | null = null;
  consigneeId: number | null = null;
  categoryId: number | null = null;
  supplierId: number | null = null;
  shippingLineId: number | null = null;
  senderBankId: number | null = null;
  receiverBankId: number | null = null;

  // Selected shipment drives the actual query; searchTerm is just what's
  // typed in the box, decoupled so a selection doesn't get wiped out by
  // the input's own two-way binding.
  selectedShipmentId: number | null = null;
  searchTerm = '';
  searchResults: ShipmentSearchResult[] = [];
  showSearchResults = false;
  private searchTerm$ = new Subject<string>();

  constructor(private service: ProcessPerformanceService) {}

  ngOnInit(): void {
    this.loadFilterOptions();

    this.searchTerm$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term) => term.trim().length >= 3 ? this.service.searchShipments(term.trim()) : [])
    ).subscribe({
      next: (results) => { this.searchResults = results; this.showSearchResults = true; this.cdr.markForCheck(); }
    });

    this.load();
  }

  onSearchInput(): void {
    this.selectedShipmentId = null;
    this.searchTerm$.next(this.searchTerm);
  }

  selectSearchResult(result: ShipmentSearchResult): void {
    this.selectedShipmentId = result.shipmentId;
    this.searchTerm = result.blAwbNo;
    this.showSearchResults = false;
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

  // Shared by load() and loadFilterOptions() so both query the exact
  // same set of "other" filters — shipmentId is deliberately left out
  // here, each caller adds it (or not) itself.
  private currentFilterParams() {
    const range = this.computeRange();
    return {
      etaFrom: range.from, etaTo: range.to,
      businessUnitId: this.businessUnitId ?? undefined,
      consigneeId: this.consigneeId ?? undefined,
      categoryId: this.categoryId ?? undefined,
      supplierId: this.supplierId ?? undefined,
      shippingLineId: this.shippingLineId ?? undefined,
      senderBankId: this.senderBankId ?? undefined,
      receiverBankId: this.receiverBankId ?? undefined
    };
  }

  load(): void {
    this.loading = true;
    const shipmentIdNum = this.selectedShipmentId ?? undefined;
    const range = shipmentIdNum ? { from: undefined, to: undefined } : this.computeRange();

    this.service.get({
      shipmentId: shipmentIdNum,
      etaFrom: range.from, etaTo: range.to,
      businessUnitId: this.businessUnitId ?? undefined,
      consigneeId: this.consigneeId ?? undefined,
      categoryId: this.categoryId ?? undefined,
      supplierId: this.supplierId ?? undefined,
      shippingLineId: this.shippingLineId ?? undefined,
      senderBankId: this.senderBankId ?? undefined,
      receiverBankId: this.receiverBankId ?? undefined
    }).subscribe({
      next: (r) => { this.data = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  // Cascading dropdowns: each list reflects only values that actually
  // appear among ongoing shipments matching every OTHER currently
  // selected filter (self-exclusion happens backend-side). Skipped
  // while a specific shipment is selected — every filter dropdown is
  // disabled in that mode anyway (see the template), so there's
  // nothing for a refreshed list to drive.
  loadFilterOptions(): void {
    if (this.selectedShipmentId) return;
    this.service.getFilterOptions(this.currentFilterParams()).subscribe({
      next: (r) => {
        this.businessUnits = r.businessUnits;
        this.consignees = r.consignees;
        this.categories = r.categories;
        this.suppliers = r.suppliers;
        this.shippingLines = r.shippingLines;
        this.senderBanks = r.senderBanks;
        this.receiverBanks = r.receiverBanks;
        this.cdr.markForCheck();
      }
    });
  }

  onFilterChange(): void {
    this.load();
    this.loadFilterOptions();
  }

  clearShipmentSearch(): void {
    this.selectedShipmentId = null;
    this.searchTerm = '';
    this.searchResults = [];
    this.load();
    this.loadFilterOptions();
  }

  // Positive = faster/ahead (green), negative = slower/behind (red) —
  // consistent everywhere in this dashboard (Execution Speed /
  // Completion Date Delta columns).
  lightColor(value: number | null): string {
    if (value === null) return '#888';
    if (value > 0) return '#1e7e34';
    if (value < 0) return '#c0392b';
    return '#333';
  }

  // Opposite sign from lightColor() above, deliberately — this is the
  // Demurrage-Analysis-style Gap (Actual − Target): overrun is
  // positive/Red, ahead of target is negative/Green. Used only for the
  // new Actual/Target/Gap columns, never for Execution Speed/Completion
  // Date Delta.
  gapColor(value: number | null): string {
    if (value === null) return '#888';
    if (value > 0) return '#c0392b';
    if (value < 0) return '#1e7e34';
    return '#333';
  }

  // Hit rate as a percentage of the shipments matching the current
  // filters — more directly comparable across differently-sized filter
  // groups than the raw count alone.
  get hitRatePercent(): number | null {
    if (!this.data || this.data.shipmentCount === 0) return null;
    return (this.data.hitShipmentCount / this.data.shipmentCount) * 100;
  }

  // Auto-flags whichever step has the worst (most positive/overrun) Gap
  // in the currently filtered set, so the single biggest driver of
  // delay is visible without reading every row. Null when nothing has
  // an actual Gap yet, or every gap is <= 0 (nothing overrunning).
  get bottleneckStepName(): string | null {
    if (!this.data) return null;
    const withGap = this.data.steps.filter((s) => s.gap !== null && s.gap > 0);
    if (withGap.length === 0) return null;
    return withGap.reduce((worst, s) => (s.gap! > worst.gap! ? s : worst)).stepName;
  }
}
