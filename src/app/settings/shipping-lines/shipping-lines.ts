import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { LookupEntity, SettingsLookupService } from '../settings-lookup.service';
import { ThousandsInputDirective } from '../../shared/thousands-input.directive';
import { ShippingLine, ShippingLinesService, TariffRow } from './shipping-lines.service';

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

  expandedLineId: number | null = null;
  editTariffs: Record<number, TariffRow[]> = {};
  savingTariffs: Record<number, boolean> = {};

  newLineName = '';
  newLineTariffs: TariffRow[] = [];
  addingLine = false;
  showAddForm = false;

  constructor(private service: ShippingLinesService, private lookups: SettingsLookupService, public auth: AuthService) {}

  get canEdit(): boolean {
    return this.auth.hasRole('Manager') || this.auth.hasRole('SuperUser');
  }

  ngOnInit(): void {
    this.lookups.getAll<LookupEntity>('tariff-groups').subscribe({
      next: (r) => { this.tariffGroups = r; this.cdr.markForCheck(); }
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (r) => { this.lines = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load Shipping Lines.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  emptyTariffGrid(): TariffRow[] {
    const rows: TariffRow[] = [];
    for (const g of this.tariffGroups) {
      rows.push({ tariffGroupId: g.id, containerSize: '20', freeDays: 0, firstPeriodDays: 0, firstPeriodRateSdg: 0, afterwardRateSdg: 0 });
      rows.push({ tariffGroupId: g.id, containerSize: '40', freeDays: 0, firstPeriodDays: 0, firstPeriodRateSdg: 0, afterwardRateSdg: 0 });
    }
    return rows;
  }

  tariffGroupName(id: number): string {
    return (this.tariffGroups.find((g) => g.id === id)?.['name'] as string) ?? '';
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (this.showAddForm && this.newLineTariffs.length === 0) {
      this.newLineTariffs = this.emptyTariffGrid();
    }
  }

  addLine(): void {
    if (!this.newLineName) return;
    this.addingLine = true;
    this.service.create(this.newLineName, this.newLineTariffs).subscribe({
      next: () => {
        this.addingLine = false;
        this.newLineName = '';
        this.newLineTariffs = [];
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
    if (!this.editTariffs[line.id]) {
      // Merge existing tariffs into a full grid (every Tariff Group x size combination),
      // so missing combinations still show as editable zero-rows.
      const grid = this.emptyTariffGrid();
      for (const row of grid) {
        const existing = line.tariffs.find((t) => t.tariffGroupId === row.tariffGroupId && t.containerSize === row.containerSize);
        if (existing) Object.assign(row, existing);
      }
      this.editTariffs[line.id] = grid;
    }
  }

  saveTariffs(line: ShippingLine): void {
    this.savingTariffs[line.id] = true;
    this.service.replaceTariffs(line.id, this.editTariffs[line.id]).subscribe({
      next: () => { this.savingTariffs[line.id] = false; this.load(); },
      error: () => { this.savingTariffs[line.id] = false; this.error = 'Could not save tariffs.'; this.cdr.markForCheck(); }
    });
  }
}
