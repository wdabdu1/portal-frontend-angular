import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { API_URL } from '../../api-config';
import { AuthService } from '../../auth/auth.service';

interface LogisticsVisibilitySettingsDto {
  id: number;
  arrivalLeadTimeDays: number;
  preClearanceCatQtyRevealDays: number;
  postDeliveryRehideDays: number;
  updatedAt: string;
}

@Component({
  selector: 'app-logistics-visibility',
  imports: [CommonModule, FormsModule],
  templateUrl: './logistics-visibility.html'
})
export class LogisticsVisibility implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  settings: LogisticsVisibilitySettingsDto | null = null;
  loading = true;
  saving = false;
  saved = false;
  error = '';

  constructor(private http: HttpClient, public auth: AuthService) {}

  get canEdit(): boolean {
    return this.auth.canEditLogisticsRevealSettings();
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.http.get<LogisticsVisibilitySettingsDto>(`${API_URL}/logistics/visibility-settings`).subscribe({
      next: (r) => { this.settings = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load Logistics visibility settings.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  save(): void {
    if (!this.settings || !this.canEdit) return;
    this.saving = true;
    this.http.put<LogisticsVisibilitySettingsDto>(`${API_URL}/logistics/visibility-settings`, {
      arrivalLeadTimeDays: this.settings.arrivalLeadTimeDays,
      preClearanceCatQtyRevealDays: this.settings.preClearanceCatQtyRevealDays,
      postDeliveryRehideDays: this.settings.postDeliveryRehideDays
    }).subscribe({
      next: (r) => {
        this.settings = r;
        this.saving = false;
        this.saved = true;
        setTimeout(() => { this.saved = false; this.cdr.markForCheck(); }, 2000);
        this.cdr.markForCheck();
      },
      error: () => { this.saving = false; this.error = 'Could not save.'; this.cdr.markForCheck(); }
    });
  }
}
