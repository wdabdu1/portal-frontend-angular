import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { ThousandsInputDirective } from '../../shared/thousands-input.directive';
import { ClearanceEstimateLineItem, ClearanceService } from '../clearance.service';

type SortColumn = keyof ClearanceEstimateLineItem;

@Component({
  selector: 'app-estimate-line-items',
  imports: [CommonModule, FormsModule, RouterLink, ThousandsInputDirective],
  templateUrl: './estimate-line-items.html'
})
export class EstimateLineItems implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);

  shipmentId!: number;
  items: ClearanceEstimateLineItem[] = [];
  chargeTypes: LookupEntity[] = [];
  loading = true;
  error = '';
  adding = false;

  sortColumn: SortColumn = 'dueDate';
  sortAsc = true;

  newChargeTypeId: number | null = null;
  newValueSdg: number | null = null;
  newDueDate = '';

  constructor(private lookups: SettingsLookupService, private service: ClearanceService) {}

  ngOnInit(): void {
    this.shipmentId = Number(this.route.snapshot.paramMap.get('id'));
    this.lookups.getAll<LookupEntity>('clearance-charge-types').subscribe({
      next: (r) => { this.chargeTypes = r; this.cdr.markForCheck(); }
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.getEstimateLineItems(this.shipmentId).subscribe({
      next: (r) => { this.items = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load estimate items.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  get sortedItems(): ClearanceEstimateLineItem[] {
    const dir = this.sortAsc ? 1 : -1;
    return [...this.items].sort((a, b) => {
      const av = a[this.sortColumn];
      const bv = b[this.sortColumn];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }

  sortBy(column: SortColumn): void {
    if (this.sortColumn === column) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortColumn = column;
      this.sortAsc = true;
    }
  }

  get total(): number {
    return this.items.reduce((sum, i) => sum + i.valueSdg, 0);
  }

  add(): void {
    if (!this.newChargeTypeId || !this.newValueSdg) return;
    this.adding = true;
    this.service.addEstimateLineItem(this.shipmentId, {
      chargeTypeId: this.newChargeTypeId,
      valueSdg: this.newValueSdg,
      dueDate: this.newDueDate || null
    }).subscribe({
      next: () => {
        this.adding = false;
        this.newChargeTypeId = null;
        this.newValueSdg = null;
        this.newDueDate = '';
        this.load();
      },
      error: () => { this.adding = false; this.error = 'Could not add item.'; this.cdr.markForCheck(); }
    });
  }

  remove(id: number): void {
    this.service.deleteEstimateLineItem(this.shipmentId, id).subscribe({
      next: () => this.load(),
      error: () => { this.error = 'Could not remove item.'; this.cdr.markForCheck(); }
    });
  }
}
