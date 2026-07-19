/**
 * 博客应用核心逻辑
 * 基于 hash 的前端路由 + 页面渲染
 * 支持：暗亮主题切换、全局搜索(Ctrl+K)、阅读进度条、
 *       代码复制按钮、文章目录(TOC)、阅读时间估算、归档页
 */
(function () {
  'use strict';

  // ========================================
  // 工具函数
  // ========================================

  /** HTML 转义 */
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /** 格式化日期（中文格式） */
  function formatDate(dateStr) {
    const date = new Date(dateStr);
    const months = ['一月', '二月', '三月', '四月', '五月', '六月',
                    '七月', '八月', '九月', '十月', '十一月', '十二月'];
    return `${date.getFullYear()} 年 ${months[date.getMonth()]} ${date.getDate()} 日`;
  }

  /** 格式化日期（短格式） */
  function formatDateShort(dateStr) {
    const date = new Date(dateStr);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /** 获取所有标签及计数 */
  function getAllTags() {
    const tagMap = {};
    POSTS.forEach(post => {
      post.tags.forEach(tag => {
        tagMap[tag] = (tagMap[tag] || 0) + 1;
      });
    });
    return Object.entries(tagMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }

  /** 获取文章（按日期倒序） */
  function getSortedPosts() {
    return [...POSTS].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /** 根据 ID 查找文章 */
  function getPostById(id) {
    return POSTS.find(p => p.id === id);
  }

  /** 根据标签筛选文章 */
  function getPostsByTag(tag) {
    return getSortedPosts().filter(p => p.tags.includes(tag));
  }

  /** 生成标签 HTML */
  function renderTags(tags) {
    return tags.map(tag =>
      `<a href="#/tags?tag=${encodeURIComponent(tag)}" class="tag">${escapeHtml(tag)}</a>`
    ).join('');
  }

  /** 估算阅读时间 */
  function estimateReadingTime(content) {
    const chineseChars = (content.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWords = (content.match(/[a-zA-Z]+/g) || []).length;
    const codeBlocks = (content.match(/```[\s\S]*?```/g) || []).length;
    const minutes = Math.ceil(chineseChars / 400 + englishWords / 200 - codeBlocks * 0.3);
    return Math.max(1, minutes);
  }

  /** 计算字数 */
  function countWords(content) {
    // 剔除代码块
    const cleanContent = content.replace(/```[\s\S]*?```/g, '');
    const chineseChars = (cleanContent.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWords = (cleanContent.match(/[a-zA-Z]+/g) || []).length;
    // 中文按字计，英文按词计（1词≈1.5字）
    return chineseChars + Math.round(englishWords * 1.5);
  }

  /** 获取相关文章（共享标签排序） */
  function getRelatedPosts(currentPost, limit = 3) {
    return getSortedPosts()
      .filter(p => p.id !== currentPost.id)
      .map(p => ({
        post: p,
        sharedTags: p.tags.filter(t => currentPost.tags.includes(t)).length
      }))
      .sort((a, b) => b.sharedTags - a.sharedTags)
      .slice(0, limit)
      .map(item => item.post);
  }

  /** 显示 Toast 通知 */
  function showToast(message, icon = '✅') {
    // 移除已有的 toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `<span class="toast-icon">${icon}</span>${escapeHtml(message)}`;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });

    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  /** 生成 slug（拼音简化：取中文首字或英文小写） */
  function slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'heading';
  }

  /** 生成文章目录 */
  function generateTOC(htmlContent) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const headings = tempDiv.querySelectorAll('h1, h2, h3');

    if (headings.length < 2) return { tocHtml: '', modifiedHtml: htmlContent };

    let tocHtml = '<nav class="toc" aria-label="文章目录"><div class="toc-title">目录</div><ul class="toc-list">';
    const usedIds = {};

    headings.forEach((h) => {
      const level = h.tagName.toLowerCase();
      const text = h.textContent;
      // 基于 slug 生成 ID，避免重复
      let baseId = slugify(text);
      let id = baseId;
      let counter = 1;
      while (usedIds[id]) {
        id = `${baseId}-${counter}`;
        counter++;
      }
      usedIds[id] = true;
      h.id = id;
      tocHtml += `<li class="toc-item toc-${level}"><a href="#${id}">${escapeHtml(text)}</a></li>`;
    });
    tocHtml += '</ul></nav>';

    return { tocHtml, modifiedHtml: tempDiv.innerHTML };
  }

  // ========================================
  // 配置 marked.js
  // ========================================
  function configureMarked() {
    if (typeof marked !== 'undefined') {
      marked.setOptions({
        breaks: true,
        gfm: true,
      });
    }

    // 自定义渲染器 — 为代码块添加语言标签和复制按钮
    if (typeof hljs !== 'undefined') {
      const renderer = new marked.Renderer();

      // marked v12 使用对象参数 { text, lang, escaped }
      renderer.code = function ({ text, lang, escaped }) {
        const code = text;
        const language = lang || '';
        let highlighted;
        if (language && hljs.getLanguage(language)) {
          try {
            highlighted = hljs.highlight(code, { language }).value;
          } catch (e) {
            highlighted = escapeHtml(code);
          }
        } else {
          try {
            highlighted = hljs.highlightAuto(code).value;
          } catch (e) {
            highlighted = escapeHtml(code);
          }
        }
        const langLabel = language || 'text';
        return `<div class="code-block-wrapper">
          <div class="code-block-header">
            <span class="code-lang">${escapeHtml(langLabel)}</span>
            <span class="code-actions">
              <button class="code-open-btn" title="在新窗口查看代码" aria-label="在新窗口查看代码">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
                </svg>
              </button>
              <button class="code-copy-btn" title="复制代码">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
              </button>
            </span>
          </div>
          <pre><code class="hljs language-${escapeHtml(langLabel)}">${highlighted}</code></pre>
        </div>`;
      };

      // 图片懒加载 — 合入同一 renderer，避免两次 marked.use 互相覆盖
      renderer.image = function ({ href, title, text }) {
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
        return `<img src="${escapeHtml(href)}" alt="${escapeHtml(text || '')}"${titleAttr} loading="lazy" class="lazy-img" onload="this.classList.add('loaded')">`;
      };

      marked.use({ renderer });
    }
  }

  // ========================================
  // 页面渲染
  // ========================================

  /** 当前排序方式 */
  let currentSort = 'date';

  /** 按排序方式获取文章 */
  function getSortedPostsBy(sort) {
    const posts = [...POSTS];
    switch (sort) {
      case 'title':
        return posts.sort((a, b) => a.title.localeCompare(b.title, 'zh'));
      case 'reading':
        return posts.sort((a, b) => estimateReadingTime(a.content) - estimateReadingTime(b.content));
      default:
        return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
  }

  window.changeSort = function (sort) {
    currentSort = sort;
    render();
  };

  /** 渲染首页 */
  function renderHome() {
    const posts = getSortedPostsBy(currentSort);
    const tags = getAllTags();

    const postCards = posts.map((post, idx) => {
      const readingTime = estimateReadingTime(post.content);
      const delay = (idx * 0.05 + 0.05).toFixed(2);
      return `
      <article class="post-card stagger-enter" tabindex="0" role="button" aria-label="阅读文章：${escapeHtml(post.title)}" style="animation-delay:${delay}s" onclick="location.hash = '#/post/${post.id}'">
        <div class="post-card-top">
          <span class="post-card-date">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            ${formatDateShort(post.date)}
          </span>
          <span class="post-card-reading-time">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            ${readingTime} 分钟
          </span>
        </div>
        <h2 class="post-card-title">${escapeHtml(post.title)}${isRead(post.id) ? '<span class="read-badge">已读</span>' : ''}${post.draft ? '<span class="draft-badge">草稿</span>' : ''}</h2>
        <p class="post-card-excerpt">${escapeHtml(post.excerpt)}</p>
        <div class="post-card-tags">${renderTags(post.tags)}</div>
      </article>
    `;
    }).join('');

    return `
      <section class="hero fade-in">
        <div class="hero-glow-ring"></div>
        <div class="hero-avatar">📝</div>
        <h1 class="hero-title">墨记</h1>
        <p class="hero-subtitle">用文字记录思考，用代码构建世界。这里记录技术探索与生活感悟。</p>
        <div class="hero-cta">
          <a href="#/write" class="hero-cta-btn hero-cta-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            写文章
          </a>
          <button class="hero-cta-btn hero-cta-secondary" onclick="document.getElementById('searchOverlay').classList.add('active');document.getElementById('searchInput').focus()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            搜索文章
          </button>
          <a href="#/archive" class="hero-cta-btn hero-cta-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 4h18M3 8h18M3 12h18M3 16h18"/>
            </svg>
            文章归档
          </a>
        </div>
        <div class="hero-divider"></div>
        <div class="hero-stats">
          <div class="hero-stat">
            <div class="hero-stat-num">${POSTS.length}</div>
            <div class="hero-stat-label">篇文章</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-num">${tags.length}</div>
            <div class="hero-stat-label">个标签</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-num">${getReadHistory().length}<span style="font-size:0.9rem;color:var(--text-muted)">/${POSTS.length}</span></div>
            <div class="hero-stat-label">已读</div>
          </div>
        </div>
      </section>

      <div class="section-header">
        <h2 class="section-title">最新文章</h2>
        <div class="sort-controls">
          <button class="sort-btn ${currentSort === 'date' ? 'active' : ''}" onclick="changeSort('date')">最新</button>
          <button class="sort-btn ${currentSort === 'title' ? 'active' : ''}" onclick="changeSort('title')">标题</button>
          <button class="sort-btn ${currentSort === 'reading' ? 'active' : ''}" onclick="changeSort('reading')">短篇</button>
          <a href="#/tags" class="back-link" style="margin-left:8px">全部标签 →</a>
        </div>
      </div>

      <div class="post-list">
        ${postCards}
      </div>

      ${subscribeCard()}
    `;
  }

  /** 渲染文章详情 */
  function renderPostDetail(id) {
    const post = getPostById(id);

    if (!post) {
      return `
        <div class="empty-state fade-in">
          <div class="empty-state-icon">🔍</div>
          <p class="empty-state-text">文章不存在或已被删除</p>
          <br>
          <a href="#/" class="back-link">← 返回首页</a>
        </div>
      `;
    }

    // 标记已读
    markAsRead(id);

    const sortedPosts = getSortedPosts();
    const currentIndex = sortedPosts.findIndex(p => p.id === id);
    const prevPost = currentIndex > 0 ? sortedPosts[currentIndex - 1] : null;
    const nextPost = currentIndex < sortedPosts.length - 1 ? sortedPosts[currentIndex + 1] : null;

    // 渲染 Markdown
    let htmlContent = marked.parse(post.content);

    // 生成目录
    const { tocHtml, modifiedHtml } = generateTOC(htmlContent);
    htmlContent = modifiedHtml;

    // 阅读时间
    const readingTime = estimateReadingTime(post.content);
    // 字数
    const wordCount = countWords(post.content);
    // 相关推荐
    const relatedPosts = getRelatedPosts(post);

    // 更新文档标题
    updateDocTitle(post.title);

    const wordCountLabel = wordCount >= 1000 ? `${Math.round(wordCount / 100) / 10}k` : wordCount;

    // 分享按钮功能
    const shareBtnId = 'shareBtn_' + post.id;

    return `
      <article class="post-detail fade-in">
        <a href="#/" class="back-link" style="margin-bottom: 20px; display: inline-flex;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          返回首页
        </a>

        <header class="post-detail-header">
          <h1 class="post-detail-title">${escapeHtml(post.title)}</h1>
          <div class="post-detail-meta">
            <span class="post-detail-date">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              ${formatDate(post.date)}
            </span>
            <span class="post-detail-reading-time">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              ${readingTime} 分钟 · ${wordCountLabel} 字
            </span>
            <div class="post-detail-tags">${renderTags(post.tags)}</div>
          </div>
          <div class="post-actions">
            <button class="post-action-btn" id="${shareBtnId}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              分享链接
            </button>
            <button class="post-action-btn bookmark-btn" onclick="toggleBookmark('${post.id}')" id="bookmarkBtn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
              </svg>
              <span id="bookmarkText">收藏</span>
            </button>
          </div>
        </header>

        ${tocHtml}

        <div class="post-detail-body markdown-body">
          ${htmlContent}
        </div>

        ${relatedPosts.length > 0 ? `
        <div class="related-posts">
          <h3 class="related-posts-title">相关推荐</h3>
          <div class="related-posts-grid">
            ${relatedPosts.map(rp => `
              <div class="related-post-card" tabindex="0" role="button" aria-label="阅读文章：${escapeHtml(rp.title)}" onclick="location.hash='#/post/${rp.id}'">
                <div class="related-post-card-title">${escapeHtml(rp.title)}</div>
                <div class="related-post-card-date">${formatDateShort(rp.date)}</div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <footer class="post-detail-footer">
          <div class="post-nav">
            ${prevPost ? `
            <div class="post-nav-item" tabindex="0" role="button" onclick="location.hash = '#/post/${prevPost.id}'">
              <div class="post-nav-label">← 上一篇</div>
              <div class="post-nav-title">${escapeHtml(prevPost.title)}</div>
            </div>` : '<div class="post-nav-item post-nav-empty"></div>'}
            ${nextPost ? `
            <div class="post-nav-item" tabindex="0" role="button" onclick="location.hash = '#/post/${nextPost.id}'">
              <div class="post-nav-label">下一篇 →</div>
              <div class="post-nav-title">${escapeHtml(nextPost.title)}</div>
            </div>` : '<div class="post-nav-item post-nav-empty"></div>'}
          </div>
          <div class="post-detail-actions-bottom">
            <button class="post-action-btn" onclick="exportPostMD('${post.id}')" title="导出为 Markdown 文件">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              导出 MD
            </button>
            <button class="post-action-btn" onclick="exportPostPDF()" title="打印 / 导出为 PDF">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"/>
              </svg>
              导出 PDF
            </button>
            <button class="post-action-btn" onclick="navigator.clipboard.writeText(window.location.href).then(()=>showToast('链接已复制！','🔗'))">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              分享链接
            </button>
            <button class="post-action-btn" onclick="window.scrollTo({top:0,behavior:'smooth'})">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
              回到顶部
            </button>
          </div>
        </footer>
      </article>
    `;
  }

  /** 渲染标签页 */
  function renderTagsPage(activeTag) {
    const allTags = getAllTags();

    const maxCount = Math.max(...allTags.map(t => t.count));
    const minCount = Math.min(...allTags.map(t => t.count));

    const tagCloud = allTags.map(({ name, count }) => {
      // 根据文章数量动态计算标签大小
      const ratio = maxCount === minCount ? 0.5 : (count - minCount) / (maxCount - minCount);
      const sizeLevel = Math.round(ratio * 3); // 0-3 四级
      const sizes = ['tag-size-sm', 'tag-size-md', 'tag-size-lg', 'tag-size-xl'];
      const sizeClass = sizes[sizeLevel];
      return `
      <span class="tag-cloud-item ${activeTag === name ? 'active' : ''} ${sizeClass}"
            tabindex="0" role="button" aria-label="标签：${escapeHtml(name)}（${count}篇）"
            onclick="location.hash = '#/tags?tag=${encodeURIComponent(name)}'">
        #${escapeHtml(name)}
        <span class="tag-cloud-count">${count}</span>
      </span>
    `;
    }).join('');

    let postListHtml = '';

    if (activeTag) {
      const filteredPosts = getPostsByTag(activeTag);
      const cards = filteredPosts.map((post, idx) => {
        const readingTime = estimateReadingTime(post.content);
        const delay = (idx * 0.05 + 0.05).toFixed(2);
        return `
        <article class="post-card stagger-enter" tabindex="0" role="button" aria-label="阅读文章：${escapeHtml(post.title)}" style="animation-delay:${delay}s" onclick="location.hash = '#/post/${post.id}'">
          <div class="post-card-top">
            <span class="post-card-date">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              ${formatDateShort(post.date)}
            </span>
            <span class="post-card-reading-time">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              ${readingTime} 分钟
            </span>
          </div>
          <h2 class="post-card-title">${escapeHtml(post.title)}</h2>
          <p class="post-card-excerpt">${escapeHtml(post.excerpt)}</p>
          <div class="post-card-tags">${renderTags(post.tags)}</div>
        </article>
      `;
      }).join('');

      postListHtml = `
        <div class="section-header">
          <h2 class="section-title">「${escapeHtml(activeTag)}」标签下的文章 (${filteredPosts.length})</h2>
          <a href="#/tags" class="back-link">清除筛选 ✕</a>
        </div>
        <div class="post-list">${cards || '<div class="empty-state"><div class="empty-state-icon">📭</div><p class="empty-state-text">该标签下暂无文章</p></div>'}</div>
      `;
    } else {
      // 没有选中标签时，显示最近文章列表（避免页面太长）
      const recentPosts = getSortedPosts();
      const cards = recentPosts.map((post, idx) => {
        const readingTime = estimateReadingTime(post.content);
        const delay = (idx * 0.05 + 0.05).toFixed(2);
        return `
        <article class="post-card stagger-enter" tabindex="0" role="button" aria-label="阅读文章：${escapeHtml(post.title)}" style="animation-delay:${delay}s" onclick="location.hash = '#/post/${post.id}'">
          <div class="post-card-top">
            <span class="post-card-date">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              ${formatDateShort(post.date)}
            </span>
            <span class="post-card-reading-time">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              ${readingTime} 分钟
            </span>
          </div>
          <h2 class="post-card-title">${escapeHtml(post.title)}</h2>
          <p class="post-card-excerpt">${escapeHtml(post.excerpt)}</p>
          <div class="post-card-tags">${renderTags(post.tags)}</div>
        </article>
      `;
      }).join('');

      postListHtml = `
        <div class="section-header">
          <h2 class="section-title">全部文章 (${POSTS.length})</h2>
        </div>
        <div class="post-list">${cards}</div>
      `;
    }

    return `
      <div class="tags-page fade-in">
        <div class="section-header">
          <h2 class="section-title">标签分类</h2>
        </div>
        <div class="tag-cloud">${tagCloud}</div>
        ${postListHtml}
      </div>
    `;
  }

  /** 渲染归档页面 */
  function renderArchive() {
    const posts = getSortedPosts();
    const groups = {};
    posts.forEach(post => {
      const d = new Date(post.date);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const key = `${year}-${String(month).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = { year, month, posts: [] };
      groups[key].posts.push(post);
    });

    const months = ['一月','二月','三月','四月','五月','六月',
                    '七月','八月','九月','十月','十一月','十二月'];

    const html = Object.keys(groups).sort().reverse().map(key => {
      const g = groups[key];
      return `
        <div class="timeline-group">
          <div class="timeline-marker">
            <div class="timeline-dot"></div>
            <div class="timeline-line"></div>
          </div>
          <div class="timeline-content">
            <h3 class="timeline-group-title">${g.year} 年 ${months[g.month - 1]}</h3>
            <span class="timeline-count">${g.posts.length} 篇</span>
            <div class="timeline-posts">
              ${g.posts.map(post => `
                <div class="timeline-post" tabindex="0" role="button" aria-label="阅读文章：${escapeHtml(post.title)}" onclick="location.hash='#/post/${post.id}'">
                  <span class="timeline-post-date">${formatDateShort(post.date)}</span>
                  <span class="timeline-post-title">${escapeHtml(post.title)}</span>
                  <span class="timeline-post-tags">${renderTags(post.tags)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }).join('');

    updateDocTitle('文章归档');

    return `<div class="archive-page fade-in">
        <div class="section-header"><h2 class="section-title">文章归档</h2></div>
        <div class="timeline">${html}</div>
    </div>`;
  }

  /** 渲染文章编辑器页面 */
  function renderWritePage(editId) {
    // 如果是编辑模式，加载已有文章数据
    let existingPost = null;
    if (editId) {
      existingPost = getPostById(editId);
      if (!existingPost) {
        return `
          <div class="empty-state fade-in">
            <div class="empty-state-icon">🔍</div>
            <p class="empty-state-text">文章不存在</p>
            <br>
            <a href="#/write" class="back-link">← 写新文章</a>
          </div>
        `;
      }
    }

    updateDocTitle(editId ? '编辑文章' : '写文章');

    const title = existingPost ? existingPost.title : '';
    const tags = existingPost ? existingPost.tags.join(', ') : '';
    const excerpt = existingPost ? existingPost.excerpt : '';
    const content = existingPost ? existingPost.content : '';

    // 获取草稿列表
    const drafts = getDrafts();

    const draftsHtml = drafts.length > 0 ? `
      <div class="editor-drafts">
        <h4 class="editor-drafts-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
          </svg>
          我的草稿 (${drafts.length})
        </h4>
        <div class="editor-drafts-list">
          ${drafts.map(d => `
            <div class="editor-draft-item" tabindex="0" role="button" aria-label="编辑草稿：${escapeHtml(d.title || '未命名草稿')}" onclick="location.hash='#/write?edit=${d.id}'">
              <div class="editor-draft-item-title">${escapeHtml(d.title || '未命名草稿')}</div>
              <div class="editor-draft-item-meta">${formatDateShort(d.date)} · ${d.tags.length} 个标签</div>
              <button class="editor-draft-delete" onclick="event.stopPropagation();deleteDraft('${d.id}')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    ` : `<div class="editor-drafts editor-drafts-empty">
        <div class="editor-drafts-empty-icon">📝</div>
        <p class="editor-drafts-empty-text">暂无草稿，开始写你的第一篇文章吧！</p>
      </div>`;

    return `
      <div class="write-page fade-in">
        <div class="editor-header">
          <a href="#/" class="back-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            返回首页
          </a>
          <h2 class="editor-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            ${editId ? '编辑文章' : '写新文章'}
          </h2>
          <div class="editor-header-actions">
            <button class="editor-btn editor-btn-secondary" onclick="toggleSplitView()" id="splitBtn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/>
              </svg>
              <span id="splitToggleText">分屏</span>
            </button>
            <button class="editor-btn editor-btn-secondary" onclick="togglePreview()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              <span id="previewToggleText">预览</span>
            </button>
            <button class="editor-btn editor-btn-secondary" onclick="document.getElementById('importFileInput').click()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              导入
            </button>
            <input type="file" id="importFileInput" accept=".json,.md,.markdown" style="display:none" onchange="importArticle(event)">
            <button class="editor-btn editor-btn-secondary" onclick="exportArticle()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              导出
            </button>
            <button class="editor-btn editor-btn-primary" onclick="saveArticle()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
              </svg>
              保存草稿
            </button>
            <button class="editor-btn editor-btn-publish" onclick="publishArticle()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
              发布文章
            </button>
          </div>
        </div>

        <div class="editor-body">
          <div class="editor-form" id="editorForm">
            <div class="editor-field">
              <label class="editor-label" for="articleTitle">标题</label>
              <input type="text" id="articleTitle" class="editor-input" placeholder="输入文章标题..." value="${escapeHtml(title)}">
            </div>

            <div class="editor-row">
              <div class="editor-field editor-field-half">
                <label class="editor-label" for="articleTags">标签</label>
                <input type="text" id="articleTags" class="editor-input" placeholder="逗号分隔，如：前端, JavaScript" value="${escapeHtml(tags)}">
              </div>
              <div class="editor-field editor-field-half">
                <label class="editor-label" for="articleDate">日期</label>
                <input type="date" id="articleDate" class="editor-input" value="${existingPost ? existingPost.date : new Date().toISOString().split('T')[0]}">
              </div>
            </div>

            <div class="editor-field">
              <label class="editor-label" for="articleExcerpt">摘要</label>
              <textarea id="articleExcerpt" class="editor-textarea editor-excerpt" placeholder="简短描述文章内容...">${escapeHtml(excerpt)}</textarea>
            </div>

            <div class="editor-field">
              <label class="editor-label" for="articleContent">
                正文 (Markdown)
                <span class="editor-label-hint">支持标准 Markdown 语法 + GFM 扩展</span>
                <span class="editor-auto-save-hint" id="autoSaveHint"></span>
              </label>
              <div class="editor-toolbar" id="editorToolbar">
                <button class="toolbar-btn" onclick="insertMarkdown('heading')" title="标题">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 4v16M18 4v16M6 12h12"/></svg>
                </button>
                <button class="toolbar-btn" onclick="insertMarkdown('bold')" title="加粗">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z"/><path d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z"/></svg>
                </button>
                <button class="toolbar-btn" onclick="insertMarkdown('italic')" title="斜体">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
                </button>
                <span class="toolbar-divider"></span>
                <button class="toolbar-btn" onclick="insertMarkdown('link')" title="链接">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                </button>
                <button class="toolbar-btn" onclick="insertMarkdown('image')" title="图片">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </button>
                <button class="toolbar-btn" onclick="insertMarkdown('code')" title="行内代码">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                </button>
                <button class="toolbar-btn" onclick="insertMarkdown('codeblock')" title="代码块">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 9l-2 3 2 3M15 9l2 3-2 3"/></svg>
                </button>
                <span class="toolbar-divider"></span>
                <button class="toolbar-btn" onclick="insertMarkdown('ul')" title="无序列表">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                </button>
                <button class="toolbar-btn" onclick="insertMarkdown('ol')" title="有序列表">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
                </button>
                <button class="toolbar-btn" onclick="insertMarkdown('quote')" title="引用">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2-2-2H4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h2"/></svg>
                </button>
                <button class="toolbar-btn" onclick="insertMarkdown('table')" title="表格">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
                </button>
                <span class="toolbar-divider"></span>
                <button class="toolbar-btn" onclick="insertMarkdown('hr')" title="分割线">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              </div>
              <div class="editor-content-wrap" id="editorContentWrap">
                <textarea id="articleContent" class="editor-textarea editor-content" placeholder="在此输入 Markdown 内容..." oninput="updatePreview();autoSaveDraft();">${escapeHtml(content)}</textarea>
                <div class="editor-preview markdown-body" id="editorPreview" style="display:none;"></div>
              </div>
            </div>
          </div>

          ${draftsHtml}
        </div>

        <input type="hidden" id="editId" value="${editId || ''}">
      </div>
    `;
  }

  // ========================================
  // 文章管理（localStorage）
  // ========================================

  const DRAFTS_KEY = 'moNotes_drafts';

  /** 获取草稿列表 */
  function getDrafts() {
    try {
      return JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  /** 保存草稿到 localStorage */
  function saveDraft(article) {
    const drafts = getDrafts();
    const existingIndex = drafts.findIndex(d => d.id === article.id);

    if (existingIndex >= 0) {
      drafts[existingIndex] = article;
    } else {
      drafts.push(article);
    }

    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
    return article;
  }

  /** 删除草稿 */
  function deleteDraft(id) {
    const drafts = getDrafts().filter(d => d.id !== id);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
    showToast('草稿已删除', '🗑️');
    // 只刷新编辑器侧边栏草稿列表，避免全页重渲染丢失编辑内容
    refreshDraftList();
  }

  /** 刷新编辑器侧边栏草稿列表（局部更新，不触发全页 render） */
  function refreshDraftList() {
    const draftsSection = document.querySelector('.editor-drafts') || document.querySelector('.editor-drafts-empty');
    if (!draftsSection) return;
    const drafts = getDrafts();
    const container = draftsSection.parentElement || draftsSection;
    // 找到编辑器页面容器
    const writePage = document.querySelector('.write-page');
    if (!writePage) return;

    const draftsHtml = drafts.length > 0 ? `
      <div class="editor-drafts">
        <h4 class="editor-drafts-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
          </svg>
          我的草稿 (${drafts.length})
        </h4>
        <div class="editor-drafts-list">
          ${drafts.map(d => `
            <div class="editor-draft-item" tabindex="0" role="button" aria-label="编辑草稿：${escapeHtml(d.title || '未命名草稿')}" onclick="location.hash='#/write?edit=${d.id}'">
              <div class="editor-draft-item-title">${escapeHtml(d.title || '未命名草稿')}</div>
              <div class="editor-draft-item-meta">${formatDateShort(d.date)} · ${d.tags.length} 个标签</div>
              <button class="editor-draft-delete" onclick="event.stopPropagation();deleteDraft('${d.id}')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    ` : `<div class="editor-drafts editor-drafts-empty">
        <div class="editor-drafts-empty-icon">📝</div>
        <p class="editor-drafts-empty-text">暂无草稿，开始写你的第一篇文章吧！</p>
      </div>`;

    // 替换草稿区域 HTML
    const oldSection = writePage.querySelector('.editor-drafts') || writePage.querySelector('.editor-drafts-empty');
    if (oldSection) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = draftsHtml;
      const newSection = tempDiv.firstElementChild;
      oldSection.replaceWith(newSection);
    }
  }

  /** 保存文章（暴露到全局作用域供 onclick 调用） */
  window.saveArticle = function () {
    const titleEl = document.getElementById('articleTitle');
    const tagsEl = document.getElementById('articleTags');
    const dateEl = document.getElementById('articleDate');
    const excerptEl = document.getElementById('articleExcerpt');
    const contentEl = document.getElementById('articleContent');
    const editIdEl = document.getElementById('editId');

    const title = titleEl.value.trim();
    const tagsStr = tagsEl.value.trim();
    const date = dateEl.value;
    const excerpt = excerptEl.value.trim();
    const content = contentEl.value;
    const editId = editIdEl.value;

    // 验证
    if (!title) {
      titleEl.focus();
      titleEl.style.borderColor = '#ef4444';
      showToast('请输入文章标题', '⚠️');
      setTimeout(() => { titleEl.style.borderColor = ''; }, 2000);
      return;
    }
    if (!content) {
      contentEl.focus();
      showToast('请输入文章正文', '⚠️');
      return;
    }

    // 解析标签
    const tags = tagsStr ? tagsStr.split(/[,，]/).map(t => t.trim()).filter(Boolean) : ['未分类'];

    // 生成 ID（编辑模式保留原ID）
    const id = editId || `draft-${Date.now()}`;

    // 自动生成摘要（如果为空）
    const finalExcerpt = excerpt || content.replace(/```[\s\S]*?```/g, '').replace(/[#*>`\[\]()]/g, '').trim().slice(0, 120) + '...';

    const article = { id, title, date, tags, excerpt: finalExcerpt, content, draft: true };

    saveDraft(article);
    showToast('草稿已保存！', '✅');

    // 更新 editId（如果新文章首次保存）
    if (!editId) {
      editIdEl.value = id;
    }

    // 更新 POSTS 数组以实时生效
    refreshPostsFromStorage();
  };

  /** 发布文章（将草稿标记为已发布，暴露到全局作用域） */
  window.publishArticle = function () {
    const editIdEl = document.getElementById('editId');
    const editId = editIdEl ? editIdEl.value : '';
    if (!editId) {
      showToast('请先保存草稿再发布', '⚠️');
      return;
    }

    const drafts = getDrafts();
    const draft = drafts.find(d => d.id === editId);
    if (!draft) {
      showToast('未找到该草稿', '⚠️');
      return;
    }

    // 移除草稿标记
    draft.draft = false;
    // 更新 ID 格式（draft-xxx → published-xxx 以区分）
    const newId = editId.replace('draft-', 'published-');
    draft.id = newId;

    // 保存更新后的数据
    const updatedDrafts = drafts.filter(d => d.id !== editId);
    updatedDrafts.push(draft);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(updatedDrafts));

    // 更新 editId
    editIdEl.value = newId;

    refreshPostsFromStorage();
    showToast('文章已发布！', '🎉');
  };

  /** 导出文章为 JSON（暴露到全局作用域） */
  window.exportArticle = function () {
    const titleEl = document.getElementById('articleTitle');
    const tagsEl = document.getElementById('articleTags');
    const dateEl = document.getElementById('articleDate');
    const excerptEl = document.getElementById('articleExcerpt');
    const contentEl = document.getElementById('articleContent');

    const article = {
      id: document.getElementById('editId').value || `post-${Date.now()}`,
      title: titleEl.value.trim() || '未命名文章',
      date: dateEl.value,
      tags: tagsEl.value.trim() ? tagsEl.value.split(/[,，]/).map(t => t.trim()).filter(Boolean) : ['未分类'],
      excerpt: excerptEl.value.trim(),
      content: contentEl.value
    };

    const json = JSON.stringify(article, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${article.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('文章已导出为 JSON 文件', '📥');
  };

  /** 导出文章为 Markdown 文件（暴露到全局作用域） */
  window.exportPostMD = function (id) {
    const post = getPostById(id);
    if (!post) return;
    const md = `# ${post.title}\n\n> 发布于 ${formatDate(post.date)}  \n> 标签：${(post.tags || []).join(', ')}\n\n${post.content}`;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${post.id}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('已导出 Markdown 文件', '📄');
  };

  /** 导出文章为 PDF（调用浏览器打印） */
  window.exportPostPDF = function () {
    showToast('正在打开打印窗口…', '🖨️');
    setTimeout(() => window.print(), 300);
  };

  /** 切换预览模式 */
  window.togglePreview = function () {
    const textarea = document.getElementById('articleContent');
    const preview = document.getElementById('editorPreview');
    const wrap = document.getElementById('editorContentWrap');
    const text = document.getElementById('previewToggleText');

    if (preview.style.display === 'none') {
      // 进入预览模式
      preview.innerHTML = marked.parse(textarea.value);
      preview.style.display = 'block';
      textarea.style.display = 'none';
      wrap.classList.add('preview-mode');
      text.textContent = '编辑';
    } else {
      // 返回编辑模式
      preview.style.display = 'none';
      textarea.style.display = 'block';
      wrap.classList.remove('preview-mode');
      text.textContent = '预览';
    }
  };

  /** 实时更新预览 */
  window.updatePreview = function () {
    const preview = document.getElementById('editorPreview');
    const textarea = document.getElementById('articleContent');
    if (!preview || !textarea) return;
    const wrap = document.getElementById('editorContentWrap');
    // 预览模式或分屏模式都更新
    if (wrap && (wrap.classList.contains('split-mode') || preview.style.display !== 'none')) {
      preview.innerHTML = marked.parse(textarea.value);
    }
  };

  /** 删除草稿（暴露到全局作用域） */
  window.deleteDraft = function (id) {
    deleteDraft(id);
  };

  /** Markdown 工具栏插入 */
  window.insertMarkdown = function (type) {
    const textarea = document.getElementById('articleContent');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);
    let insert = '';
    let cursorOffset = 0;

    switch (type) {
      case 'heading':
        insert = `## ${selected || '标题'}`;
        cursorOffset = selected ? 0 : -2;
        break;
      case 'bold':
        insert = `**${selected || '加粗文字'}**`;
        cursorOffset = selected ? 0 : -5;
        break;
      case 'italic':
        insert = `*${selected || '斜体文字'}*`;
        cursorOffset = selected ? 0 : -4;
        break;
      case 'link':
        insert = `[${selected || '链接文字'}](https://)`;
        cursorOffset = -1;
        break;
      case 'image':
        insert = `![${selected || '图片描述'}](https://)`;
        cursorOffset = -1;
        break;
      case 'code':
        insert = '`' + (selected || 'code') + '`';
        break;
      case 'codeblock':
        insert = '```javascript\n' + (selected || '// 代码') + '\n```';
        break;
      case 'ul':
        insert = selected ? selected.split('\n').map(l => '- ' + l).join('\n') : '- 列表项';
        break;
      case 'ol':
        insert = selected ? selected.split('\n').map((l, i) => `${i + 1}. ${l}`).join('\n') : '1. 列表项';
        break;
      case 'quote':
        insert = '> ' + (selected || '引用内容');
        break;
      case 'table':
        insert = '| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |';
        break;
      case 'hr':
        insert = '\n---\n';
        break;
    }

    textarea.focus();
    textarea.setRangeText(insert, start, end, 'end');
    if (cursorOffset) {
      const pos = start + insert.length + cursorOffset;
      textarea.setSelectionRange(pos, pos);
    }
    updatePreview();
    autoSaveDraft();
  };

  /** 导入文章 */
  window.importArticle = function (event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      if (file.name.endsWith('.json')) {
        try {
          const data = JSON.parse(text);
          if (data.title) document.getElementById('articleTitle').value = data.title;
          if (data.tags) document.getElementById('articleTags').value = Array.isArray(data.tags) ? data.tags.join(', ') : data.tags;
          if (data.date) document.getElementById('articleDate').value = data.date;
          if (data.excerpt) document.getElementById('articleExcerpt').value = data.excerpt;
          if (data.content) document.getElementById('articleContent').value = data.content;
          showToast('JSON 文章已导入', '📥');
        } catch (err) {
          showToast('JSON 格式错误', '⚠️');
        }
      } else {
        // Markdown 文件
        document.getElementById('articleContent').value = text;
        // 从文件名生成标题
        const baseName = file.name.replace(/\.(md|markdown)$/i, '');
        if (!document.getElementById('articleTitle').value) {
          document.getElementById('articleTitle').value = baseName;
        }
        showToast('Markdown 文件已导入', '📥');
      }
      updatePreview();
      autoSaveDraft();
    };
    reader.readAsText(file);
    // 重置 input 以便重复导入同一文件
    event.target.value = '';
  };

  /** 分屏预览模式 */
  window.toggleSplitView = function () {
    const textarea = document.getElementById('articleContent');
    const preview = document.getElementById('editorPreview');
    const wrap = document.getElementById('editorContentWrap');
    const text = document.getElementById('splitToggleText');
    const previewText = document.getElementById('previewToggleText');

    if (wrap.classList.contains('split-mode')) {
      // 退出分屏
      wrap.classList.remove('split-mode');
      preview.style.display = 'none';
      textarea.style.width = '100%';
      text.textContent = '分屏';
    } else {
      // 进入分屏
      wrap.classList.add('split-mode');
      preview.style.display = 'block';
      preview.innerHTML = marked.parse(textarea.value);
      text.textContent = '退出';
      // 确保预览模式关闭
      if (previewText.textContent === '编辑') {
        previewText.textContent = '预览';
      }
    }
  };

  /** 自动保存（防抖 3 秒） */
  let autoSaveTimer = null;
  window.autoSaveDraft = function () {
    clearTimeout(autoSaveTimer);
    const hint = document.getElementById('autoSaveHint');
    if (hint) hint.textContent = '编辑中...';
    autoSaveTimer = setTimeout(() => {
      const titleEl = document.getElementById('articleTitle');
      const contentEl = document.getElementById('articleContent');
      if (!titleEl || !contentEl) return;
      const title = titleEl.value.trim();
      const content = contentEl.value;
      if (!title || !content) {
        if (hint) hint.textContent = '';
        return;
      }
      // 静默保存
      const tagsEl = document.getElementById('articleTags');
      const dateEl = document.getElementById('articleDate');
      const excerptEl = document.getElementById('articleExcerpt');
      const editIdEl = document.getElementById('editId');
      const tags = tagsEl.value.trim() ? tagsEl.value.split(/[,，]/).map(t => t.trim()).filter(Boolean) : ['未分类'];
      const id = editIdEl.value || `draft-${Date.now()}`;
      const finalExcerpt = excerptEl.value.trim() || content.replace(/```[\s\S]*?```/g, '').replace(/[#*>`\[\]()]/g, '').trim().slice(0, 120) + '...';
      const article = { id, title, date: dateEl.value, tags, excerpt: finalExcerpt, content, draft: true };
      saveDraft(article);
      if (!editIdEl.value) editIdEl.value = id;
      refreshPostsFromStorage();
      if (hint) {
        const now = new Date();
        const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        hint.textContent = '已自动保存 ' + timeStr;
      }
    }, 3000);
  };

  /** 从 localStorage 加载文章到 POSTS 数组 */
  function refreshPostsFromStorage() {
    // 移除之前的草稿/已发布条目
    for (let i = POSTS.length - 1; i >= 0; i--) {
      if (POSTS[i].id.startsWith('draft-') || POSTS[i].id.startsWith('published-')) {
        POSTS.splice(i, 1);
      }
    }
    // 添加当前草稿和已发布文章
    const drafts = getDrafts();
    drafts.forEach(d => POSTS.push(d));
  }

  /** 渲染收藏列表页 */
  function renderBookmarksPage() {
    const bookmarks = getBookmarks();
    const bookmarkedPosts = bookmarks
      .map(id => getPostById(id))
      .filter(Boolean);

    updateDocTitle('收藏列表');

    if (bookmarkedPosts.length === 0) {
      return `
        <div class="empty-state fade-in">
          <div class="empty-state-icon">⭐</div>
          <p class="empty-state-text">还没有收藏任何文章</p>
          <br>
          <p style="font-size:0.85rem;color:var(--text-muted)">在文章详情页点击「收藏」按钮即可收藏</p>
          <br>
          <a href="#/" class="back-link">← 去看看文章</a>
        </div>
      `;
    }

    const cards = bookmarkedPosts.map((post, idx) => {
      const readingTime = estimateReadingTime(post.content);
      const delay = (idx * 0.05 + 0.05).toFixed(2);
      return `
        <article class="post-card stagger-enter" tabindex="0" role="button" aria-label="阅读文章：${escapeHtml(post.title)}" style="animation-delay:${delay}s" onclick="location.hash = '#/post/${post.id}'">
          <div class="post-card-top">
            <span class="post-card-date">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              ${formatDateShort(post.date)}
            </span>
            <span class="post-card-reading-time">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              ${readingTime} 分钟
            </span>
          </div>
          <h2 class="post-card-title">${escapeHtml(post.title)}</h2>
          <p class="post-card-excerpt">${escapeHtml(post.excerpt)}</p>
          <div class="post-card-tags">${renderTags(post.tags)}</div>
        </article>
      `;
    }).join('');

    return `
      <div class="fade-in">
        <div class="section-header">
          <h2 class="section-title">我的收藏 (${bookmarkedPosts.length})</h2>
        </div>
        <div class="post-list">${cards}</div>
      </div>
    `;
  }

  /** 渲染关于页面 */
  function renderAbout() {
    updateDocTitle('关于');

    return `
      <div class="about-page fade-in">
        <div class="about-header">
          <div class="about-avatar-ring">
            <div class="about-avatar">🧑‍💻</div>
          </div>
          <h1 class="about-name">你好，我是博主</h1>
          <p class="about-bio">全栈开发者 · 技术爱好者 · 终身学习者</p>
        </div>

        <div class="about-content">
          <div class="about-section-card">
            <div class="about-section-icon">👤</div>
            <div class="about-section-body">
              <h3>关于我</h3>
              <p>一个热爱技术的程序员。白天写业务代码，晚上折腾开源项目。相信好的代码应该像散文一样优雅，好的产品应该像艺术品一样精致。</p>
              <p>这个博客记录我在技术探索和生活中的所思所想。如果你也喜欢折腾代码、热爱技术，那我们就是朋友。</p>
            </div>
          </div>

          <div class="about-section-card">
            <div class="about-section-icon">🛠</div>
            <div class="about-section-body">
              <h3>技术栈</h3>
              <div class="about-skills">
                <span class="skill-badge skill-gradient-1">JavaScript / TypeScript</span>
                <span class="skill-badge skill-gradient-2">React / Vue</span>
                <span class="skill-badge skill-gradient-3">Node.js</span>
                <span class="skill-badge skill-gradient-4">Python</span>
                <span class="skill-badge skill-gradient-1">Go</span>
                <span class="skill-badge skill-gradient-2">Docker / K8s</span>
                <span class="skill-badge skill-gradient-3">PostgreSQL</span>
                <span class="skill-badge skill-gradient-4">Redis</span>
                <span class="skill-badge skill-gradient-1">Git</span>
                <span class="skill-badge skill-gradient-2">Linux</span>
              </div>
            </div>
          </div>

          <div class="about-section-card">
            <div class="about-section-icon">📚</div>
            <div class="about-section-body">
              <h3>写作方向</h3>
              <div class="about-directions">
                <div class="about-direction-item">
                  <div class="about-direction-dot"></div>
                  <strong>技术教程</strong> — 前端、后端、数据库的实践指南
                </div>
                <div class="about-direction-item">
                  <div class="about-direction-dot"></div>
                  <strong>读书笔记</strong> — 技术书和非技术书的读后感
                </div>
                <div class="about-direction-item">
                  <div class="about-direction-dot"></div>
                  <strong>工程实践</strong> — 架构设计、DevOps、效率工具
                </div>
                <div class="about-direction-item">
                  <div class="about-direction-dot"></div>
                  <strong>生活随笔</strong> — 思考感悟、日常记录
                </div>
              </div>
            </div>
          </div>

          <div class="about-section-card">
            <div class="about-section-icon">💡</div>
            <div class="about-section-body">
              <h3>博客技术</h3>
              <p>这个博客本身就是一个技术项目，采用纯原生技术栈构建：</p>
              <div class="about-tech-list">
                <span class="about-tech-item">原生 HTML/CSS/JS</span>
                <span class="about-tech-item">Hash 路由 SPA</span>
                <span class="about-tech-item">marked.js</span>
                <span class="about-tech-item">highlight.js</span>
                <span class="about-tech-item">暗/亮主题切换</span>
                <span class="about-tech-item">全局搜索</span>
                <span class="about-tech-item">文章编辑器</span>
              </div>
            </div>
          </div>

          <div class="about-section-card">
            <div class="about-section-icon">📬</div>
            <div class="about-section-body">
              <h3>联系我</h3>
              <p>如果你想和我交流，可以通过以下方式找到我：</p>
              <div class="about-links">
                <a href="mailto:blogger@example.com" class="about-link-card">
                  <div class="about-link-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <div>
                    <div class="about-link-title">邮箱</div>
                    <div class="about-link-desc">blogger@example.com</div>
                  </div>
                </a>
                <a href="https://github.com" class="about-link-card" target="_blank" rel="noopener noreferrer">
                  <div class="about-link-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                    </svg>
                  </div>
                  <div>
                    <div class="about-link-title">GitHub</div>
                    <div class="about-link-desc">开源项目与代码</div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
        ${subscribeCard()}
      </div>
    `;
  }

  // ========================================
  // 路由系统
  // ========================================

  /** 解析 hash 路由 */
  function parseRoute() {
    let hash = location.hash.slice(1);
    if (!hash) hash = '/';

    const [path, queryString] = hash.split('?');
    const params = {};
    if (queryString) {
      new URLSearchParams(queryString).forEach((value, key) => {
        params[key] = value;
      });
    }

    return { path, params };
  }

  /** 渲染页面 */
  function render() {
    const { path, params } = parseRoute();
    const app = document.getElementById('app');

    let html = '';

    if (path === '/' || path === '') {
      html = renderHome();
      updateDocTitle();
    } else if (path.startsWith('/post/')) {
      const postId = path.split('/')[2];
      html = renderPostDetail(postId);
    } else if (path === '/tags') {
      html = renderTagsPage(params.tag || '');
    } else if (path === '/archive') {
      html = renderArchive();
    } else if (path === '/about') {
      html = renderAbout();
    } else if (path === '/bookmarks') {
      html = renderBookmarksPage();
    } else if (path === '/write') {
      html = renderWritePage(params.edit || '');
    } else {
      // 404 页面 — 随机推荐文章
      const randomPosts = [...POSTS].sort(() => Math.random() - 0.5).slice(0, 3);
      html = `
        <div class="not-found-page fade-in">
          <div class="not-found-code">404</div>
          <h2 class="not-found-title">页面走丢了</h2>
          <p class="not-found-desc">你访问的页面不存在，也许它被博主删掉了。</p>
          <a href="#/" class="hero-cta-btn hero-cta-primary" style="margin-top:16px">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
            返回首页
          </a>
          ${randomPosts.length > 0 ? `
          <div class="not-found-recommend">
            <p class="not-found-recommend-title">或者看看这些文章？</p>
            <div class="related-posts-grid">
              ${randomPosts.map(p => `
                <div class="related-post-card" onclick="location.hash='#/post/${p.id}'">
                  <div class="related-post-card-title">${escapeHtml(p.title)}</div>
                  <div class="related-post-card-date">${formatDateShort(p.date)}</div>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}
        </div>
      `;
    }

    // 页面切换：列表页先显示骨架屏（消除白屏闪烁），其余淡出淡入
    const listPages = ['/', '/tags', '/archive', '/bookmarks'];
    const showContent = () => {
      app.innerHTML = html;
      app.classList.remove('fade-out');
      // 高亮当前导航项
      updateActiveNav(path);
      // 初始化 TOC scrollspy
      initTOCScrollspy();
      // 初始化代码块行号+折叠
      initCodeBlocks();
      // 文章详情页：阅读位置 / 搜索高亮 + 字号调节 + 锚点 + 渐显
      if (path.startsWith('/post/')) {
        const postId = path.split('/')[2];
        const q = params.q;
        if (q) {
          // 搜索跳转：高亮命中关键词并滚动到首个
          setTimeout(() => highlightInArticle(decodeURIComponent(q)), 220);
        } else {
          restoreReadPosition(postId);
        }
        initFontSizeAdjuster(postId);
        updateBookmarkBtn(postId);
        addHeadingAnchors();
        populateTocDrawer();
        // 图片 blur-up：已缓存图片立即清除模糊
        app.querySelectorAll('.markdown-body img.lazy-img').forEach(img => {
          if (img.complete) img.classList.add('loaded');
        });
        app.querySelectorAll('.post-detail-body > *, .related-posts, .post-detail-actions-bottom')
          .forEach((el) => el.classList.add('reveal-on-scroll'));
      }
      // 滚动渐显
      revealElements(app);
    };

    if (listPages.includes(path)) {
      app.classList.remove('fade-out');
      app.innerHTML = skeletonScreen(path);
      setTimeout(showContent, 160);
    } else {
      app.classList.add('fade-out');
      setTimeout(showContent, 150);
    }

    // 非文章页：恢复滚动位置（否则归零）
    if (!path.startsWith('/post/')) {
      const saved = parseInt(localStorage.getItem('moNotes_scroll_' + path) || '0', 10);
      if (saved > 0) {
        setTimeout(() => window.scrollTo(0, saved), 60);
      } else {
        window.scrollTo(0, 0);
      }
    }
  }

  /** 列表页骨架屏占位 */
  function skeletonScreen(path) {
    if (path === '/') {
      return `
        <div class="skeleton-home fade-in" aria-hidden="true">
          <div class="skeleton-hero">
            <div class="skeleton-avatar"></div>
            <div class="skeleton-line skeleton-title"></div>
            <div class="skeleton-line skeleton-sub"></div>
            <div class="skeleton-stats">
              <span class="skeleton-chip"></span><span class="skeleton-chip"></span><span class="skeleton-chip"></span>
            </div>
          </div>
          <div class="skeleton-grid">
            ${Array(6).fill().map(() => `
              <div class="skeleton-card">
                <div class="skeleton-line skeleton-card-title"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
                <div class="skeleton-line short"></div>
              </div>`).join('')}
          </div>
        </div>`;
    }
    // 其他列表页通用骨架
    return `
      <div class="skeleton-list fade-in" aria-hidden="true">
        ${Array(5).fill().map(() => `<div class="skeleton-row"></div>`).join('')}
      </div>`;
  }

  /** 转义正则特殊字符 */
  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** 在文章正文中高亮搜索关键词（不重复高亮） */
  function highlightInArticle(query) {
    const body = document.querySelector('.markdown-body');
    if (!body || !query) return;
    if (body.dataset.highlighted === query) return;
    body.dataset.highlighted = query;

    const regex = new RegExp('(' + escapeRegExp(query) + ')', 'gi');
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, null);
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) {
      const p = node.parentElement;
      if (!p) continue;
      if (['SCRIPT', 'STYLE', 'MARK', 'CODE'].includes(p.tagName)) continue;
      if (regex.test(node.nodeValue)) textNodes.push(node);
    }

    let first = null;
    textNodes.forEach((tn) => {
      const text = tn.nodeValue;
      const frag = document.createDocumentFragment();
      let lastIdx = 0, m;
      const re = new RegExp('(' + escapeRegExp(query) + ')', 'gi');
      while ((m = re.exec(text)) !== null) {
        if (m.index > lastIdx) frag.appendChild(document.createTextNode(text.slice(lastIdx, m.index)));
        const mark = document.createElement('mark');
        mark.className = 'search-hit';
        mark.textContent = m[0];
        frag.appendChild(mark);
        if (!first) first = mark;
        lastIdx = m.index + m[0].length;
      }
      if (lastIdx < text.length) frag.appendChild(document.createTextNode(text.slice(lastIdx)));
      tn.parentNode.replaceChild(frag, tn);
    });

    if (first) {
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast('已为你定位到搜索结果', '🔍');
    }
  }

  /** 更新导航栏高亮状态 */
  function updateActiveNav(path) {
    const links = document.querySelectorAll('.nav-links a');
    links.forEach(link => {
      const route = link.dataset.route;
      if (route === '/' && (path === '/' || path === '')) {
        link.classList.add('active');
      } else if (route && route !== '/' && path.startsWith(route)) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  /** 更新文档标题 */
  function updateDocTitle(title) {
    if (!title) {
      document.title = '墨记 — 技术与生活随笔';
      return;
    }
    document.title = `${title} | 墨记`;
  }

  // ========================================
  // 功能初始化
  // ========================================

  /** 初始化暗亮主题切换 */
  function initTheme() {
    const toggle = document.getElementById('themeToggle');
    // 优先读取 localStorage，然后检测系统偏好，最后默认暗色
    let savedTheme = localStorage.getItem('theme');
    if (!savedTheme) {
      savedTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.setAttribute('data-theme', savedTheme);
    // 初始化代码高亮主题，确保与当前主题一致（避免离线/首屏不同步）
    updateHighlightTheme(savedTheme);

    toggle.addEventListener('click', (e) => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      const applyTheme = () => {
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        updateHighlightTheme(next);
      };
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (document.startViewTransition && !reduceMotion) {
        const x = e.clientX || window.innerWidth / 2;
        const y = e.clientY || window.innerHeight / 2;
        document.documentElement.style.setProperty('--vt-x', x + 'px');
        document.documentElement.style.setProperty('--vt-y', y + 'px');
        document.startViewTransition(applyTheme);
      } else {
        applyTheme();
      }
    });
  }

  /** 更新代码高亮主题（双样式表切换 disabled，即时生效） */
  function updateHighlightTheme(theme) {
    const dark = document.getElementById('hljs-dark');
    const light = document.getElementById('hljs-light');
    if (dark) dark.disabled = (theme !== 'dark');
    if (light) light.disabled = (theme !== 'light');
  }

  /** 初始化全局搜索 (Ctrl+K) */
  function initSearch() {
    const overlay = document.getElementById('searchOverlay');
    const input = document.getElementById('searchInput');
    const results = document.getElementById('searchResults');

    let selectedIndex = -1;
    let lastFocusedElement = null;

    // 关闭搜索并恢复焦点
    function closeSearch() {
      overlay.classList.remove('active');
      if (lastFocusedElement) {
        lastFocusedElement.focus();
        lastFocusedElement = null;
      }
    }

    // Ctrl+K 打开搜索
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        lastFocusedElement = document.activeElement;
        overlay.classList.add('active');
        input.focus();
        input.value = '';
        results.innerHTML = '';
        selectedIndex = -1;
      }
      if (e.key === 'Escape' && overlay.classList.contains('active')) {
        closeSearch();
      }
    });

    // 点击遮罩关闭 + 搜索历史标签事件委托
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeSearch();
        return;
      }
      // 搜索历史标签点击
      const historyTag = e.target.closest('.search-history-tag');
      if (historyTag) {
        const query = decodeURIComponent(historyTag.dataset.query || '');
        if (query) {
          input.value = query;
          performSearch(query);
          selectedIndex = -1;
        }
      }
    });

    // 搜索输入
    let debounceTimer;
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        performSearch(input.value.trim());
        selectedIndex = -1;
      }, 200);
    });

    // 焦点陷阱：Tab键循环在弹窗内
    overlay.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const focusable = overlay.querySelectorAll('input, button, [tabindex]:not([tabindex="-1"]), .search-result-item, .search-history-tag');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    // 搜索结果键盘导航
    input.addEventListener('keydown', (e) => {
      const items = results.querySelectorAll('.search-result-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        updateSearchSelection(items, selectedIndex);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        updateSearchSelection(items, selectedIndex);
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        items[selectedIndex]?.click();
        closeSearch();
      }
    });
  }

  function updateSearchSelection(items, index) {
    items.forEach((item, i) => item.classList.toggle('active', i === index));
  }

  function performSearch(query) {
    const results = document.getElementById('searchResults');
    if (!query) {
      results.innerHTML = renderSearchHistory();
      return;
    }

    addSearchHistory(query);

    const lowerQuery = query.toLowerCase();
    const matched = getSortedPosts().filter(post => {
      return post.title.toLowerCase().includes(lowerQuery) ||
             post.excerpt.toLowerCase().includes(lowerQuery) ||
             post.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
             post.content.toLowerCase().includes(lowerQuery);
    });

    // 高亮关键词（转义正则特殊字符防止注入）
    function highlight(text, query) {
      if (!query) return escapeHtml(text);
      const escaped = escapeHtml(text);
      const safeQuery = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${safeQuery})`, 'gi');
      return escaped.replace(regex, '<mark class="search-highlight">$1</mark>');
    }

    // 标签结果（按名称匹配）
    const matchedTags = getAllTags().filter(t => t.name.toLowerCase().includes(lowerQuery));

    let html = '';

    if (matchedTags.length) {
      html += `<div class="search-group">
        <div class="search-group-title">标签 · ${matchedTags.length}</div>
        ${matchedTags.map(t => `
          <div class="search-result-item search-result-tag" tabindex="0" role="button" aria-label="标签：${escapeHtml(t.name)}" onclick="location.hash='#/tags?tag=${encodeURIComponent(t.name)}';document.getElementById('searchOverlay').classList.remove('active')">
            <div class="search-result-title">#${highlight(t.name, query)}</div>
            <div class="search-result-excerpt">${t.count} 篇文章</div>
          </div>
        `).join('')}
      </div>`;
    }

    if (matched.length) {
      html += `<div class="search-group">
        <div class="search-group-title">文章 · ${matched.length}</div>
        ${matched.map(post => `
          <div class="search-result-item" tabindex="0" role="button" aria-label="搜索结果：${escapeHtml(post.title)}" onclick="location.hash='#/post/${post.id}?q=${encodeURIComponent(query)}';document.getElementById('searchOverlay').classList.remove('active')">
            <div class="search-result-title">${highlight(post.title, query)}</div>
            <div class="search-result-excerpt">${highlight(post.excerpt, query)}</div>
          </div>
        `).join('')}
      </div>`;
    }

    if (!matchedTags.length && !matched.length) {
      results.innerHTML = '<div class="search-result-empty">未找到相关文章或标签</div>';
      return;
    }

    results.innerHTML = html;
  }

  /** 在新窗口中打开代码（Blob + 新标签页，弹窗被拦截则回退复制） */
  function openCodeInNewWindow(code) {
    const doc = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">' +
      '<title>代码查看 · 墨记</title><style>' +
      'html,body{margin:0;padding:0;background:#0d1117;color:#c9d1d9;}' +
      'body{padding:24px;font:14px/1.7 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre-wrap;word-break:break-word;}' +
      'pre{margin:0;}</style></head><body><pre>' + escapeHtml(code) + '</pre></body></html>';
    const blob = new Blob([doc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      navigator.clipboard.writeText(code).then(() => showToast('已复制代码（弹窗被拦截）', '📋')).catch(() => {});
    } else {
      showToast('已在新窗口打开代码', '↗️');
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  /** 代码复制 + 分享按钮（事件委托，挂在 #app 上） */
  function initCodeCopy() {
    const app = document.getElementById('app');

    // 代码「在新窗口查看」按钮 — 事件委托
    app.addEventListener('click', (e) => {
      const openBtn = e.target.closest('.code-open-btn');
      if (openBtn) {
        e.stopPropagation();
        const wrapper = openBtn.closest('.code-block-wrapper');
        const codeEl = wrapper ? wrapper.querySelector('code') : null;
        openCodeInNewWindow(codeEl ? codeEl.textContent : '');
        return;
      }

      const copyBtn = e.target.closest('.code-copy-btn');
      if (copyBtn) {
        e.stopPropagation();
        // 从按钮所在的 code-block-wrapper 中提取代码文本
        const wrapper = copyBtn.closest('.code-block-wrapper');
        const codeEl = wrapper ? wrapper.querySelector('code') : null;
        const code = codeEl ? codeEl.textContent : '';

        navigator.clipboard.writeText(code).then(() => {
          const originalSvg = copyBtn.innerHTML;
          copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
          copyBtn.style.color = '#34d399';
          showToast('代码已复制到剪贴板', '📋');
          setTimeout(() => {
            copyBtn.innerHTML = originalSvg;
            copyBtn.style.color = '';
          }, 2000);
        }).catch(() => {
          const textarea = document.createElement('textarea');
          textarea.value = code;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          showToast('代码已复制到剪贴板', '📋');
        });
        return;
      }

      // 分享按钮 — 事件委托（优先使用 Web Share API）
      const shareBtn = e.target.closest('.post-action-btn');
      if (shareBtn && !shareBtn.classList.contains('bookmark-btn')) {
        const url = window.location.href;
        const title = document.title;
        if (navigator.share) {
          navigator.share({ title, url }).catch(() => {});
        } else {
          navigator.clipboard.writeText(url).then(() => {
            showToast('链接已复制，快去分享吧！', '🔗');
          }).catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = url;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('链接已复制，快去分享吧！', '🔗');
          });
        }
      }
    });
  }

  /** TOC Scrollspy — 高亮当前可见标题 */
  let tocObserver = null;
  function initTOCScrollspy() {
    // 断开旧 Observer
    if (tocObserver) tocObserver.disconnect();

    const tocLinks = document.querySelectorAll('.toc-list a');
    if (tocLinks.length === 0) return;

    const headings = document.querySelectorAll('.markdown-body h1[id], .markdown-body h2[id], .markdown-body h3[id]');
    if (headings.length === 0) return;

    tocObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const id = entry.target.id;
        const tocLink = document.querySelector(`.toc-list a[href="#${id}"]`);
        if (tocLink) {
          if (entry.isIntersecting) {
            tocLinks.forEach(l => l.classList.remove('active'));
            tocLink.classList.add('active');
          }
        }
      });
    }, {
      rootMargin: '-80px 0px -60% 0px',
      threshold: 0.1
    });

    headings.forEach(h => tocObserver.observe(h));
  }

  /** TOC 目录点击：平滑滚动（拦截默认 hash 跳转，避免整页重渲染丢失阅读位置） */
  function initTOCNav() {
    // 委托挂 document：同时支持正文内联目录与移动端抽屉内的目录链接
    document.addEventListener('click', (e) => {
      const link = e.target.closest('.toc-list a');
      if (!link) return;
      e.preventDefault();
      const id = link.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // 高亮当前目录项
      document.querySelectorAll('.toc-list a').forEach(a => a.classList.remove('active'));
      link.classList.add('active');
      // 关闭移动端目录抽屉
      closeTocDrawer();
    });
  }

  /** 移动端目录抽屉：开 / 关 / 填充内容 */
  function openTocDrawer() {
    const drawer = document.getElementById('tocDrawer');
    const overlay = document.getElementById('tocDrawerOverlay');
    const fab = document.getElementById('tocFab');
    // 仅文章页含目录
    if (!document.querySelector('.post-detail .toc')) return;
    if (drawer) drawer.classList.add('open');
    if (overlay) overlay.classList.add('open');
    if (fab) fab.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeTocDrawer() {
    const drawer = document.getElementById('tocDrawer');
    const overlay = document.getElementById('tocDrawerOverlay');
    const fab = document.getElementById('tocFab');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    if (fab) fab.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  /** 把文章内联目录克隆进抽屉（每次渲染文章后调用） */
  function populateTocDrawer() {
    const drawerBody = document.getElementById('tocDrawerBody');
    const toc = document.querySelector('.post-detail .toc');
    if (drawerBody && toc) {
      drawerBody.innerHTML = toc.outerHTML;
    }
  }

  function initTocDrawer() {
    const fab = document.getElementById('tocFab');
    const overlay = document.getElementById('tocDrawerOverlay');
    const closeBtn = document.getElementById('tocDrawerClose');
    if (fab) fab.addEventListener('click', openTocDrawer);
    if (overlay) overlay.addEventListener('click', closeTocDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeTocDrawer);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeTocDrawer();
    });
  }

  /** 合并滚动事件：进度条 + 导航栏 + 回到顶部 + 阅读位置（rAF 节流） */
  function initScrollHandlers() {
    const bar = document.getElementById('readingProgress');
    const navbar = document.getElementById('navbar');
    const backToTop = document.getElementById('backToTop');
    let ticking = false;
    let saveTimer = null;

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;

        // 进度条
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        bar.style.width = Math.min(progress, 100) + '%';

        // 进度环返回顶部
        const btt = document.getElementById('bttProgress');
        if (btt) {
          btt.style.strokeDashoffset = String(125.66 * (1 - Math.min(progress, 100) / 100));
        }

        // 导航栏滚动效果
        navbar.classList.toggle('scrolled', scrollTop > 20);

        // 回到顶部按钮
        backToTop.classList.toggle('visible', scrollTop > 400);

        // 滚动位置记忆（防抖保存，所有页面）
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
          const route = parseRoute();
          if (route.path.startsWith('/post/')) {
            const postId = route.path.split('/')[2];
            localStorage.setItem('moNotes_readpos_' + postId, String(scrollTop));
          } else {
            localStorage.setItem('moNotes_scroll_' + route.path, String(scrollTop));
          }
        }, 500);

        ticking = false;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /** 恢复阅读位置 */
  function restoreReadPosition(postId) {
    const key = 'moNotes_readpos_' + postId;
    const saved = localStorage.getItem(key);
    if (saved) {
      const pos = parseInt(saved, 10);
      if (pos > 100) {
        setTimeout(() => window.scrollTo(0, pos), 200);
        showToast('已恢复到上次阅读位置', '📖');
      }
    }
  }

  /** 阅读历史（已读标记） */
  const READ_HISTORY_KEY = 'moNotes_read_history';

  function getReadHistory() {
    try { return JSON.parse(localStorage.getItem(READ_HISTORY_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function isRead(id) { return getReadHistory().includes(id); }

  function markAsRead(id) {
    const history = getReadHistory();
    if (!history.includes(id)) {
      history.push(id);
      localStorage.setItem(READ_HISTORY_KEY, JSON.stringify(history));
    }
  }

  /** 收藏管理 */
  const BOOKMARKS_KEY = 'moNotes_bookmarks';

  function getBookmarks() {
    try {
      return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]');
    } catch (e) { return []; }
  }

  function isBookmarked(id) {
    return getBookmarks().includes(id);
  }

  function updateBookmarkBtn(id) {
    const btn = document.getElementById('bookmarkBtn');
    const text = document.getElementById('bookmarkText');
    if (!btn || !text) return;
    if (isBookmarked(id)) {
      btn.classList.add('bookmarked');
      text.textContent = '已收藏';
    } else {
      btn.classList.remove('bookmarked');
      text.textContent = '收藏';
    }
  }

  window.toggleBookmark = function (id) {
    const bookmarks = getBookmarks();
    const idx = bookmarks.indexOf(id);
    if (idx >= 0) {
      bookmarks.splice(idx, 1);
      showToast('已取消收藏', '📌');
    } else {
      bookmarks.push(id);
      showToast('已加入收藏', '⭐');
    }
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
    updateBookmarkBtn(id);
  };

  /** 键盘快捷键 */
  function initKeyboardShortcuts() {
    let gPressed = false;
    let gTimer = null;

    document.addEventListener('keydown', (e) => {
      // 忽略输入框中的按键
      const tag = e.target.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable;

      // / 聚焦搜索（非输入框时）
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        const overlay = document.getElementById('searchOverlay');
        const input = document.getElementById('searchInput');
        overlay.classList.add('active');
        input.focus();
        return;
      }

      // g 键组合快捷键
      if (e.key === 'g' && !isInput) {
        if (gPressed) return;
        gPressed = true;
        clearTimeout(gTimer);
        gTimer = setTimeout(() => { gPressed = false; }, 1000);
        return;
      }

      if (gPressed && !isInput) {
        switch (e.key) {
          case 'h': location.hash = '#/'; break;
          case 't': location.hash = '#/tags'; break;
          case 'a': location.hash = '#/archive'; break;
          case 'w': location.hash = '#/write'; break;
          case 'b': location.hash = '#/bookmarks'; break;
        }
        gPressed = false;
        clearTimeout(gTimer);
      }
    });
  }

  /** 键盘导航：Enter/Space 触发 [role="button"] 元素的 click */
  function initKeyboardNav() {
    document.getElementById('app').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const target = e.target.closest('[role="button"]');
        if (target) {
          e.preventDefault();
          target.click();
        }
      }
    });
  }

  /** 搜索历史 */
  const SEARCH_HISTORY_KEY = 'moNotes_search_history';

  function getSearchHistory() {
    try {
      return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
    } catch (e) { return []; }
  }

  function addSearchHistory(query) {
    if (!query) return;
    let history = getSearchHistory();
    history = history.filter(q => q !== query);
    history.unshift(query);
    history = history.slice(0, 8);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
  }

  function renderSearchHistory() {
    const history = getSearchHistory();
    if (history.length === 0) return '';
    return `
      <div class="search-history">
        <div class="search-history-title">最近搜索</div>
        <div class="search-history-tags">
          ${history.map(q => `<span class="search-history-tag" data-query="${encodeURIComponent(q)}">${escapeHtml(q)}</span>`).join('')}
        </div>
      </div>
    `;
  }

  /** 图片灯箱 */
  function initLightbox() {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const closeBtn = document.getElementById('lightboxClose');
    const zoomInBtn = document.getElementById('lightboxZoomIn');
    const zoomOutBtn = document.getElementById('lightboxZoomOut');
    const zoomResetBtn = document.getElementById('lightboxZoomReset');
    const zoomLevelEl = document.getElementById('lightboxZoomLevel');
    const prevBtn = document.getElementById('lightboxPrev');
    const nextBtn = document.getElementById('lightboxNext');
    const counterEl = document.getElementById('lightboxCounter');

    let zoomLevel = 1;
    let panX = 0, panY = 0;
    let isDragging = false, dragStartX = 0, dragStartY = 0;
    let gallery = [];
    let galleryIndex = 0;

    function applyZoom() {
      lightboxImg.style.transform = `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`;
      lightboxImg.style.cursor = zoomLevel > 1 ? 'grab' : 'default';
      if (zoomLevelEl) zoomLevelEl.textContent = Math.round(zoomLevel * 100) + '%';
    }

    function resetZoom() {
      zoomLevel = 1;
      panX = 0;
      panY = 0;
      applyZoom();
    }

    function showGalleryImage() {
      const img = gallery[galleryIndex];
      if (!img) return;
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt || '';
      resetZoom();
      const multi = gallery.length > 1;
      if (prevBtn) prevBtn.style.display = multi ? '' : 'none';
      if (nextBtn) nextBtn.style.display = multi ? '' : 'none';
      if (counterEl) counterEl.style.display = multi ? '' : 'none';
      if (counterEl) counterEl.textContent = `${galleryIndex + 1} / ${gallery.length}`;
    }

    function openLightboxAt(images, index) {
      gallery = images;
      galleryIndex = index;
      showGalleryImage();
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function stepGallery(dir) {
      if (gallery.length <= 1) return;
      galleryIndex = (galleryIndex + dir + gallery.length) % gallery.length;
      showGalleryImage();
    }

    // 事件委托：点击 .markdown-body 中的图片
    document.getElementById('app').addEventListener('click', (e) => {
      if (e.target.tagName === 'IMG' && e.target.closest('.markdown-body')) {
        e.preventDefault();
        const md = e.target.closest('.markdown-body');
        const imgs = Array.from(md.querySelectorAll('img'));
        const idx = imgs.indexOf(e.target);
        openLightboxAt(imgs, idx >= 0 ? idx : 0);
      }
    });

    function closeLightbox() {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
      resetZoom();
    }

    closeBtn.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); stepGallery(-1); });
    if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); stepGallery(1); });

    // 缩放按钮
    if (zoomInBtn) zoomInBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      zoomLevel = Math.min(5, zoomLevel + 0.25);
      applyZoom();
    });
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      zoomLevel = Math.max(0.5, zoomLevel - 0.25);
      applyZoom();
    });
    if (zoomResetBtn) zoomResetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetZoom();
    });

    // 鼠标滚轮缩放
    lightboxImg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      zoomLevel = Math.max(0.5, Math.min(5, zoomLevel + delta));
      applyZoom();
    });

    // 拖拽平移
    lightboxImg.addEventListener('mousedown', (e) => {
      if (zoomLevel <= 1) return;
      e.preventDefault();
      isDragging = true;
      dragStartX = e.clientX - panX * zoomLevel;
      dragStartY = e.clientY - panY * zoomLevel;
      lightboxImg.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      panX = (e.clientX - dragStartX) / zoomLevel;
      panY = (e.clientY - dragStartY) / zoomLevel;
      applyZoom();
    });
    document.addEventListener('mouseup', () => {
      isDragging = false;
      lightboxImg.style.cursor = zoomLevel > 1 ? 'grab' : 'default';
    });

    // 键盘：ESC 关闭，左右切换
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('active')) return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') stepGallery(-1);
      else if (e.key === 'ArrowRight') stepGallery(1);
    });
  }

  /** 字体大小调节 */
  function initFontSizeAdjuster(postId) {
    const body = document.querySelector('.post-detail-body');
    if (!body) return;

    const key = 'moNotes_fontsize';
    let size = parseInt(localStorage.getItem(key) || '16', 10);
    body.style.fontSize = size + 'px';

    // 添加字号调节按钮
    const meta = document.querySelector('.post-detail-meta');
    if (meta) {
      const adjuster = document.createElement('div');
      adjuster.className = 'font-size-adjuster';
      adjuster.innerHTML = `
        <button class="font-size-btn" onclick="adjustFontSize(-1)" aria-label="缩小字体" title="缩小字体">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
        </button>
        <span class="font-size-label" id="fontSizeLabel">${size}px</span>
        <button class="font-size-btn" onclick="adjustFontSize(1)" aria-label="放大字体" title="放大字体">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="8" y1="11" x2="14" y2="11"/><line x1="11" y1="8" x2="11" y2="14"/></svg>
        </button>
      `;
      meta.appendChild(adjuster);
    }

    window.adjustFontSize = function (delta) {
      const b = document.querySelector('.post-detail-body');
      if (!b) return;
      let current = parseInt(b.style.fontSize || '16', 10);
      current = Math.max(12, Math.min(22, current + delta));
      b.style.fontSize = current + 'px';
      localStorage.setItem(key, String(current));
      const label = document.getElementById('fontSizeLabel');
      if (label) label.textContent = current + 'px';
    };
  }

  /** 代码块行号 + 折叠 */
  function initCodeBlocks() {
    const codeBlocks = document.querySelectorAll('.code-block-wrapper pre code');
    codeBlocks.forEach(code => {
      const wrapper = code.closest('.code-block-wrapper');
      if (!wrapper || wrapper.dataset.processed) return;
      wrapper.dataset.processed = 'true';

      const lines = code.textContent.split('\n');
      if (lines.length > 20) {
        // 添加折叠按钮
        const header = wrapper.querySelector('.code-block-header');
        if (header) {
          const collapseBtn = document.createElement('button');
          collapseBtn.className = 'code-collapse-btn';
          collapseBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';
          collapseBtn.title = '展开/折叠';
          const pre = wrapper.querySelector('pre');
          let collapsed = false;
          collapseBtn.addEventListener('click', () => {
            collapsed = !collapsed;
            pre.style.maxHeight = collapsed ? '120px' : 'none';
            pre.style.overflow = collapsed ? 'hidden' : 'auto';
            collapseBtn.style.transform = collapsed ? 'rotate(-90deg)' : 'rotate(0)';
          });
          header.appendChild(collapseBtn);
        }
      }

      // 添加行号
      const pre = wrapper.querySelector('pre');
      if (pre && !pre.querySelector('.line-numbers')) {
        const codeText = code.textContent;
        const lineCount = codeText.split('\n').length;
        const lineNumbers = document.createElement('div');
        lineNumbers.className = 'line-numbers';
        lineNumbers.innerHTML = Array.from({ length: lineCount }, (_, i) =>
          `<span>${i + 1}</span>`
        ).join('');
        pre.style.position = 'relative';
        pre.style.paddingLeft = '3.5em';
        lineNumbers.style.position = 'absolute';
        lineNumbers.style.left = '0';
        lineNumbers.style.top = '0';
        lineNumbers.style.padding = '16px 0';
        lineNumbers.style.textAlign = 'right';
        lineNumbers.style.width = '2.5em';
        lineNumbers.style.userSelect = 'none';
        lineNumbers.style.color = 'var(--text-muted)';
        lineNumbers.style.fontSize = '0.875rem';
        lineNumbers.style.lineHeight = '1.6';
        lineNumbers.style.fontFamily = 'var(--font-mono)';
        lineNumbers.style.opacity = '0.5';
        pre.appendChild(lineNumbers);
      }
    });
  }

  /** 移动端菜单 */
  function initMobileMenu() {
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');

    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      links.classList.toggle('open');
    });

    links.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        toggle.classList.remove('open');
        links.classList.remove('open');
      });
    });
  }

  // ========================================
  // 初始化
  // ========================================

  // ========================================
  // 阅读体验增强：聚光灯 / 滚动渐显 / 标题锚点 / 磁吸
  // ========================================
  /** 卡片聚光灯：光标跟随光晕 */
  function initSpotlight() {
    const app = document.getElementById('app');
    app.addEventListener('mousemove', (e) => {
      const card = e.target.closest('.post-card');
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
      card.style.setProperty('--my', (e.clientY - rect.top) + 'px');
    });
  }

  /** 滚动渐显观察器 */
  let revealObserver = null;
  function initRevealObserver() {
    if (!('IntersectionObserver' in window)) return;
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  }
  function revealElements(root) {
    const els = root.querySelectorAll('.reveal-on-scroll');
    if (!revealObserver) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    els.forEach((el) => revealObserver.observe(el));
  }

  /** 文章标题锚点链接（悬停出现，点击复制 + 滚动定位） */
  function addHeadingAnchors() {
    const app = document.getElementById('app');
    const headings = app.querySelectorAll('.post-detail-body h2, .post-detail-body h3');
    headings.forEach((h) => {
      if (!h.id || h.querySelector('.heading-anchor')) return;
      const a = document.createElement('a');
      a.className = 'heading-anchor';
      a.href = '#' + h.id;
      a.setAttribute('aria-label', '复制本节链接');
      a.textContent = '#';
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        if (navigator.clipboard) {
          navigator.clipboard.writeText(location.href)
            .then(() => showToast('已复制文章链接', '🔗'))
            .catch(() => {});
        }
        h.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      h.appendChild(a);
    });
  }

  /** Hero 按钮磁吸效果 */
  function initMagnetic() {
    const app = document.getElementById('app');
    const strength = 0.25;
    let active = null;
    app.addEventListener('mousemove', (e) => {
      const btn = e.target.closest('.hero-cta-btn');
      if (btn !== active) {
        if (active) active.style.transform = '';
        active = btn;
      }
      if (btn) {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      }
    });
    app.addEventListener('mouseleave', () => {
      if (active) { active.style.transform = ''; active = null; }
    });
  }

  /** 订阅/通讯卡片（首页 & 关于页复用） */
  function subscribeCard() {
    return `
      <section class="subscribe-card reveal-on-scroll">
        <div class="subscribe-glow" aria-hidden="true"></div>
        <div class="subscribe-icon">✉️</div>
        <h3 class="subscribe-title">订阅博客更新</h3>
        <p class="subscribe-desc">有新的文章发布时，第一时间收到通知。我们绝不发送垃圾邮件。</p>
        <form class="subscribe-form" onsubmit="return false">
          <input type="email" class="subscribe-input" placeholder="你的邮箱地址" aria-label="邮箱地址" autocomplete="email">
          <button type="button" class="subscribe-btn">订阅</button>
        </form>
        <p class="subscribe-hint" aria-live="polite"></p>
        <button type="button" class="subscribe-rss" onclick="copySubscribeLink()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none"/>
            <path d="M12 3a9 9 0 019 9h-2.2a6.8 6.8 0 00-6.8-6.8V3z"/>
          </svg>
          复制订阅链接
        </button>
      </section>
    `;
  }

  /** 订阅逻辑（事件委托，挂在 #app 上） */
  function initSubscribe() {
    const app = document.getElementById('app');
    app.addEventListener('click', (e) => {
      const btn = e.target.closest('.subscribe-btn');
      if (!btn) return;
      const card = btn.closest('.subscribe-card');
      const input = card.querySelector('.subscribe-input');
      const hint = card.querySelector('.subscribe-hint');
      const email = (input.value || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        hint.textContent = '请输入有效的邮箱地址';
        hint.className = 'subscribe-hint error';
        input.focus();
        return;
      }
      const key = 'moNotes_subscribers';
      const subs = JSON.parse(localStorage.getItem(key) || '[]');
      if (!subs.includes(email)) subs.push(email);
      localStorage.setItem(key, JSON.stringify(subs));
      hint.textContent = '✅ 订阅成功！我们会通过邮件通知你。';
      hint.className = 'subscribe-hint success';
      input.value = '';
      showToast('订阅成功 🎉', '✉️');
    });
    app.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.classList.contains('subscribe-input')) {
        e.preventDefault();
        const card = e.target.closest('.subscribe-card');
        card.querySelector('.subscribe-btn').click();
      }
    });
  }

  /** 复制订阅链接（纯前端，复制站点地址作为订阅源入口） */
  window.copySubscribeLink = function () {
    const url = location.origin + location.pathname;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        showToast('订阅链接已复制 📡', '📡');
      }).catch(() => fallbackCopy(url));
    } else {
      fallbackCopy(url);
    }
  };

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast('订阅链接已复制 📡', '📡'); } catch (e) {}
    document.body.removeChild(ta);
  }

  function init() {
    configureMarked();
    refreshPostsFromStorage();
    initTheme();
    initScrollHandlers();
    initMobileMenu();
    initSearch();
    initLightbox();
    initCodeCopy();
    initKeyboardShortcuts();
    initKeyboardNav();
    initRevealObserver();
    initSpotlight();
    initMagnetic();
    initTOCNav();
    initTocDrawer();
    initSubscribe();

    // 动态设置页脚年份
    const yearEl = document.getElementById('footerYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // 监听 hash 变化
    window.addEventListener('hashchange', render);

    // 首次渲染
    if (!location.hash) {
      location.hash = '#/';
    } else {
      render();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
