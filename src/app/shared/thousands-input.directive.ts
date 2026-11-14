import { Directive, ElementRef, HostListener, Renderer2, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
  selector: 'input[appThousands]',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ThousandsInputDirective), multi: true }]
})
export class ThousandsInputDirective implements ControlValueAccessor {
  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private el: ElementRef<HTMLInputElement>, private renderer: Renderer2) {}

  writeValue(value: number | null): void {
    this.renderer.setProperty(this.el.nativeElement, 'value', this.format(value));
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  // Formats with thousands separators WHILE typing (1234567.5 -> 1,234,567.5), keeping the
  // caret where the user was typing. The model always receives the plain number.
  @HostListener('input')
  onInput(): void {
    const el = this.el.nativeElement;
    const caret = el.selectionStart;
    const meaningfulBeforeCaret = caret === null ? null : el.value.slice(0, caret).replace(/[^0-9.\-]/g, '').length;

    let raw = el.value.replace(/,/g, '').replace(/[^0-9.\-]/g, '');
    const negative = raw.startsWith('-');
    raw = raw.replace(/-/g, '');
    const firstDot = raw.indexOf('.');
    if (firstDot !== -1) raw = raw.slice(0, firstDot + 1) + raw.slice(firstDot + 1).replace(/\./g, '');

    const hasDot = raw.includes('.');
    let intPart = hasDot ? raw.slice(0, raw.indexOf('.')) : raw;
    const decPart = hasDot ? raw.slice(raw.indexOf('.') + 1) : '';
    intPart = intPart.replace(/^0+(?=\d)/, '');
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const display = (negative ? '-' : '') + grouped + (hasDot ? '.' + decPart : '');

    this.renderer.setProperty(el, 'value', display);

    if (meaningfulBeforeCaret !== null && document.activeElement === el) {
      let seen = 0;
      let pos = 0;
      while (pos < display.length && seen < meaningfulBeforeCaret) {
        if (/[0-9.\-]/.test(display[pos])) seen++;
        pos++;
      }
      // Don't leave the caret just before a freshly inserted comma.
      if (display[pos] === ',') pos++;
      try { el.setSelectionRange(pos, pos); } catch { /* input type does not support selection */ }
    }

    // '', '-', '.', '-.' mean "nothing typed yet" -> null; anything else is a real number.
    const numericText = (negative ? '-' : '') + (hasDot ? (intPart || '0') + '.' + decPart : intPart);
    this.onChange(intPart === '' && decPart === '' ? null : Number(numericText));
  }

  @HostListener('blur')
  onBlur(): void {
    const raw = this.el.nativeElement.value.replace(/,/g, '');
    const numeric = raw === '' ? null : Number(raw);
    this.renderer.setProperty(this.el.nativeElement, 'value', this.format(numeric));
    this.onTouched();
  }

  private format(value: number | null): string {
    if (value === null || value === undefined || isNaN(value)) return '';
    return value.toLocaleString('en-US', { maximumFractionDigits: 6 });
  }
}
