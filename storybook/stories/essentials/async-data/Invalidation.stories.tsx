import { StatefulComponent } from "@praxisjs/core";
import {
  Component,
  Resource,
  invalidateResource,
  type ResourceInstance,
} from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

interface UserProfile {
  version: number;
  name: string;
  role: string;
  updatedAt: string;
}

const ts = () => new Date().toLocaleTimeString("en", { hour12: false });

let profileVersion = 0;
const ROLES = ["Engineer", "Designer", "Product", "Marketing"];

const fetchProfile = (): Promise<UserProfile> =>
  new Promise((res) =>
    setTimeout(() => {
      profileVersion++;
      res({
        version: profileVersion,
        name: `Alex Kim v${profileVersion}`,
        role: ROLES[(profileVersion - 1) % ROLES.length] ?? "Engineer",
        updatedAt: ts(),
      });
    }, 700),
  );

const PROFILE_KEY = "inv-story-profile";

// ─── Profile card (two instances share the same key) ─────────────────────────

@Component()
class ProfileCard extends StatefulComponent {
  @Resource(() => fetchProfile(), { key: PROFILE_KEY })
  profile!: ResourceInstance<UserProfile>;

  render() {
    return (
      <div style="padding:14px;border:1px solid #e5e7eb;border-radius:8px;display:flex;flex-direction:column;gap:8px;min-height:100px">
        {() =>
          this.profile.pending() && this.profile.data() === null ? (
            <div style="color:#9ca3af;font-size:.85rem;padding:8px 0">Loading…</div>
          ) : null
        }

        {() =>
          this.profile.data() ? (
            <div style="display:flex;flex-direction:column;gap:4px">
              <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div>
                  <p style="margin:0;font-weight:700;font-size:.9rem;color:#374151">
                    {this.profile.data()!.name}
                  </p>
                  <p style="margin:2px 0 0;font-size:.8rem;color:#6b7280">
                    {this.profile.data()!.role}
                  </p>
                </div>
                {() =>
                  this.profile.pending() ? (
                    <span style="padding:2px 8px;border-radius:99px;font-size:.7rem;background:#fef9c3;color:#854d0e;font-weight:600">
                      Refreshing…
                    </span>
                  ) : (
                    <span style="padding:2px 8px;border-radius:99px;font-size:.7rem;background:#dcfce7;color:#166534;font-weight:600">
                      v{this.profile.data()!.version}
                    </span>
                  )
                }
              </div>
              <p style="margin:0;font-size:.72rem;color:#9ca3af">
                Loaded at {this.profile.data()!.updatedAt}
              </p>
            </div>
          ) : null
        }
      </div>
    );
  }
}

// ─── Container with invalidation control ─────────────────────────────────────

@Component()
class InvalidationDemo extends StatefulComponent {
  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:16px;font-family:sans-serif;max-width:520px">
        <h3 style="margin:0;font-size:1rem">@Resource — key-based invalidation</h3>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <ProfileCard />
          <ProfileCard />
        </div>

        <div style="padding:12px 14px;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa;display:flex;flex-direction:column;gap:8px">
          <p style="margin:0;font-size:.82rem;color:#374151;font-weight:600">
            Admin panel — simulate a mutation
          </p>
          <p style="margin:0;font-size:.8rem;color:#6b7280">
            After updating a resource server-side, call{" "}
            <code>invalidateResource(key)</code> to force every component
            subscribed to that key to refetch immediately.
          </p>
          <button
            style="padding:7px 16px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer;font-size:.85rem;align-self:start"
            onClick={() => {
              invalidateResource(PROFILE_KEY);
            }}
          >
            Update profile → invalidate
          </button>
        </div>

        <div style="padding:10px 14px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;font-size:.78rem;color:#0369a1;line-height:1.6">
          <strong>Both cards refresh simultaneously</strong> when the button is
          clicked — even though the call happens outside any component. The cache entry
          is cleared and every active <code>@Resource</code> with{" "}
          <code>key: &quot;{PROFILE_KEY}&quot;</code> refetches.
        </div>
      </div>
    );
  }
}

// ─── Story ───────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: "Essentials/Async Data/Invalidation",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Invalidation: Story = {
  name: "@Resource — invalidateResource()",
  render: () => <InvalidationDemo />,
};
