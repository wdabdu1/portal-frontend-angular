import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataMigrationService, UploadSummary } from './data-migration.service';

@Component({
  selector: 'app-data-migration',
  imports: [CommonModule, RouterLink],
  templateUrl: './data-migration.html'
})
export class DataMigration {
  private cdr = inject(ChangeDetectorRef);

  settingsFile: File | null = null;
  uploadingSettings = false;
  settingsSummary: UploadSummary | null = null;
  settingsError = '';
  settingsConfirming = false; // true = showing the "are you sure" warning, not yet submitted
  settingsDone = false;       // true = a file was successfully uploaded; locked until a new file is chosen

  constructor(private service: DataMigrationService) {}

  onSettingsFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.settingsFile = input.files?.[0] ?? null;
    this.settingsSummary = null;
    this.settingsError = '';
    this.settingsConfirming = false;
    this.settingsDone = false;
  }

  startSettingsUpload(): void {
    if (!this.settingsFile || this.settingsDone) return;
    this.settingsConfirming = true;
  }

  cancelSettingsUpload(): void {
    this.settingsConfirming = false;
  }

  confirmSettingsUpload(): void {
    if (!this.settingsFile) return;
    this.settingsConfirming = false;
    this.uploadingSettings = true;
    this.settingsSummary = null;
    this.settingsError = '';
    this.service.uploadSettings(this.settingsFile).subscribe({
      next: (r) => {
        this.uploadingSettings = false;
        this.settingsSummary = r;
        this.settingsDone = true; // locks the button until a new file is chosen
        this.cdr.markForCheck();
      },
      error: (err) => { this.uploadingSettings = false; this.settingsError = err?.error?.message ?? 'Upload failed.'; this.cdr.markForCheck(); }
    });
  }

  totalCreated(summary: UploadSummary): number {
    return summary.results.reduce((sum, r) => sum + r.created, 0);
  }
  totalUpdated(summary: UploadSummary): number {
    return summary.results.reduce((sum, r) => sum + r.updated, 0);
  }
  totalErrors(summary: UploadSummary): number {
    return summary.results.reduce((sum, r) => sum + r.errors.length, 0);
  }
}
