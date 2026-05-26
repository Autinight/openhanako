export const name = "list-capabilities";
export const description = "列出 Beautify 工具目前支持的审美增强能力。";

export { isBeautifyEnabledForAgentConfig as isEnabledForAgentConfig } from "../lib/availability.js";

export const parameters = {
  type: "object",
  properties: {},
};

export async function execute() {
  return {
    content: [{
      type: "text",
      text: "Beautify 当前支持 Markdown cover：根据文档内容生成 3:2 横向、现代 Anime 纸张质感、电影感和故事感的题图，并写回 Markdown frontmatter。",
    }],
    details: {
      capabilities: [{
        id: "markdown-cover",
        target: "markdown",
        tools: ["beautify_create-cover", "beautify_apply-cover-candidate"],
        promptPreset: "modern-anime-paper-key-visual",
        preferredRatio: "3:2",
      }],
    },
  };
}
