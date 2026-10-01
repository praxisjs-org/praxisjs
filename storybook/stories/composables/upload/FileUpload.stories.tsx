import { StatefulComponent } from "@praxisjs/core";
import { Component, Compose } from "@praxisjs/decorators";
import { FileUpload } from "@praxisjs/composables";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class FileUploadDemo extends StatefulComponent {
  @Compose(FileUpload, { url: "https://httpbin.org/post", maxSize: 5 * 1024 * 1024, concurrency: 2 })
  upload!: FileUpload;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:320px">
        <h3 style="margin:0;font-size:1rem">FileUpload — progress, cancel and retry</h3>
        <input
          type="file"
          multiple
          onChange={(e: Event) => { this.upload.add((e.target as HTMLInputElement).files); }}
        />
        <p style="margin:0;font-size:.82rem">Overall: {() => this.upload.progress}%</p>
        {() => this.upload.items.map((item) => (
          <div style="display:flex;flex-direction:column;gap:4px;font-size:.82rem">
            <span>{item.file.name} — {item.status}{item.error ? ` (${item.error})` : ""}</span>
            <progress max="100" value={item.progress} />
            <div style="display:flex;gap:6px">
              {item.status === "uploading" && <button onClick={() => { this.upload.cancel(item.id); }}>Cancel</button>}
              {(item.status === "error" || item.status === "aborted") && <button onClick={() => { this.upload.retry(item.id); }}>Retry</button>}
              <button onClick={() => { this.upload.remove(item.id); }}>Remove</button>
            </div>
          </div>
        ))}
        {() => this.upload.errors.map((e) => (
          <p style="margin:0;font-size:.78rem;color:#dc2626">{e.message}</p>
        ))}
      </div>
    );
  }
}

const meta: Meta = {
  title: "Composables/Upload/FileUpload",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const FileUploadStory: Story = {
  name: "FileUpload — progress, cancel and retry",
  render: () => <FileUploadDemo />,
};
