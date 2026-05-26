import fs from "node:fs";
import path from "node:path";
import {
  MARKDOWN_COVER_PROMPT_PRESET,
  buildCoverPromptCompilerPrompt,
} from "../lib/markdown-cover-service.js";
import { isBeautifyEnabledForAgentConfig } from "../lib/availability.js";

export const name = "create-cover";
export const description =
  "为 Markdown 文档生成 Notion-like cover。会先用工具模型根据文章内容生成生图提示词，再提交图片生成；默认完成后写回文档 frontmatter。";

export const promptGuidelines = [
  "Use beautify_create-cover when the user asks to create, regenerate, adjust, or beautify a Markdown document cover.",
  "If the target Markdown file path is not explicit and cannot be inferred from attached file metadata, ask the user to confirm the path before calling this tool.",
  "When called from an editor button, the file path is explicit; use it directly.",
  "For follow-up requests like 再生成一张 or 调整方向, call this tool again with the same targetFilePath and put the user's new direction in userGuidance.",
].join("\n");

export { isBeautifyEnabledForAgentConfig as isEnabledForAgentConfig };

export const parameters = {
  type: "object",
  properties: {
    targetFilePath: { type: "string", description: "Markdown 文件绝对路径。路径不确定时先向用户确认。" },
    filePath: { type: "string", description: "targetFilePath 的兼容别名。" },
    mode: { type: "string", enum: ["apply", "draft"], description: "apply 完成后写回 Markdown；draft 只生成候选图。" },
    themeTone: { type: "string", enum: ["light", "dark", "auto"], description: "当前 UI 主题倾向，默认 light。" },
    preferredRatio: { type: "string", description: "期望比例，默认 3:2。供应商不支持时由生成插件按 provider 能力处理。" },
    userGuidance: { type: "string", description: "用户补充的方向，例如更文学、更星空、更克制。" },
  },
  required: ["targetFilePath"],
};

function resolveTargetFilePath(input) {
  return input.targetFilePath || input.filePath || input.target?.filePath || null;
}

function excerptMarkdown(markdown) {
  const trimmed = String(markdown || "").trim();
  if (trimmed.length <= 12000) return trimmed;
  return `${trimmed.slice(0, 8000)}\n\n...\n\n${trimmed.slice(-3000)}`;
}

function textResult(text, details = undefined) {
  return {
    content: [{ type: "text", text }],
    ...(details ? { details } : {}),
  };
}

export async function execute(input, ctx) {
  const targetFilePath = resolveTargetFilePath(input);
  if (!targetFilePath || !path.isAbsolute(targetFilePath)) {
    return textResult("需要一个明确的 Markdown 文件绝对路径；如果你是从普通聊天里发起，请先确认目标文件路径。");
  }
  if (path.extname(targetFilePath).toLowerCase() !== ".md") {
    return textResult("目标文件必须是 .md Markdown 文件。");
  }
  if (!ctx.sessionPath) {
    return textResult("生成 cover 需要明确的会话归属，当前工具调用缺少 sessionPath。");
  }

  let markdown;
  try {
    const stat = fs.statSync(targetFilePath);
    if (!stat.isFile()) return textResult("目标路径不是文件。");
    markdown = fs.readFileSync(targetFilePath, "utf-8");
  } catch (err) {
    return textResult(`读取 Markdown 文件失败：${err?.message || err}`);
  }

  const mode = input.mode === "draft" ? "draft" : "apply";
  const themeTone = input.themeTone === "dark" ? "dark" : "light";
  const preferredRatio = input.preferredRatio || "3:2";
  const configuredGuidance = ctx.config?.get?.("coverPromptGuidance") || "";
  const userGuidance = [configuredGuidance, input.userGuidance].filter(Boolean).join("\n");
  const compilerPrompt = buildCoverPromptCompilerPrompt({
    themeTone,
    preferredRatio,
    userGuidance,
  });

  let imagePrompt;
  try {
    const response = await ctx.bus.request("utility:call-text", {
      sessionPath: ctx.sessionPath,
      agentId: ctx.agentId || null,
      operation: "beautify.cover.prompt",
      systemPrompt: compilerPrompt,
      messages: [{
        role: "user",
        content: [
          `Markdown file path: ${targetFilePath}`,
          "",
          "Markdown content:",
          excerptMarkdown(markdown),
        ].join("\n"),
      }],
      temperature: 0.7,
      maxTokens: 700,
    }, { timeout: 120000 });
    imagePrompt = String(response?.text || "").trim();
  } catch (err) {
    return textResult(`生成 cover 提示词失败：${err?.message || err}`);
  }

  if (!imagePrompt) return textResult("工具模型没有生成可用的 cover 提示词。");

  const submit = await ctx.bus.request("media-gen:submit-image", {
    sessionPath: ctx.sessionPath,
    input: {
      prompt: imagePrompt,
      count: 1,
      ratio: preferredRatio,
      resolution: ctx.config?.get?.("coverResolution") || "2k",
    },
    metadata: {
      profile: "markdown-cover",
      cover: {
        targetFilePath,
        mode,
        prompt: imagePrompt,
        promptPreset: MARKDOWN_COVER_PROMPT_PRESET,
        preferredRatio,
        themeTone,
      },
    },
  });

  if (!submit?.ok) {
    return textResult(`提交图片生成失败：${submit?.error || "unknown error"}`);
  }

  return textResult(
    mode === "apply"
      ? "已提交 Markdown cover 生成任务；图片完成后会自动复制到同级“文本附件”文件夹，并写入文档 cover frontmatter。"
      : "已提交 Markdown cover 候选图生成任务；完成后会显示候选图，但不会自动写回文档。",
    {
      beautifyCover: {
        targetFilePath,
        mode,
        prompt: imagePrompt,
        promptPreset: MARKDOWN_COVER_PROMPT_PRESET,
        preferredRatio,
        batchId: submit.batchId,
        tasks: submit.tasks,
      },
    },
  );
}
