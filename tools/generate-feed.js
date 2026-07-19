/**
 * 生成 Atom 订阅源 feed.xml
 * 用法: node tools/generate-feed.js
 *
 * 注意：博客文章数据写在 js/posts.js（非模块），此处通过 new Function 动态求值读取。
 * 用户通过编辑器写的「草稿/发布的本地文章」仅存于浏览器 localStorage，无法写入静态文件，
 * 故 feed 仅包含 js/posts.js 中的文章。若新增了文章数据，重新运行本脚本即可。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const POSTS_SRC = fs.readFileSync(path.join(ROOT, 'js', 'posts.js'), 'utf8');
const POSTS = new Function(POSTS_SRC + '\nreturn POSTS;')();

// ====== 站点配置（部署时请把 SITE_URL 改成你的真实域名）======
const SITE_TITLE = '墨记 — 技术与生活随笔';
const SITE_URL = 'https://mo-notes.example.com';
const SITE_AUTHOR = '墨记';
const SITE_SUBTITLE = '用文字记录思考，用代码构建世界';

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toIsoDate(dateStr) {
  // dateStr 形如 2026-07-10，按 +08:00 处理
  const d = new Date(dateStr + 'T00:00:00+08:00');
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

const sorted = POSTS.slice().sort((a, b) => new Date(b.date) - new Date(a.date));

const entries = sorted.map((p) => {
  const link = `${SITE_URL}/#/post/${p.id}`;
  const id = `tag:mo-notes,${p.date}:${p.id}`;
  const summary = (p.excerpt || '').replace(/<[^>]+>/g, '');
  const published = toIsoDate(p.date);
  return `    <entry>
      <title>${escapeXml(p.title)}</title>
      <link href="${escapeXml(link)}"/>
      <id>${escapeXml(id)}</id>
      <updated>${published}</updated>
      <published>${published}</published>
      <author><name>${escapeXml(SITE_AUTHOR)}</name></author>
      <summary>${escapeXml(summary)}</summary>
    </entry>`;
}).join('\n');

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(SITE_TITLE)}</title>
  <link href="${escapeXml(SITE_URL)}/"/>
  <link rel="self" href="${escapeXml(SITE_URL)}/feed.xml"/>
  <id>${escapeXml(SITE_URL)}/</id>
  <updated>${new Date().toISOString()}</updated>
  <author><name>${escapeXml(SITE_AUTHOR)}</name></author>
  <subtitle>${escapeXml(SITE_SUBTITLE)}</subtitle>
${entries}
</feed>
`;

fs.writeFileSync(path.join(ROOT, 'feed.xml'), feed, 'utf8');
console.log(`✅ 已生成 feed.xml，共 ${sorted.length} 篇文章`);
