export abstract class Composable {
  abstract setup(): Record<string, unknown>;
  onMount?(): void;
  onUnmount?(): void;
}
