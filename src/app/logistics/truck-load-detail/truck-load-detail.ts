import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { ThousandsInputDirective } from '../../shared/thousands-input.directive';
import { LoadableAllocation, TruckLoadDetail, TruckLoadService } from '../truck-load.service';

@Component({
  selector: 'app-truck-load-detail',
  imports: [CommonModule, FormsModule, RouterLink, ThousandsInputDirective],
  templateUrl: './truck-load-detail.html'
})
export class TruckLoadDetailComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);

  truckLoadId!: number;
  detail: TruckLoadDetail | null = null;
  loading = true;
  error = '';

  warehouses: LookupEntity[] = [];
  newDropWarehouseId: number | null = null;
  newDropExpectedDeliveryDate = '';
  addingDrop = false;

  expandedDropId: number | null = null;
  loadableByDrop: Record<number, LoadableAllocation[]> = {};
  loadingAllocationsFor: number | null = null;
  newItemAllocationId: Record<number, number | null> = {};
  newItemQty: Record<number, number | null> = {};
  newItemInHousePrice: Record<number, number | null> = {};
  newItemMarketPrice: Record<number, number | null> = {};
  addingItem = false;

  constructor(private service: TruckLoadService, private lookups: SettingsLookupService) {}

  ngOnInit(): void {
    this.truckLoadId = Number(this.route.snapshot.paramMap.get('id'));
    this.lookups.getAll<LookupEntity>('warehouses').subscribe({ next: (r) => { this.warehouses = r; this.cdr.markForCheck(); } });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.getDetail(this.truckLoadId).subscribe({
      next: (d) => {
        this.detail = d;
        for (const drop of d.drops) this.actualDropOffDraft[drop.id] = drop.actualDropOffDate ?? '';
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.error = 'Could not load truck load.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  addDrop(): void {
    if (!this.newDropWarehouseId) return;
    this.addingDrop = true;
    this.service.addDrop(this.truckLoadId, this.newDropWarehouseId, this.newDropExpectedDeliveryDate || null).subscribe({
      next: () => {
        this.addingDrop = false;
        this.newDropWarehouseId = null;
        this.newDropExpectedDeliveryDate = '';
        this.load();
      },
      error: () => { this.addingDrop = false; this.error = 'Could not add drop.'; this.cdr.markForCheck(); }
    });
  }

  removeDrop(dropId: number): void {
    this.service.deleteDrop(dropId).subscribe({ next: () => this.load() });
  }

  savingActualDropOff: Record<number, boolean> = {};
  actualDropOffDraft: Record<number, string> = {};

  saveActualDropOff(dropId: number): void {
    this.savingActualDropOff[dropId] = true;
    this.service.setActualDropOff(dropId, this.actualDropOffDraft[dropId] || null).subscribe({
      next: () => { this.savingActualDropOff[dropId] = false; this.load(); },
      error: () => { this.savingActualDropOff[dropId] = false; this.error = 'Could not save Actual Drop Off Date.'; this.cdr.markForCheck(); }
    });
  }

  toggleDrop(dropId: number): void {
    this.expandedDropId = this.expandedDropId === dropId ? null : dropId;
    if (this.expandedDropId) this.loadAllocationsFor(dropId);
  }

  loadAllocationsFor(dropId: number): void {
    this.loadingAllocationsFor = dropId;
    this.service.getLoadableAllocations(dropId).subscribe({
      next: (r) => {
        this.loadableByDrop[dropId] = r;
        this.loadingAllocationsFor = null;
        this.cdr.markForCheck();
      },
      error: () => { this.loadingAllocationsFor = null; this.cdr.markForCheck(); }
    });
  }

  addItem(dropId: number): void {
    const allocationId = this.newItemAllocationId[dropId];
    const qty = this.newItemQty[dropId];
    if (!allocationId || !qty) return;

    this.addingItem = true;
    this.service.addItem(dropId, {
      warehouseAllocationId: allocationId,
      qty,
      inHousePrice: this.newItemInHousePrice[dropId] ?? null,
      parallelMarketPrice: this.newItemMarketPrice[dropId] ?? null
    }).subscribe({
      next: () => {
        this.addingItem = false;
        this.newItemAllocationId[dropId] = null;
        this.newItemQty[dropId] = null;
        this.newItemInHousePrice[dropId] = null;
        this.newItemMarketPrice[dropId] = null;
        this.loadAllocationsFor(dropId);
        this.load();
      },
      error: (err) => {
        this.addingItem = false;
        this.error = err?.error?.message || 'Could not add item.';
        this.cdr.markForCheck();
      }
    });
  }

  removeItem(itemId: number, dropId: number): void {
    this.service.deleteItem(itemId).subscribe({
      next: () => {
        this.load();
        this.loadAllocationsFor(dropId);
      }
    });
  }
}
