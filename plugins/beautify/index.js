import {
  MARKDOWN_COVER_PROMPT_PRESET,
  applyMarkdownCoverFromGeneratedFile,
  resolveGeneratedImagePath,
} from "./lib/markdown-cover-service.js";

export default class BeautifyPlugin {
  async onload() {
    const { bus, log } = this.ctx;

    this.register(bus.subscribe((event, sessionPath) => {
      if (event?.type !== "media-gen:task-done") return;
      const metadata = event.metadata || event.task?.metadata || null;
      if (metadata?.profile !== "markdown-cover") return;
      void this._handleMarkdownCoverDone(event, sessionPath).catch((err) => {
        log.error("[beautify] apply markdown cover failed:", err?.message || err);
        bus.emit({
          type: "beautify:cover-apply-failed",
          taskId: event.taskId,
          error: err?.message || String(err),
          metadata,
        }, sessionPath || null);
      });
    }, { types: ["media-gen:task-done"] }));

    log.info("beautify plugin loaded");
  }

  async _handleMarkdownCoverDone(event, sessionPath) {
    const metadata = event.metadata || event.task?.metadata || {};
    const coverMeta = metadata.cover || {};
    if (coverMeta.mode === "draft") {
      this.ctx.bus.emit({
        type: "beautify:cover-draft-ready",
        taskId: event.taskId,
        files: event.files || [],
        metadata,
      }, sessionPath || null);
      return;
    }

    const fileName = event.files?.[0];
    const generatedPath = resolveGeneratedImagePath(event.generatedDir, fileName);
    const result = await applyMarkdownCoverFromGeneratedFile({
      markdownFilePath: coverMeta.targetFilePath,
      generatedFilePath: generatedPath,
      prompt: coverMeta.prompt || event.prompt || event.task?.prompt || "",
      promptPreset: coverMeta.promptPreset || MARKDOWN_COVER_PROMPT_PRESET,
      preferredRatio: coverMeta.preferredRatio || "3:2",
      pixelWidth: event.imageWidth,
      pixelHeight: event.imageHeight,
      generator: {
        providerId: event.providerId || event.task?.providerId || null,
        modelId: event.modelId || event.task?.modelId || null,
      },
    });

    this.ctx.bus.emit({
      type: "beautify:cover-applied",
      taskId: event.taskId,
      markdownFilePath: result.markdownFilePath,
      attachmentPath: result.attachmentPath,
      cover: result.cover,
    }, sessionPath || null);
  }
}
