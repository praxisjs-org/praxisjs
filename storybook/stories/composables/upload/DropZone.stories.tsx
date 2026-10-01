import { StatefulComponent } from "@praxisjs/core";
import { Component, Compose, Ref } from "@praxisjs/decorators";
import { DropZone, formatFileSize } from "@praxisjs/composables";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class DropZoneDemo extends StatefulComponent {
  @Ref<HTMLDivElement>()
  zoneRef!: Ref<HTMLDivElement>;

  @Compose(DropZone, "zoneRef", { accept: ["image/*", ".pdf"], maxSize: 2 * 1024 * 1024, maxFiles: 4 })
  drop!: DropZone;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:320px">
        <h3 style="margin:0;font-size:1rem">DropZone — drag and drop files</h3>
        <div
          ref={this.zoneRef}
          style={() => `padding:28px;text-align:center;cursor:pointer;border-radius:8px;border:2px dashed ${this.drop.dragging ? "#6d5bbd" : "#d1d5db"};background:${this.drop.dragging ? "#f3f0ff" : "#fafafa"};transition:all .15s`}
          onClick={() => { this.drop.open(); }}
        >
          {() => (this.drop.dragging ? "Release to add" : "Drop images or PDFs here, or click to browse")}
        </div>
        {() => this.drop.files.map((f) => (
          <div style="display:flex;justify-content:space-between;font-size:.82rem">
            <span>{f.name} <span style="color:#888">({formatFileSize(f.size)})</span></span>
            <button onClick={() => { this.drop.remove(f); }}>remove</button>
          </div>
        ))}
        {() => this.drop.errors.map((e) => (
          <p style="margin:0;font-size:.78rem;color:#dc2626">{e.message}</p>
        ))}
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Up to 4 files, 2 MB each. <code>drop.files</code> and <code>drop.errors</code> update reactively.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Composables/Upload/DropZone",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const DropZoneStory: Story = {
  name: "DropZone — drag and drop files",
  render: () => <DropZoneDemo />,
};
