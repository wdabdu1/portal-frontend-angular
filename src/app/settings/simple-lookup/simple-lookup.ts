import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { LookupEntity, SettingsLookupService } from '../settings-lookup.service';

export type FieldType = 'text' | 'number' | 'checkbox' | 'date' | 'select';
export type FieldFormat = 'percent';

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  readonly?: boolean;
  format?: FieldFormat;
  optionsResource?: string; // for type: 'select' — which Settings resource to load as dropdown options
}

@Component({
  selector: 'app-simple-lookup',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './simple-lookup.html'
})
export class SimpleLookup implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);

  title = '';
  resource = '';
  fields: FieldConfig[] = [];

  items: LookupEntity[] = [];
  newItem: Record<string, unknown> = {};
  loading = true;
  error = '';

  selectOptions: Record<string, LookupEntity[]> = {};

  editingId: number | null = null;
  editValues: Record<string, unknown> = {};
  saving = false;
  deletingId: number | null = null;

  constructor(private lookups: SettingsLookupService, public auth: AuthService) {}

  get canEdit(): boolean {
    return this.auth.hasRole('Manager') || this.auth.hasRole('SuperUser');
  }

  get editableFields(): FieldConfig[] {
    return this.fields.filter((f) => !f.readonly);
  }

  ngOnInit(): void {
    const data = this.route.snapshot.data;
    this.title = data['title'];
    this.resource = data['resource'];
    this.fields = data['fields'];
    this.resetNewItem();
    this.load();

    for (const f of this.fields) {
      if (f.type === 'select' && f.optionsResource) {
        this.lookups.getAll<LookupEntity>(f.optionsResource).subscribe({
          next: (r) => { this.selectOptions[f.optionsResource!] = r; this.cdr.markForCheck(); }
        });
      }
    }
  }

  optionLabel(item: LookupEntity): string {
    return (item['name'] as string) ?? (item['label'] as string) ?? String(item['id']);
  }

  displaySelectValue(item: LookupEntity, field: FieldConfig): string {
    const options = this.selectOptions[field.optionsResource ?? ''] ?? [];
    const match = options.find((o) => o.id === item[field.key]);
    return match ? this.optionLabel(match) : '—';
  }

  resetNewItem(): void {
    this.newItem = {};
    for (const f of this.editableFields) {
      this.newItem[f.key] = f.type === 'checkbox' ? false : f.type === 'number' ? null : '';
    }
  }

  load(): void {
    this.loading = true;
    this.lookups.getAll<LookupEntity>(this.resource).subscribe({
      next: (items) => {
        this.items = items;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = `Could not load ${this.title}.`;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  add(): void {
    const payload = { ...this.newItem, isActive: true };
    this.lookups.create(this.resource, payload).subscribe({
      next: () => {
        this.resetNewItem();
        this.load();
      },
      error: () => {
        this.error = `Could not create ${this.title} entry.`;
        this.cdr.markForCheck();
      }
    });
  }

  displayValue(item: LookupEntity, field: FieldConfig): string {
    const raw = item[field.key];
    if (field.format === 'percent') {
      const num = Number(raw) || 0;
      return `${(num * 100).toFixed(2)}%`;
    }
    return String(raw ?? '');
  }

  startEdit(item: LookupEntity): void {
    this.editingId = item.id;
    this.editValues = {};
    for (const f of this.editableFields) {
      this.editValues[f.key] = item[f.key];
    }
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editValues = {};
  }

  saveEdit(item: LookupEntity): void {
    this.saving = true;
    this.lookups.update(this.resource, item.id, this.editValues).subscribe({
      next: () => {
        this.saving = false;
        this.editingId = null;
        this.load();
      },
      error: () => {
        this.saving = false;
        this.error = `Could not update this entry.`;
        this.cdr.markForCheck();
      }
    });
  }

  confirmDelete(item: LookupEntity): void {
    const label = this.optionLabel(item);
    if (!window.confirm(`Delete "${label}"? This can't be undone.`)) return;

    this.deletingId = item.id;
    this.lookups.delete(this.resource, item.id).subscribe({
      next: () => {
        this.deletingId = null;
        this.load();
      },
      error: (err) => {
        this.deletingId = null;
        this.error = err?.status === 409
          ? `"${label}" is in use and can't be deleted.`
          : `Could not delete this entry.`;
        this.cdr.markForCheck();
      }
    });
  }
}
