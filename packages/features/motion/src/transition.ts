export interface TransitionOptions {
  name?: string;
  duration?: number;
  onEnter?: (el: HTMLElement) => void;
  onLeave?: (el: HTMLElement) => void;
}

export function createTransition(options: TransitionOptions = {}) {
  const { name = "transition", duration = 300, onEnter, onLeave } = options;

  return {
    enter(el: HTMLElement): Promise<void> {
      return new Promise((res, rej) => {
        try {
          onEnter?.(el);
        } catch (err) {
          rej(err instanceof Error ? err : new Error(String(err)));
          return;
        }
        el.classList.add(`${name}-enter-from`);
        requestAnimationFrame(() => {
          el.classList.remove(`${name}-enter-from`);
          el.classList.add(`${name}-enter-to`);
        });
        setTimeout(() => {
          el.classList.remove(`${name}-enter-to`);
          res();
        }, duration);
      });
    },
    leave(el: HTMLElement): Promise<void> {
      return new Promise((res, rej) => {
        try {
          onLeave?.(el);
        } catch (err) {
          rej(err instanceof Error ? err : new Error(String(err)));
          return;
        }
        el.classList.add(`${name}-leave-from`);
        requestAnimationFrame(() => {
          el.classList.remove(`${name}-leave-from`);
          el.classList.add(`${name}-leave-to`);
        });
        setTimeout(() => {
          el.classList.remove(`${name}-leave-to`);
          res();
        }, duration);
      });
    },
  };
}
