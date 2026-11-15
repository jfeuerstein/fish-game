// The card the first minute is told on (the rules are src/game/coach.ts): what to do now, how
// far along that is, a way to skip it, and for the two things done with a thumb on bare screen,
// a drawing of the thumb doing it where it is to be done.
import { COACH_SAYS, COACH_STEPS, type CoachStep } from '../game/coach';
import { el } from './hud';

export class Coach {
  private root = el('div', 'coach');
  private says = el('div', 'coach-says');
  private count = el('div', 'coach-count');
  private hint = el('div', 'coach-hint');
  private skip = el('button', 'btn plain', 'Skip');
  /** Called when Skip is pressed. */
  onSkip: (() => void) | null = null;

  constructor(parent: HTMLElement) {
    this.skip.addEventListener('click', () => this.onSkip?.());
    const foot = el('div', 'coach-foot');
    foot.append(this.count, this.skip);
    this.root.append(this.says, foot);
    this.hint.innerHTML = '<i></i>';
    // Touches on the card stay on the card.
    this.root.addEventListener('pointerdown', (e) => e.stopPropagation());
    parent.append(this.root, this.hint);
  }

  show(step: CoachStep): void {
    this.says.textContent = COACH_SAYS[step];
    const last = step === 'done';
    this.root.classList.toggle('done', last);
    this.skip.textContent = last ? 'OK' : 'Skip';
    // The goodbye is not a step to do.
    this.count.textContent = last ? '' : `${COACH_STEPS.indexOf(step) + 1} of ${COACH_STEPS.length - 1}`;
    this.hint.className = `coach-hint ${step}`;
    this.hint.hidden = step !== 'walk' && step !== 'look';
  }

  remove(): void {
    this.root.remove();
    this.hint.remove();
  }
}
