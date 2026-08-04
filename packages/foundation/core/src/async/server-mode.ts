let _serverRenderPass = false;

/**
 * Marks whether the current process is doing a build-time server/SSG render pass
 * (as opposed to a normal browser render). Consumed by `resource-cache` (gates
 * pending-promise tracking for `flushPendingResources`) and by `@praxisjs/runtime`'s
 * `Portal`, which skips mounting entirely during a server pass so its content
 * never gets baked into static HTML (it mounts normally once on the client).
 */
export function setServerRenderPass(active: boolean): void {
  _serverRenderPass = active;
}

export function isServerRenderPass(): boolean {
  return _serverRenderPass;
}
