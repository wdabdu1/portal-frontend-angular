import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataMigrationService, UploadSummary } from './data-migration.service';

@Component({
  selector: 'app-data-migration',
  imports: [CommonModule, RouterLink, FormsModule],
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

  exportingSettings = false;
  exportError = '';

  constructor(private service: DataMigrationService) {}

  exportSettings(): void {
    this.exportingSettings = true;
    this.exportError = '';
    this.service.exportSettings().subscribe({
      next: (response) => {
        this.exportingSettings = false;
        const blob = response.body!;
        // Filename comes from the server's own timestamped Content-Disposition
        // header — falls back to a generic name only if that's ever missing.
        const disposition = response.headers.get('content-disposition') ?? '';
        const match = disposition.match(/filename="?([^"]+)"?/);
        const fileName = match ? match[1] : 'CTC_Portal_Settings_Backup.xlsx';

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
        this.cdr.markForCheck();
      },
      error: () => { this.exportingSettings = false; this.exportError = 'Export failed.'; this.cdr.markForCheck(); }
    });
  }

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

    dataFile: File | null = null;
  uploadingData = false;
  dataSummary: UploadSummary | null = null;
  dataError = '';
  dataConfirming = false;
  dataDone = false;

  exportingData = false;
  exportDataError = '';

  exportData(): void {
    this.exportingData = true;
    this.exportDataError = '';
    this.service.exportData().subscribe({
      next: (response) => {
        this.exportingData = false;
        const blob = response.body!;
        const disposition = response.headers.get('content-disposition') ?? '';
        const match = disposition.match(/filename="?([^"]+)"?/);
        const fileName = match ? match[1] : 'CTC_Portal_Data_Backup.xlsx';

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
        this.cdr.markForCheck();
      },
      error: () => { this.exportingData = false; this.exportDataError = 'Export failed.'; this.cdr.markForCheck(); }
    });
  }

  onDataFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.dataFile = input.files?.[0] ?? null;
    this.dataSummary = null;
    this.dataError = '';
    this.dataConfirming = false;
    this.dataDone = false;
  }

  startDataUpload(): void {
    if (!this.dataFile || this.dataDone) return;
    this.dataConfirming = true;
  }

  cancelDataUpload(): void {
    this.dataConfirming = false;
  }

  confirmDataUpload(): void {
    if (!this.dataFile) return;
    this.dataConfirming = false;
    this.uploadingData = true;
    this.dataSummary = null;
    this.dataError = '';
    this.service.uploadData(this.dataFile).subscribe({
      next: (r) => {
        this.uploadingData = false;
        this.dataSummary = r;
        this.dataDone = true;
        this.cdr.markForCheck();
      },
      error: (err) => { this.uploadingData = false; this.dataError = err?.error?.message ?? 'Upload failed.'; this.cdr.markForCheck(); }
    });
  }

  // --- Complete Delete — the most destructive action here, so it gets
  // the strictest safeguard: typing the exact phrase, not just a click.
  deleteConfirmText = '';
  deletingAll = false;
  deleteResult: { message: string; tables: string[] } | null = null;
  deleteError = '';

  get deleteConfirmMatches(): boolean {
    return this.deleteConfirmText === 'DELETE EVERYTHING';
  }

  confirmCompleteDelete(): void {
    if (!this.deleteConfirmMatches) return;
    this.deletingAll = true;
    this.deleteResult = null;
    this.deleteError = '';
    this.service.completeDelete(this.deleteConfirmText).subscribe({
      next: (r) => {
        this.deletingAll = false;
        this.deleteResult = r;
        this.deleteConfirmText = ''; // reset — a fresh confirmation is required for any future use
        this.cdr.markForCheck();
      },
      error: (err) => { this.deletingAll = false; this.deleteError = err?.error?.message ?? 'Delete failed.'; this.cdr.markForCheck(); }
    });
  }

  // --- Delete a single PO — for correcting an early mistake (wrong PO,
  // or a wrong shipment linked to one). The backend itself refuses if
  // Clearance has started, so the confirmation here is lighter than
  // Complete Delete's typed-phrase requirement, but still explicit.
  deletePoNumber = '';
  deletingPo = false;
  deletePoResult: string | null = null;
  deletePoError = '';
  confirmingDeletePo = false;

  startDeletePo(): void {
    if (!this.deletePoNumber.trim()) return;
    this.confirmingDeletePo = true;
  }

  cancelDeletePo(): void {
    this.confirmingDeletePo = false;
  }

  confirmDeletePo(): void {
    this.confirmingDeletePo = false;
    this.deletingPo = true;
    this.deletePoResult = null;
    this.deletePoError = '';
    this.service.deletePo(this.deletePoNumber.trim()).subscribe({
      next: (r) => {
        this.deletingPo = false;
        this.deletePoResult = r.message;
        this.deletePoNumber = '';
        this.cdr.markForCheck();
      },
      error: (err) => { this.deletingPo = false; this.deletePoError = err?.error?.message ?? 'Delete failed.'; this.cdr.markForCheck(); }
    });
  }
}
