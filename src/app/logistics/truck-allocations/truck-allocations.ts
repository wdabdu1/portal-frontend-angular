import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { exportToExcel } from '../../shared/excel-export.util';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { ReadyForTruckAssignment, TruckLoadService } from '../truck-load.service';

interface CityGroup {
  city: string;
  items: ReadyForTruckAssignment[];
  totalRemaining: number;
}

@Component({
  selector: 'app-truck-allocations',
  imports: [CommonModule, FormsModule],
  templateUrl: './truck-allocations.html'
})
export class TruckAllocations implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  allItems: ReadyForTruckAssignment[] = [];
  loading = true;
  error = '';

  trucks: LookupEntity[] = [];
  drivers: LookupEntity[] = [];

  expandedCity: string | null = null;
  qtyByAllocationId: Record<number, number | null> = {};
  inHousePriceByAllocationId: Record<number, number | null> = {};
  parallelMarketPriceByAllocationId: Record<number, number | null> = {};

  assignTruckId: number | null = null;
  assignDriverId: number | null = null;
  assignLoadDate = '';
  assignExpectedDeliveryDate = '';
  assigning = false;
  assignError = '';

  constructor(
    private service: TruckLoadService,
    private lookups: SettingsLookupService
  ) {}

  ngOnInit(): void {
    this.lookups.getAll<LookupEntity>('trucks').subscribe({ next: (r) => { this.trucks = r.filter((t) => t['isActive']); this.cdr.markForCheck(); } });
    this.lookups.getAll<LookupEntity>('drivers').subscribe({ next: (r) => { this.drivers = r; this.cdr.markForCheck(); } });
    this.load();
  }

  // Computed once per load, not on every change-detection cycle — this
  // used to be a live getter, which meant *ngFor got a brand-new array of
  // brand-new objects on every keystroke/click and had to rebuild the
  // entire table's DOM each time, which is what caused the page to hang.
  groups: CityGroup[] = [];

  private computeGroups(): void {
    const byCity = new Map<string, ReadyForTruckAssignment[]>();
    for (const item of this.allItems) {
      const key = item.city || 'No City Set';
      if (!byCity.has(key)) byCity.set(key, []);
      byCity.get(key)!.push(item);
    }
    this.groups = Array.from(byCity.entries())
      .map(([city, items]) => ({ city, items, totalRemaining: items.reduce((sum, i) => sum + i.remainingQty, 0) }))
      .sort((a, b) => a.city.localeCompare(b.city));
  }

  load(): void {
    this.loading = true;
    this.service.getReadyForAssignment().subscribe({
      next: (r) => { this.allItems = r; this.computeGroups(); this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load items ready for assignment.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  onExportClick(): void {
    const flat = this.allItems.map((i) => ({
      city: i.city || 'No City Set', warehouseName: i.warehouseName, businessUnit: i.businessUnit,
      blAwbNo: i.blAwbNo, modelProduct: i.modelProduct, unit: i.unit, remainingQty: i.remainingQty
    }));
    exportToExcel('Truck Allocations', [
      { key: 'city', label: 'City' }, { key: 'warehouseName', label: 'Warehouse' }, { key: 'businessUnit', label: 'BU' },
      { key: 'blAwbNo', label: 'BL No.' }, { key: 'modelProduct', label: 'Product/Model' }, { key: 'unit', label: 'Unit' },
      { key: 'remainingQty', label: 'Remaining Qty' }
    ], flat);
  }

  toggleCity(city: string): void {
    if (this.expandedCity === city) {
      this.expandedCity = null;
      return;
    }
    this.expandedCity = city;
    this.qtyByAllocationId = {};
    this.inHousePriceByAllocationId = {};
    this.parallelMarketPriceByAllocationId = {};
    const group = this.groups.find((g) => g.city === city);
    if (group) for (const item of group.items) this.qtyByAllocationId[item.warehouseAllocationId] = item.remainingQty;
    this.assignTruckId = null;
    this.assignDriverId = null;
    this.assignLoadDate = '';
    this.assignExpectedDeliveryDate = '';
    this.assignError = '';
  }

  onTruckChange(): void {
    const truck = this.trucks.find((t) => t.id === this.assignTruckId);
    this.assignDriverId = (truck?.['driverId'] as number) ?? null;
  }

  confirmAssignment(group: CityGroup): void {
    if (!this.assignTruckId || !this.assignLoadDate) return;
    const items = group.items
      .filter((i) => (this.qtyByAllocationId[i.warehouseAllocationId] ?? 0) > 0)
      .map((i) => ({
        warehouseAllocationId: i.warehouseAllocationId, qty: this.qtyByAllocationId[i.warehouseAllocationId]!,
        inHousePrice: this.inHousePriceByAllocationId[i.warehouseAllocationId] ?? null,
        parallelMarketPrice: this.parallelMarketPriceByAllocationId[i.warehouseAllocationId] ?? null
      }));
    if (items.length === 0) { this.assignError = 'Enter a quantity for at least one item.'; return; }

    // Every item in a city group can span different warehouses within
    // that city — quick-assign is per-warehouse, so group once more here.
    const byWarehouse = new Map<number, typeof items>();
    for (const item of items) {
      const source = group.items.find((i) => i.warehouseAllocationId === item.warehouseAllocationId)!;
      if (!byWarehouse.has(source.warehouseId)) byWarehouse.set(source.warehouseId, []);
      byWarehouse.get(source.warehouseId)!.push(item);
    }

    this.assigning = true;
    this.assignError = '';
    const warehouseIds = Array.from(byWarehouse.keys());
    let remaining = warehouseIds.length;
    let hadError = false;

    for (const warehouseId of warehouseIds) {
      this.service.quickAssign({
        truckId: this.assignTruckId, driverId: this.assignDriverId, loadDate: this.assignLoadDate,
        warehouseId, expectedDeliveryDate: this.assignExpectedDeliveryDate || null,
        items: byWarehouse.get(warehouseId)!
      }).subscribe({
        next: () => {
          remaining--;
          if (remaining === 0 && !hadError) {
            this.assigning = false;
            this.expandedCity = null;
            this.load();
          }
        },
        error: (err: any) => {
          hadError = true;
          this.assigning = false;
          this.assignError = err?.error?.message || 'Could not assign truck.';
          this.cdr.markForCheck();
        }
      });
    }
  }
}
