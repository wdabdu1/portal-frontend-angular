import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { DepartmentPerformanceResponse, DepartmentPerformanceService } from '../department-performance.service';

type PeriodType = 'Monthly' | 'Quarterly' | 'Annual';

@Component({
  selector: 'app-department-performance',
  imports: [CommonModule, FormsModule],
  templateUrl: './department-performance.html'
})
export class DepartmentPerformance implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  data: DepartmentPerformanceResponse | null = null;

  periodType: PeriodType = 'Monthly';
  today = new Date();
  selectedYear = this.today.getFullYear();
  selectedMonth = this.today.getMonth() + 1; // 1-12
  selectedQuarter = Math.floor(this.today.getMonth() / 3) + 1; // 1-4

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

  constructor(private service: DepartmentPerformanceService, private lookups: SettingsLookupService) {}

  ngOnInit(): void {
    this.lookups.getAll<LookupEntity>('business-units').subscribe({ next: (r) => { this.businessUnits = r; this.cdr.markForCheck(); } });
    this.lookups.getAll<LookupEntity>('business-partners/consignees').subscribe({ next: (r) => { this.consignees = r; this.cdr.markForCheck(); } });
    this.lookups.getAll<LookupEntity>('shipping-lines').subscribe({ next: (r) => { this.shippingLines = r; this.cdr.markForCheck(); } });
    this.load();
  }

  // ETA-based period window — computed client-side, sent as a plain
  // date range so the backend stays a simple filter, not a calendar.
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
    const range = this.computeRange();
    this.service.get({
      etaFrom: range.from, etaTo: range.to,
      businessUnitId: this.businessUnitId ?? undefined,
      consigneeId: this.consigneeId ?? undefined,
      shippingLineId: this.shippingLineId ?? undefined
    }).subscribe({
      next: (r) => { this.data = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  onFilterChange(): void {
    this.load();
  }

  get fzTotalDeposits(): number {
    return this.data?.freeZoneBreakdowns.reduce((sum, fz) => sum + fz.depositCount, 0) ?? 0;
  }
  get fzTotalWithdrawals(): number {
    return this.data?.freeZoneBreakdowns.reduce((sum, fz) => sum + fz.withdrawalCount, 0) ?? 0;
  }
  get fzAvgInventoryDays(): number | null {
    const withValue = this.data?.freeZoneBreakdowns.filter((fz) => fz.daysOfInventory !== null) ?? [];
    if (withValue.length === 0) return null;
    return withValue.reduce((sum, fz) => sum + fz.daysOfInventory!, 0) / withValue.length;
  }

  get statusBars(): { label: string; count: number; valueUsd: number; color: string }[] {
    if (!this.data) return [];
    return [
      { label: 'Draft', count: this.data.draftCount, valueUsd: this.data.draftValueUsd, color: '#888' },
      { label: 'In Transit', count: this.data.inTransitCount, valueUsd: this.data.inTransitValueUsd, color: '#0a3d62' },
      { label: 'Under Clearance', count: this.data.underClearanceCount, valueUsd: this.data.underClearanceValueUsd, color: '#a66a00' },
      { label: 'Delivered', count: this.data.deliveredCount, valueUsd: this.data.deliveredValueUsd, color: '#1e7e34' }
    ];
  }

  get maxStatusCount(): number {
    return Math.max(1, ...this.statusBars.map((b) => b.count));
  }
}
