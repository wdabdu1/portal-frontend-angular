import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LookupEntity, SettingsLookupService } from '../../settings/settings-lookup.service';
import { TruckLoadService, TruckLoadSummary } from '../truck-load.service';

@Component({
  selector: 'app-truck-load-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './truck-load-list.html'
})
export class TruckLoadList implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  loads: TruckLoadSummary[] = [];
  loading = true;
  error = '';

  trucks: LookupEntity[] = [];
  drivers: LookupEntity[] = [];

  showNewForm = false;
  newTruckId: number | null = null;
  newDriverId: number | null = null;
  newLoadDate = '';
  newNotes = '';
  creating = false;

  constructor(
    private service: TruckLoadService,
    private lookups: SettingsLookupService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.lookups.getAll<LookupEntity>('trucks').subscribe({ next: (r) => { this.trucks = r.filter((t) => t['isActive']); this.cdr.markForCheck(); } });
    this.lookups.getAll<LookupEntity>('drivers').subscribe({ next: (r) => { this.drivers = r; this.cdr.markForCheck(); } });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (r) => { this.loads = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load truck loads.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  toggleNewForm(): void {
    this.showNewForm = !this.showNewForm;
  }

  onTruckChange(): void {
    const truck = this.trucks.find((t) => t.id === this.newTruckId);
    this.newDriverId = (truck?.['driverId'] as number) ?? null;
  }

  createLoad(): void {
    if (!this.newTruckId || !this.newLoadDate) return;
    this.creating = true;
    this.service.create({
      truckId: this.newTruckId, driverId: this.newDriverId, loadDate: this.newLoadDate, notes: this.newNotes || null
    }).subscribe({
      next: (r) => {
        this.creating = false;
        this.router.navigate(['/logistics/truck-loads', r.id]);
      },
      error: () => { this.creating = false; this.error = 'Could not create truck load.'; this.cdr.markForCheck(); }
    });
  }

  openLoad(id: number): void {
    this.router.navigate(['/logistics/truck-loads', id]);
  }
}
