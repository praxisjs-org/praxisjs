import { StatefulComponent } from "@praxisjs/core";
import { Component, State, Prop, Emit, FunctionProp } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class SearchInput extends StatefulComponent {
  @Prop() placeholder = "Search…";
  @FunctionProp() onSearch?: (query: string) => void;

  @State() value = "";

  @Emit("onSearch")
  handleSubmit() {
    return this.value;
  }

  render() {
    return (
      <form
        style="display:flex;gap:6px"
        onSubmit={(e: Event) => { e.preventDefault(); this.handleSubmit(); }}
      >
        <input
          style="flex:1;padding:7px 10px;border:1px solid #ccc;border-radius:6px;font-family:inherit"
          placeholder={() => this.placeholder}
          value={() => this.value}
          onInput={(e: Event) => { this.value = (e.target as HTMLInputElement).value; }}
        />
        <button
          type="submit"
          style="padding:7px 16px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer"
        >
          Search
        </button>
      </form>
    );
  }
}

@Component()
class EmitDemo extends StatefulComponent {
  @State() searches: string[] = [];

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:300px">
        <h3 style="margin:0;font-size:1rem">@Emit — child to parent communication</h3>
        <SearchInput
          placeholder="Search packages…"
          onSearch={(q: string) => {
            this.searches = [`"${q}"`, ...this.searches.slice(0, 4)];
          }}
        />
        {() => this.searches.length > 0 && (
          <div>
            <p style="margin:0 0 6px;font-size:.82rem;color:#888;font-weight:600">Recent searches</p>
            <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:3px">
              {() => this.searches.map((s, i) => (
                <li style={`padding:5px 10px;border-radius:4px;font-size:.85rem;background:${i === 0 ? "#ede9fe" : "#f5f5f5"};color:${i === 0 ? "#5b21b6" : "#374151"}`}>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p style="margin:0;font-size:.78rem;color:#aaa">
          <code>@Emit('onSearch')</code> binds <code>handleSubmit</code> and passes its return value
          to the <code>onSearch</code> prop callback.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Decorators/Events/Emit",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const EmitStory: Story = {
  name: "@Emit — child to parent",
  render: () => <EmitDemo />,
};
