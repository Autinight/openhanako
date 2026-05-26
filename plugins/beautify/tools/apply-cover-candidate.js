import path from "node:path";
import {
  MARKDOWN_COVER_PROMPT_PRESET,
  applyMarkdownCoverFromGeneratedFile,
} from "../lib/markdown-cover-service.js";
import { isBeautifyEnabledForAgentConfig } from "../lib/availability.js";

export const name = "apply-cover-candidate";
export const description = "把一个已经生成好的图片文件应用为 Markdown cover，并写回 frontmatter。";

export { isBeautifyEnabledForAgentConfig as isEnabledForAgentConfig };

export const parameters = {
  type: "object",
  properties: {
    targetFilePath: { type: "string", description: "Markdown 文件绝对路径。" },
    generatedFilePath: { type: "string", description: "已生成图片的绝对路径。" },
    prompt: { type: "string", description: "生成该图片所用提示词。" },
    preferredRatio: { type: "string", description: "期望比例，默认 3:2。" },
    pixelWidth: { type: "number", description: "图片像素宽，可选。" },
    pixelHeight: { type: "number", description: "图片像素高，可选。" },
  },
  required: ["targetFilePath", "generatedFilePath"],
};

export async function execute(input) {
  if (!input.targetFilePath || !path.isAbsolute(input.targetFilePath)) {
    return { content: [{ type: "text", text: "targetFilePath 必须是 Markdown 文件绝对路径。" }] };
  }
  if (!input.generatedFilePath || !path.isAbsolute(input.generatedFilePath)) {
    return { content: [{ type: "text", text: "generatedFilePath 必须是图片文件绝对路径。" }] };
  }

  try {
    const result = await applyMarkdownCoverFromGeneratedFile({
      markdownFilePath: input.targetFilePath,
      generatedFilePath: input.generatedFilePath,
      prompt: input.prompt || "",
      promptPreset: MARKDOWN_COVER_PROMPT_PRESET,
      preferredRatio: input.preferredRatio || "3:2",
      pixelWidth: input.pixelWidth,
      pixelHeight: input.pixelHeight,
    });
    return {
      content: [{ type: "text", text: "已应用 cover，并写入 Markdown frontmatter。" }],
      details: { beautifyCover: result },
    };
  } catch (err) {
    return { content: [{ type: "text", text: `应用 cover 失败：${err?.message || err}` }] };
  }
}
