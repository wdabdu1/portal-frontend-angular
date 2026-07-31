import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ThousandsInputDirective } from '../../shared/thousands-input.directive';
import {
  ClearanceDetail, ClearanceRoute1Details, ClearanceRoute2Details, ClearanceRoute3Details, ClearanceService
} from '../clearance.service';

@Component({
  selector: 'app-clearance-detail',
  imports: [CommonModule, FormsModule, RouterLink, ThousandsInputDirective],
  templateUrl: './clearance-detail.html'
})
export class ClearanceDetailComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);

  shipmentId!: number;
  detail: ClearanceDetail | null = null;
  loading = true;
  error = '';

  expanded: 'generalInfo' | 'route' | 'routeDetail' | null = 'generalInfo';
  savingGeneralInfo = false;
  savingRoute = false;
  savingRouteDetail = false;

  generalInfoForm = {
    copyOfBlReceivedDate: '', originalShipmentSetReceivedDate: '', lcNo: '', declarationNo: '', notes: '', clearanceCompleteDate: ''
  };

  selectedRoute: number = 0;

  route1Form: ClearanceRoute1Details = this.emptyRoute1();
  route2Form: ClearanceRoute2Details = this.emptyRoute2();
  route3Form: ClearanceRoute3Details = this.emptyRoute3();

  constructor(private service: ClearanceService) {}

  ngOnInit(): void {
    this.shipmentId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  emptyRoute1(): ClearanceRoute1Details {
    return {
      moveRequestDate: null, billAmountSdg: null, billSettlementDate: null,
      ssmoFileRequestDate: null, ssmoInspectionAmountSdg: null, ssmoFeesSettlementDate: null,
      custExamStartDate: null, custExamCompletedDate: null,
      customsLabRequired: false, customsLabFeesSdg: null, labFeesPaymentDate: null, labResultIssuanceDate: null,
      ssmoExamStartDate: null, ssmoCertIssuanceDate: null,
      custEvaluationDate: null, customsDutySdg: null, customsSettlementDate: null, releaseExitPassDate: null,
      spcBillRequestDate: null, spcBillValueSdg: null, spcBillSettlementDate: null,
      truckPortEntryPermitDate: null, containersReturnedDate: null, clearanceActualCompletedDate: null
    };
  }

  emptyRoute2(): ClearanceRoute2Details {
    return {
      depositRequestDate: null, requestApprovalDate: null,
      inspectionDate: null,
      spcBillRequestDate: null, spcBillValueSdg: null, spcBillSettlementDate: null, policeSecurityAppointedDate: null,
      truckPortEntryPermitDate: null, containersReceivedAtFzDate: null, containersReturnedDate: null, clearanceActualCompletedDate: null
    };
  }

  emptyRoute3(): ClearanceRoute3Details {
    return {
      certificateEntryDate: null, scudaDeclarationNo: null,
      ssmoFileRequestDate: null, ssmoInspectionAmountSdg: null, ssmoFeesSettlementDate: null,
      custExamStartDate: null, custExamCompletedDate: null,
      customsLabRequired: false, customsLabFeesSdg: null, labFeesPaymentDate: null, labResultIssuanceDate: null,
      ssmoExamStartDate: null, ssmoCertIssuanceDate: null,
      custEvaluationDate: null, customsDutySdg: null, customsSettlementDate: null, releaseExitPassDate: null,
      truckPortEntryPermitDate: null, clearanceActualCompletedDate: null
    };
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
        this.loadRouteDetail();
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Could not load clearance details.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadRouteDetail(): void {
    if (this.selectedRoute === 1) {
      this.service.getRoute1(this.shipmentId).subscribe({
        next: (r) => { if (r) this.route1Form = r; this.cdr.markForCheck(); }
      });
    } else if (this.selectedRoute === 2) {
      this.service.getRoute2(this.shipmentId).subscribe({
        next: (r) => { if (r) this.route2Form = r; this.cdr.markForCheck(); }
      });
    } else if (this.selectedRoute === 3) {
      this.service.getRoute3(this.shipmentId).subscribe({
        next: (r) => { if (r) this.route3Form = r; this.cdr.markForCheck(); }
      });
    }
  }

  toggle(section: 'generalInfo' | 'route' | 'routeDetail'): void {
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
        if (this.detail) {
          this.detail = { ...this.detail, route: this.selectedRoute };
        }
        this.loadRouteDetail();
        this.expanded = 'routeDetail';
        this.cdr.markForCheck();
      },
      error: () => {
        this.savingRoute = false;
        this.error = 'Could not save route.';
        this.cdr.markForCheck();
      }
    });
  }

  saveRouteDetail(): void {
    this.savingRouteDetail = true;
    const save$ = this.selectedRoute === 1
      ? this.service.saveRoute1(this.shipmentId, this.route1Form)
      : this.selectedRoute === 2
      ? this.service.saveRoute2(this.shipmentId, this.route2Form)
      : this.service.saveRoute3(this.shipmentId, this.route3Form);

    save$.subscribe({
      next: () => {
        this.savingRouteDetail = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.savingRouteDetail = false;
        this.error = 'Could not save route details.';
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
