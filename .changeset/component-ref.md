---
"@praxisjs/runtime": minor
"@praxisjs/jsx": minor
---

Add `ref` prop support for component JSX tags.

`ref` receives the component instance after `onMount` fires, and `null` after `onUnmount`. It is not forwarded to the component's own props.

```tsx
@Component()
class Modal extends StatefulComponent { … }

// ref is typed as (instance: Modal | null) => void
<Modal ref={(inst) => { this.modal = inst }} />
```
