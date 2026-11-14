// A bottom sheet: comes up from below over the game, with a title, optional tabs, and a body
// that scrolls. Only one is open at a time.
import { el } from './hud';

let open: Sheet | null = null;

export class Sheet {
  readonly root = el('div', 'sheet');
  readonly body = el('div', 'sheet-body');
  private tabsRow = el('div', 'sheet-tabs');
  private titleEl = el('h2');
  private tab = '';
  onClose: (() => void) | null = null;

  constructor(private parent: HTMLElement, title: string, private render: (body: HTMLElement, tab: string) => void, tabs: string[] = []) {
    const head = el('div', 'sheet-head');
    this.titleEl.textContent = title;
    const close = el('button', 'sheet-close', '✕');
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', () => this.close());
    head.append(this.titleEl, close);
    this.root.append(head);
    if (tabs.length) {
      this.tab = tabs[0];
      for (const t of tabs) {
        const b = el('button', 'tab', t);
        b.addEventListener('click', () => {
          this.tab = t;
          this.refresh();
        });
        this.tabsRow.append(b);
      }
      this.root.append(this.tabsRow);
    }
    this.root.append(this.body);
    // Touches on the sheet stay on the sheet.
    this.root.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  static get current(): Sheet | null {
    return open;
  }

  show(tab?: string): void {
    if (open && open !== this) open.close();
    if (tab) this.tab = tab;
    open = this;
    this.parent.append(this.root);
    this.refresh();
    requestAnimationFrame(() => this.root.classList.add('up'));
  }

  setTitle(t: string): void {
    this.titleEl.textContent = t;
  }

  refresh(): void {
    for (const b of this.tabsRow.children) b.classList.toggle('on', b.textContent === this.tab);
    const scroll = this.body.scrollTop;
    this.body.innerHTML = '';
    this.render(this.body, this.tab);
    this.body.scrollTop = scroll;
  }

  get isOpen(): boolean {
    return open === this;
  }

  close(): void {
    if (open !== this) return;
    open = null;
    this.root.classList.remove('up');
    this.root.remove();
    this.onClose?.();
  }
}
