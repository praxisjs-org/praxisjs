export interface TransitionOptions {
  name?: string;
  duration?: number;
  onEnter?: (el: HTMLElement) => void;
  onLeave?: (el: HTMLElement) => void;
}

export function createTransition(options: TransitionOptions = {}) {
  const { name = "transition", duration = 300, onEnter, onLeave } = options;
  const enterFrom = `${name}-enter-from`;
  const enterTo = `${name}-enter-to`;
  const leaveFrom = `${name}-leave-from`;
  const leaveTo = `${name}-leave-to`;

  function play(
    el: HTMLElement,
    hook: ((el: HTMLElement) => void) | undefined,
    fromClass: string,
    toClass: string,
  ): Promise<void> {
    return new Promise((res, rej) => {
      try {
        hook?.(el);
      } catch (err) {
        rej(err instanceof Error ? err : new Error(String(err)));
        return;
      }
      el.classList.add(fromClass);
      requestAnimationFrame(() => {
        el.classList.remove(fromClass);
        el.classList.add(toClass);
      });
      setTimeout(() => {
        el.classList.remove(toClass);
        res();
      }, duration);
    });
  }

  return {
    enter(el: HTMLElement): Promise<void> {
      return play(el, onEnter, enterFrom, enterTo);
    },
    leave(el: HTMLElement): Promise<void> {
      return play(el, onLeave, leaveFrom, leaveTo);
    },
  };
}
