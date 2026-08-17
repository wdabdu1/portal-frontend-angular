import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { ProcessPerformanceResult, ProcessPerformanceService, ShipmentSearchResult } from '../process-performance.service';

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

  businessUnits: LookupEntity[] = [];
  consignees: LookupEntity[] = [];
  categories: LookupEntity[] = [];
  suppliers: LookupEntity[] = [];
  shippingLines: LookupEntity[] = [];
  senderBanks: LookupEntity[] = [];
  receiverBanks: LookupEntity[] = [];

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

  constructor(private service: ProcessPerformanceService, private lookups: SettingsLookupService) {}

  ngOnInit(): void {
    this.lookups.getAll<LookupEntity>('business-units').subscribe({ next: (r) => { this.businessUnits = r; this.cdr.markForCheck(); } });
    this.lookups.getAll<LookupEntity>('business-partners/consignees').subscribe({ next: (r) => { this.consignees = r; this.cdr.markForCheck(); } });
    this.lookups.getAll<LookupEntity>('product-categories').subscribe({ next: (r) => { this.categories = r; this.cdr.markForCheck(); } });
    this.lookups.getAll<LookupEntity>('business-partners/suppliers').subscribe({ next: (r) => { this.suppliers = r; this.cdr.markForCheck(); } });
    this.lookups.getAll<LookupEntity>('shipping-lines').subscribe({ next: (r) => { this.shippingLines = r; this.cdr.markForCheck(); } });
    this.lookups.getAll<LookupEntity>('sender-banks').subscribe({ next: (r) => { this.senderBanks = r; this.cdr.markForCheck(); } });
    this.lookups.getAll<LookupEntity>('receiver-banks').subscribe({ next: (r) => { this.receiverBanks = r; this.cdr.markForCheck(); } });

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

  onFilterChange(): void {
    this.load();
  }

  clearShipmentSearch(): void {
    this.selectedShipmentId = null;
    this.searchTerm = '';
    this.searchResults = [];
    this.load();
  }

  // Positive = faster/ahead (green), negative = slower/behind (red) —
  // consistent everywhere in this dashboard.
  lightColor(value: number | null): string {
    if (value === null) return '#888';
    if (value > 0) return '#1e7e34';
    if (value < 0) return '#c0392b';
    return '#333';
  }
}
