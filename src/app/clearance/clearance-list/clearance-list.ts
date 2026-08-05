import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TablePreferencesService } from '../../table-preferences/table-preferences.service';
import { ClearanceService, ClearanceShipmentSummary } from '../clearance.service';

type SortColumn = keyof ClearanceShipmentSummary;

const ROUTE_LABELS: Record<string, string> = {
  NotSelected: 'Not Started',
  Route1ClearAtPort: 'Clear at Port',
  Route2FzDeposit: 'FZ Deposit',
  Route3ClearFromFz: 'Clear from FZ'
};

@Component({
  selector: 'app-clearance-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './clearance-list.html'
})
export class ClearanceList implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  allShipments: ClearanceShipmentSummary[] = [];
  loading = true;
  error = '';
  searchText = '';
  sortColumn: SortColumn = 'eta';
  sortAsc = true;

  filterBusinessUnit = '';
  filterCategory = '';

  constructor(private service: ClearanceService, private router: Router, private tablePrefs: TablePreferencesService) {}

  ngOnInit(): void {
    this.tablePrefs.get('clearance').subscribe({
      next: (pref) => {
        if (pref) {
          this.sortColumn = pref.sortColumn as SortColumn;
          this.sortAsc = pref.sortAsc;
        }
        this.load();
      },
      error: () => this.load()
    });
  }

  load(): void {
    this.loading = true;
    this.service.getShipmentsForClearance(this.searchText || undefined).subscribe({
      next: (r) => { this.allShipments = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load shipments.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  onSearchChange(): void {
    this.load();
  }

  get businessUnitOptions(): string[] {
    return [...new Set(this.allShipments.map((s) => s.businessUnit))].sort();
  }

  get categoryOptions(): string[] {
    return [...new Set(this.allShipments.map((s) => s.category))].sort();
  }

  get shipments(): ClearanceShipmentSummary[] {
    let filtered = this.allShipments;
    if (this.filterBusinessUnit) filtered = filtered.filter((s) => s.businessUnit === this.filterBusinessUnit);
    if (this.filterCategory) filtered = filtered.filter((s) => s.category === this.filterCategory);

    const dir = this.sortAsc ? 1 : -1;
    return [...filtered].sort((a, b) => {
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
    this.tablePrefs.save('clearance', this.sortColumn, this.sortAsc).subscribe();
  }

  routeLabel(status: string): string {
    return ROUTE_LABELS[status] ?? status;
  }

  viewDetails(shipmentId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.router.navigate(['/shipments', shipmentId]);
  }

  goToClearance(shipmentId: number): void {
    this.router.navigate(['/clearance', shipmentId]);
  }

  trafficColor(light: string): string {
    switch (light) {
      case 'Green': return '#2a7d2a';
      case 'Amber': return '#c98a00';
      case 'Red': return '#c0392b';
      default: return '#999';
    }
  }
}
