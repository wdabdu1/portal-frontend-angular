import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { LookupEntity, SettingsLookupService } from '../settings-lookup.service';
import { ThousandsInputDirective } from '../../shared/thousands-input.directive';
import { ShippingLine, ShippingLinesService, TariffRow } from './shipping-lines.service';

interface RatesBySize {
  firstPeriodDays: number;
  firstPeriodRateSdg: number;
  afterwardRateSdg: number;
}

@Component({
  selector: 'app-shipping-lines',
  imports: [CommonModule, FormsModule, RouterLink, ThousandsInputDirective],
  templateUrl: './shipping-lines.html'
})
export class ShippingLines implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  lines: ShippingLine[] = [];
  tariffGroups: LookupEntity[] = [];
  loading = true;
  error = '';

  sizes: ('20' | '40')[] = ['20', '40'];

  expandedLineId: number | null = null;
  editRates: Record<number, Record<string, RatesBySize>> = {};
  editFreeDays: Record<number, Record<string, Record<number, number>>> = {};
  savingTariffs: Record<number, boolean> = {};

  newLineName = '';
  newRates: Record<string, RatesBySize> = {};
  newFreeDays: Record<string, Record<number, number>> = {};
  addingLine = false;
  showAddForm = false;

  constructor(private service: ShippingLinesService, private lookups: SettingsLookupService, public auth: AuthService) {}

  get canEdit(): boolean {
    return this.auth.hasRole('Manager') || this.auth.hasRole('SuperUser');
  }

  ngOnInit(): void {
    this.lookups.getAll<LookupEntity>('tariff-groups').subscribe({
      next: (r) => {
        this.tariffGroups = r;
        this.backfillMissingTariffGroups();
        this.cdr.markForCheck();
      }
    });
    this.load();
  }

  // If a line's edit form was expanded before the tariff-groups lookup
  // finished loading, its Free Days table would otherwise stay stuck
  // with zero rows forever (it's only ever initialized once). This
  // fills in any tariff group that's missing from an already-cached
  // line, regardless of how the two loads happened to race.
  private backfillMissingTariffGroups(): void {
    for (const lineId of Object.keys(this.editFreeDays).map(Number)) {
      for (const size of this.sizes) {
        if (!this.editFreeDays[lineId][size]) this.editFreeDays[lineId][size] = {};
        for (const g of this.tariffGroups) {
          if (!(g.id in this.editFreeDays[lineId][size])) this.editFreeDays[lineId][size][g.id] = 0;
        }
      }
    }
  }

  load(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (r) => { this.lines = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load Shipping Lines.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  private emptyRates(): Record<string, RatesBySize> {
    const rates: Record<string, RatesBySize> = {};
    for (const size of this.sizes) {
      rates[size] = { firstPeriodDays: 0, firstPeriodRateSdg: 0, afterwardRateSdg: 0 };
    }
    return rates;
  }

  private emptyFreeDays(): Record<string, Record<number, number>> {
    const freeDays: Record<string, Record<number, number>> = {};
    for (const size of this.sizes) {
      freeDays[size] = {};
      for (const g of this.tariffGroups) freeDays[size][g.id] = 0;
    }
    return freeDays;
  }

  tariffGroupName(id: number): string {
    return (this.tariffGroups.find((g) => g.id === id)?.['name'] as string) ?? '';
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (this.showAddForm) {
      this.newRates = this.emptyRates();
      this.newFreeDays = this.emptyFreeDays();
    }
  }

  private buildTariffRows(rates: Record<string, RatesBySize>, freeDays: Record<string, Record<number, number>>): TariffRow[] {
    const rows: TariffRow[] = [];
    for (const size of this.sizes) {
      for (const g of this.tariffGroups) {
        rows.push({
          tariffGroupId: g.id,
          containerSize: size,
          freeDays: freeDays[size]?.[g.id] ?? 0,
          firstPeriodDays: rates[size].firstPeriodDays,
          firstPeriodRateSdg: rates[size].firstPeriodRateSdg,
          afterwardRateSdg: rates[size].afterwardRateSdg
        });
      }
    }
    return rows;
  }

  addLine(): void {
    if (!this.newLineName) return;
    this.addingLine = true;
    this.service.create(this.newLineName, this.buildTariffRows(this.newRates, this.newFreeDays)).subscribe({
      next: () => {
        this.addingLine = false;
        this.newLineName = '';
        this.showAddForm = false;
        this.load();
      },
      error: () => { this.addingLine = false; this.error = 'Could not create shipping line.'; this.cdr.markForCheck(); }
    });
  }

  toggleExpand(line: ShippingLine): void {
    if (this.expandedLineId === line.id) {
      this.expandedLineId = null;
      return;
    }
    this.expandedLineId = line.id;
    if (!this.editRates[line.id]) {
      const rates = this.emptyRates();
      const freeDays = this.emptyFreeDays();

      for (const size of this.sizes) {
        // Rates are shared across Tariff Groups for a given size — take
        // whichever existing row of this size we find first.
        const anyRowForSize = line.tariffs.find((t) => t.containerSize === size);
        if (anyRowForSize) {
          rates[size] = {
            firstPeriodDays: anyRowForSize.firstPeriodDays,
            firstPeriodRateSdg: anyRowForSize.firstPeriodRateSdg,
            afterwardRateSdg: anyRowForSize.afterwardRateSdg
          };
        }
        for (const g of this.tariffGroups) {
          const row = line.tariffs.find((t) => t.containerSize === size && t.tariffGroupId === g.id);
          if (row) freeDays[size][g.id] = row.freeDays;
        }
      }

      this.editRates[line.id] = rates;
      this.editFreeDays[line.id] = freeDays;
    }
  }

  saveTariffs(line: ShippingLine): void {
    this.savingTariffs[line.id] = true;
    const rows = this.buildTariffRows(this.editRates[line.id], this.editFreeDays[line.id]);
    this.service.replaceTariffs(line.id, rows).subscribe({
      next: () => { this.savingTariffs[line.id] = false; this.load(); },
      error: () => { this.savingTariffs[line.id] = false; this.error = 'Could not save tariffs.'; this.cdr.markForCheck(); }
    });
  }
}
