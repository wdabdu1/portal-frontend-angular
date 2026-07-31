import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { LookupEntity, SettingsLookupService } from '../settings-lookup.service';

interface FxRate extends LookupEntity {
  currencyId: number;
  rateToUsd: number;
  effectiveDate: string;
}

@Component({
  selector: 'app-fx-rates',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './fx-rates.html'
})
export class FxRates implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  rates: FxRate[] = [];
  currencies: LookupEntity[] = [];
  loading = true;
  error = '';

  newCurrencyId: number | null = null;
  newRateToUsd: number | null = null;
  newEffectiveDate = '';

  constructor(private lookups: SettingsLookupService, public auth: AuthService) {}

  get canEdit(): boolean {
    return this.auth.hasRole('Manager') || this.auth.hasRole('SuperUser');
  }

  ngOnInit(): void {
    this.lookups.getAll<LookupEntity>('currencies').subscribe({
      next: (r) => { this.currencies = r; this.cdr.markForCheck(); }
    });
    this.load();
  }

  currencyCode(id: number): string {
    return (this.currencies.find((c) => c.id === id)?.['code'] as string) ?? '';
  }

  load(): void {
    this.loading = true;
    this.lookups.getAll<FxRate>('fx-rates').subscribe({
      next: (r) => { this.rates = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load FX rates.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  add(): void {
    if (!this.newCurrencyId || !this.newRateToUsd || !this.newEffectiveDate) return;
    this.lookups.create<FxRate>('fx-rates', {
      currencyId: this.newCurrencyId, rateToUsd: this.newRateToUsd, effectiveDate: this.newEffectiveDate
    }).subscribe({
      next: () => {
        this.newCurrencyId = null;
        this.newRateToUsd = null;
        this.newEffectiveDate = '';
        this.load();
      },
      error: () => { this.error = 'Could not create FX rate.'; this.cdr.markForCheck(); }
    });
  }
}
