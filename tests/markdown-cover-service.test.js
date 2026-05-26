import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MARKDOWN_COVER_PROMPT_PRESET,
  applyMarkdownCoverFromGeneratedFile,
  buildCoverPromptCompilerPrompt,
} from "../plugins/beautify/lib/markdown-cover-service.js";

describe("markdown cover service", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hana-cover-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("copies generated cover into the markdown attachment folder and writes cover frontmatter", async () => {
    const notePath = path.join(tmpDir, "note.md");
    const generatedPath = path.join(tmpDir, "generated.png");
    fs.writeFileSync(notePath, "# Title\n\nBody\n", "utf-8");
    fs.writeFileSync(generatedPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    const result = await applyMarkdownCoverFromGeneratedFile({
      markdownFilePath: notePath,
      generatedFilePath: generatedPath,
      prompt: "A quiet cinematic anime paper-textured room at dawn.",
      promptPreset: MARKDOWN_COVER_PROMPT_PRESET,
      preferredRatio: "3:2",
      actualRatio: "16:9",
      pixelWidth: 1600,
      pixelHeight: 900,
      generator: { providerId: "openai", modelId: "gpt-image-1" },
      now: new Date("2026-05-26T10:11:12.000Z"),
    });

    const copiedPath = path.join(tmpDir, ...result.cover.image.split("/"));
    expect(fs.existsSync(copiedPath)).toBe(true);
    expect(result.cover).toMatchObject({
      promptPreset: MARKDOWN_COVER_PROMPT_PRESET,
      preferredRatio: "3:2",
      actualRatio: "16:9",
      pixelWidth: 1600,
      pixelHeight: 900,
      displayWidth: 100,
      displayHeight: 320,
      positionX: 50,
      positionY: 50,
      generatedAt: "2026-05-26T10:11:12.000Z",
      generator: { provider: "openai", model: "gpt-image-1" },
    });

    const raw = fs.readFileSync(notePath, "utf-8");
    expect(raw).toContain("cover:");
    expect(raw).toContain("image: ");
    expect(raw).toContain("promptPreset: modern-anime-paper-key-visual");
    expect(raw).toMatch(/\n---\n# Title\n\nBody\n$/);
  });

  it("keeps prompt compilation grounded in cinematic scene logic instead of loose symbolic objects", () => {
    const prompt = buildCoverPromptCompilerPrompt({
      themeTone: "light",
      preferredRatio: "3:2",
      userGuidance: "更有文学感，像一篇关于写作方式的文章",
    });

    expect(prompt).toContain("3:2");
    expect(prompt).toContain("现代 Anime");
    expect(prompt).toContain("纸张质感");
    expect(prompt).toContain("电影感");
    expect(prompt).toContain("场面调度");
    expect(prompt).toContain("真实空间");
    expect(prompt).not.toMatch(/负面提示词|不要|避免|漂浮/);
  });
});
