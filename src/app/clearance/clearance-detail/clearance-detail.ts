import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClearanceDetail, ClearanceService } from '../clearance.service';

@Component({
  selector: 'app-clearance-detail',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './clearance-detail.html'
})
export class ClearanceDetailComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  shipmentId!: number;
  detail: ClearanceDetail | null = null;
  loading = true;
  error = '';

  expanded: 'generalInfo' | 'route' | null = 'generalInfo';
  savingGeneralInfo = false;
  savingRoute = false;

  generalInfoForm = {
    copyOfBlReceivedDate: '', originalShipmentSetReceivedDate: '', lcNo: '', declarationNo: '', notes: '', clearanceCompleteDate: ''
  };

  selectedRoute: number = 0;

  constructor(private service: ClearanceService) {}

  ngOnInit(): void {
    this.shipmentId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  load(): void {
    this.service.getDetail(this.shipmentId).subscribe({
      next: (detail) => {
        this.detail = detail;
        this.generalInfoForm = {
          copyOfBlReceivedDate: detail.copyOfBlReceivedDate ?? '',
          originalShipmentSetReceivedDate: detail.originalShipmentSetReceivedDate ?? '',
          lcNo: detail.lcNo ?? '',
          declarationNo: detail.declarationNo ?? '',
          notes: detail.notes ?? '',
          clearanceCompleteDate: detail.clearanceCompleteDate ?? ''
        };
        this.selectedRoute = detail.route;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Could not load clearance details.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  toggle(section: 'generalInfo' | 'route'): void {
    this.expanded = this.expanded === section ? null : section;
  }

  saveGeneralInfo(andNext: boolean): void {
    this.savingGeneralInfo = true;
    this.service.saveGeneralInfo(this.shipmentId, {
      copyOfBlReceivedDate: this.generalInfoForm.copyOfBlReceivedDate || null,
      originalShipmentSetReceivedDate: this.generalInfoForm.originalShipmentSetReceivedDate || null,
      lcNo: this.generalInfoForm.lcNo || null,
      declarationNo: this.generalInfoForm.declarationNo || null,
      notes: this.generalInfoForm.notes || null,
      clearanceCompleteDate: this.generalInfoForm.clearanceCompleteDate || null
    }).subscribe({
      next: () => {
        this.savingGeneralInfo = false;
        if (andNext) this.expanded = 'route';
        this.cdr.markForCheck();
      },
      error: () => {
        this.savingGeneralInfo = false;
        this.error = 'Could not save General Info.';
        this.cdr.markForCheck();
      }
    });
  }

  saveRoute(): void {
    if (!this.selectedRoute) return;
    this.savingRoute = true;
    this.service.setRoute(this.shipmentId, this.selectedRoute).subscribe({
      next: () => {
        this.savingRoute = false;
        if (this.detail) this.detail = { ...this.detail, route: this.selectedRoute };
        this.cdr.markForCheck();
      },
      error: () => {
        this.savingRoute = false;
        this.error = 'Could not save route.';
        this.cdr.markForCheck();
      }
    });
  }

  routeName(route: number): string {
    switch (route) {
      case 1: return 'Route 1 — Clear at Port';
      case 2: return 'Route 2 — FZ Deposit';
      case 3: return 'Route 3 — Clear from FZ';
      default: return 'Not selected';
    }
  }
}
