import fs from "node:fs";
import path from "node:path";
import YAML from "js-yaml";
import { atomicWriteSync } from "../../../shared/safe-fs.js";

export const MARKDOWN_COVER_PROMPT_PRESET = "modern-anime-paper-key-visual";
export const MARKDOWN_ATTACHMENT_DIR_NAME = "文本附件";

const FRONT_MATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

function assertAbsoluteFilePath(label, filePath) {
  if (typeof filePath !== "string" || !path.isAbsolute(filePath)) {
    throw new Error(`${label} must be an absolute file path`);
  }
}

function splitFrontMatter(markdown) {
  const match = markdown.match(FRONT_MATTER_RE);
  if (!match) return { data: {}, body: markdown };
  const raw = match[1] || "";
  const parsed = raw.trim() ? YAML.load(raw) : {};
  if (parsed !== null && (typeof parsed !== "object" || Array.isArray(parsed))) {
    throw new Error("markdown frontmatter must be an object");
  }
  return { data: parsed || {}, body: markdown.slice(match[0].length) };
}

function safeBaseName(filePath) {
  const parsed = path.parse(filePath);
  return (parsed.name || "document")
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    || "document";
}

function timestampForName(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function uniqueAttachmentPath(markdownFilePath, generatedFilePath, now) {
  const docDir = path.dirname(markdownFilePath);
  const attachmentDir = path.join(docDir, MARKDOWN_ATTACHMENT_DIR_NAME);
  const ext = path.extname(generatedFilePath) || ".png";
  const base = `${safeBaseName(markdownFilePath)}-cover-${timestampForName(now)}`;
  let index = 0;
  while (true) {
    const fileName = index === 0 ? `${base}${ext}` : `${base}-${index + 1}${ext}`;
    const absPath = path.join(attachmentDir, fileName);
    if (!fs.existsSync(absPath)) {
      return {
        attachmentDir,
        absolutePath: absPath,
        relativePath: path.posix.join(MARKDOWN_ATTACHMENT_DIR_NAME, fileName),
      };
    }
    index += 1;
  }
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function ratioFromDimensions(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const divisor = gcd(Math.round(width), Math.round(height));
  return `${Math.round(width) / divisor}:${Math.round(height) / divisor}`;
}

function normalizeGenerator(generator = {}) {
  const provider = generator.provider || generator.providerId || null;
  const model = generator.model || generator.modelId || null;
  if (!provider && !model) return undefined;
  return {
    ...(provider ? { provider } : {}),
    ...(model ? { model } : {}),
  };
}

function serializeFrontMatter(data, body) {
  const yaml = YAML.dump(data, {
    lineWidth: 1000,
    noRefs: true,
    sortKeys: false,
  }).trimEnd();
  return `---\n${yaml}\n---\n${body}`;
}

export function buildCoverPromptCompilerPrompt({
  themeTone = "light",
  preferredRatio = "3:2",
  userGuidance = "",
} = {}) {
  const tone = themeTone === "dark" ? "深色主题，低照度、克制高光、暗部仍保留纸张纤维" : "浅色主题，柔和暖光、低对比、纸面留白";
  return [
    "你要为一篇 Markdown 文档生成一条图片生成模型可直接使用的英文提示词。",
    `画幅固定为横向 ${preferredRatio}。`,
    "固定画风：现代 Anime 风格的精致动画电影 key visual，强烈纸张质感、印刷纹理、装帧级细节、细腻颗粒、温润材料感。",
    `主题光感：${tone}。`,
    "内容策略：先阅读文档，再提炼文章内容的意象主题。画面应具有电影感，像一帧有故事的电影场景，通过场面调度、真实空间、人物动作、光线、道具关系、环境痕迹表达主题。",
    "审美方向：文学气息、星空与幻想感可以进入画面，但必须由场景本身承载，保持情绪厚度和现实质感。",
    "输出要求：只输出最终图片提示词，一段英文，自然可读。",
    userGuidance ? `用户补充方向：${userGuidance}` : "",
  ].filter(Boolean).join("\n");
}

export async function applyMarkdownCoverFromGeneratedFile({
  markdownFilePath,
  generatedFilePath,
  prompt,
  promptPreset = MARKDOWN_COVER_PROMPT_PRESET,
  preferredRatio = "3:2",
  actualRatio,
  pixelWidth,
  pixelHeight,
  generator,
  now = new Date(),
} = {}) {
  assertAbsoluteFilePath("markdownFilePath", markdownFilePath);
  assertAbsoluteFilePath("generatedFilePath", generatedFilePath);

  const markdownStat = fs.statSync(markdownFilePath);
  if (!markdownStat.isFile()) throw new Error("markdownFilePath must point to a file");
  const generatedStat = fs.statSync(generatedFilePath);
  if (!generatedStat.isFile()) throw new Error("generatedFilePath must point to a file");

  const target = uniqueAttachmentPath(markdownFilePath, generatedFilePath, now);
  fs.mkdirSync(target.attachmentDir, { recursive: true });
  fs.copyFileSync(generatedFilePath, target.absolutePath);

  const rawMarkdown = fs.readFileSync(markdownFilePath, "utf-8");
  const { data, body } = splitFrontMatter(rawMarkdown);
  const cover = {
    image: target.relativePath,
    prompt: String(prompt || "").trim(),
    promptPreset,
    preferredRatio,
    actualRatio: actualRatio || ratioFromDimensions(pixelWidth, pixelHeight) || null,
    pixelWidth: Number.isFinite(pixelWidth) ? Math.round(pixelWidth) : null,
    pixelHeight: Number.isFinite(pixelHeight) ? Math.round(pixelHeight) : null,
    displayWidth: 100,
    displayHeight: 320,
    positionX: 50,
    positionY: 50,
    generatedAt: now.toISOString(),
    generator: normalizeGenerator(generator),
  };

  for (const key of Object.keys(cover)) {
    if (cover[key] === null || cover[key] === undefined || cover[key] === "") {
      delete cover[key];
    }
  }

  const nextMarkdown = serializeFrontMatter({ ...data, cover }, body);
  atomicWriteSync(markdownFilePath, nextMarkdown);
  return {
    cover,
    markdownFilePath,
    attachmentPath: target.absolutePath,
  };
}

export function resolveGeneratedImagePath(generatedDir, fileName) {
  if (typeof generatedDir !== "string" || !path.isAbsolute(generatedDir)) {
    throw new Error("generatedDir must be an absolute path");
  }
  if (typeof fileName !== "string" || !fileName.trim()) {
    throw new Error("generated image file name is required");
  }
  const resolved = path.resolve(generatedDir, fileName);
  const root = path.resolve(generatedDir);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error("generated image path escapes generatedDir");
  }
  return resolved;
}
