import { describe, expect, it } from 'vitest';
import {
  parseMarkdownCover,
  stripMarkdownFrontMatterForPreview,
  updateMarkdownCoverLayout,
} from '../../utils/markdown-cover';

describe('markdown cover utilities', () => {
  it('parses cover metadata and strips frontmatter from preview markdown', () => {
    const markdown = [
      '---',
      'title: Demo',
      'cover:',
      '  image: 文本附件/cover.png',
      '  displayHeight: 360',
      '  positionX: 50',
      '  positionY: 42',
      '---',
      '# Demo',
      '',
      'Body',
    ].join('\n');

    expect(parseMarkdownCover(markdown)).toMatchObject({
      image: '文本附件/cover.png',
      displayHeight: 360,
      positionX: 50,
      positionY: 42,
    });
    expect(stripMarkdownFrontMatterForPreview(markdown)).toBe('# Demo\n\nBody');
  });

  it('updates only layout fields while preserving unrelated frontmatter and cover fields', () => {
    const markdown = [
      '---',
      'title: Demo',
      'cover:',
      '  image: 文本附件/cover.png',
      '  promptPreset: modern-anime-paper-key-visual',
      '  positionY: 42',
      'tags:',
      '  - writing',
      '---',
      '# Demo',
    ].join('\n');

    const next = updateMarkdownCoverLayout(markdown, {
      displayHeight: 420,
      positionX: 50,
      positionY: 64,
      displayWidth: 100,
    });

    expect(next).toContain('title: Demo');
    expect(next).toContain('tags:\n  - writing');
    expect(next).toContain('image: 文本附件/cover.png');
    expect(next).toContain('promptPreset: modern-anime-paper-key-visual');
    expect(next).toContain('displayHeight: 420');
    expect(next).toContain('positionX: 50');
    expect(next).toContain('positionY: 64');
    expect(next).toContain('displayWidth: 100');
    expect(next).toMatch(/\n---\n# Demo$/);
  });
});
