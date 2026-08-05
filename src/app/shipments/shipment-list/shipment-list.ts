import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TablePreferencesService } from '../../table-preferences/table-preferences.service';
import { ShipmentSummary, ShipmentsService } from '../shipments.service';

type SortColumn = keyof ShipmentSummary;

@Component({
  selector: 'app-shipment-list',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './shipment-list.html'
})
export class ShipmentList implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  allShipments: ShipmentSummary[] = [];
  loading = true;
  error = '';

  sortColumn: SortColumn = 'blAwbNo';
  sortAsc = true;

  filterBusinessUnit = '';
  filterStatus = '';

  constructor(private shipmentsService: ShipmentsService, private router: Router, private tablePrefs: TablePreferencesService) {}

  viewDetails(id: number): void {
    this.router.navigate(['/shipments', id]);
  }

  ngOnInit(): void {
    this.tablePrefs.get('shipments').subscribe({
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
    this.shipmentsService.getAll().subscribe({
      next: (shipments) => {
        this.allShipments = shipments;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Could not load shipments.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  get businessUnitOptions(): string[] {
    return [...new Set(this.allShipments.map((s) => s.businessUnit))].sort();
  }

  get statusOptions(): string[] {
    return [...new Set(this.allShipments.map((s) => s.status))].sort();
  }

  get shipments(): ShipmentSummary[] {
    let filtered = this.allShipments;
    if (this.filterBusinessUnit) filtered = filtered.filter((s) => s.businessUnit === this.filterBusinessUnit);
    if (this.filterStatus) filtered = filtered.filter((s) => s.status === this.filterStatus);

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
    this.tablePrefs.save('shipments', this.sortColumn, this.sortAsc).subscribe();
  }
}
