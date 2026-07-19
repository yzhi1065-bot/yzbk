/**
 * 博客文章数据
 * 所有文章以 Markdown 格式存储
 */
const POSTS = [
  {
    id: 'hello-world',
    title: '你好，世界 — 博客的第一篇文章',
    date: '2026-07-10',
    tags: ['随笔', '日记'],
    excerpt: '每个程序员的起点似乎都是一句 Hello World。这是我的博客第一篇文章，聊聊我为什么决定开始写博客，以及这个博客是怎么搭建起来的。',
    content: `# 你好，世界

每个程序员的起点似乎都是一句 \`Hello World\`。这仿佛是一种仪式，一种宣告：**我来了**。

## 为什么开始写博客

写作是一种思考的方式。很多时候，你以为自己理解了一个概念，但当你试图把它写下来解释给别人看的时候，才会发现那些模糊的角落。

> 写作不是把思考写下来，写作本身就是思考。

开这个博客，我主要有三个目的：

1. **记录学习成果** — 把学到的东西整理成文章，既是笔记也是输出
2. **锻炼表达能力** — 把复杂的技术讲清楚，是一种很值钱的能力
3. **认识更多朋友** — 写下的东西可能会被志同道合的人看到

## 这个博客的技术栈

这个博客没有用复杂的框架，而是用最朴素的方案：

- **HTML/CSS/JavaScript** — 纯原生，没有构建步骤
- **Markdown 渲染** — 使用 [marked.js](https://marked.js.org/) 
- **代码高亮** — 使用 [highlight.js](https://highlightjs.org/)
- **路由** — 基于 hash 的前端路由

我觉得技术博客应该 **轻量、快速、专注内容**。不需要华丽的动画，不需要复杂的交互，能好好读文章就够了。

## 代码示例

作为一个程序员博客，怎么能没有代码呢？来看看经典的 Hello World：

\`\`\`javascript
// JavaScript 版本
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));
// 输出: Hello, World!
\`\`\`

\`\`\`python
# Python 版本
def greet(name: str) -> str:
    return f"Hello, {name}!"

print(greet("World"))
# 输出: Hello, World!
\`\`\`

\`\`\`rust
// Rust 版本
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

fn main() {
    println!("{}", greet("World"));
    // 输出: Hello, World!
}
\`\`\`

## 接下来的计划

我会在这个博客上写一些关于这些主题的文章：

| 主题 | 说明 |
|------|------|
| 前端开发 | React, Vue, CSS, 性能优化 |
| 后端技术 | Node.js, Python, 数据库 |
| 工程实践 | 架构设计, DevOps, 效率工具 |
| 生活随笔 | 读书笔记, 思考感悟 |

---

那么，就从一个 *Hello World* 开始吧。世界你好，我来了。`
  },
  {
    id: 'understanding-closure',
    title: '深入理解 JavaScript 闭包',
    date: '2026-07-08',
    tags: ['JavaScript', '前端', '编程'],
    excerpt: '闭包是 JavaScript 中最迷人也最容易让人困惑的概念之一。本文从作用域链出发，一步步带你理解闭包的本质、应用场景和常见陷阱。',
    content: `# 深入理解 JavaScript 闭包

闭包（Closure）是 JavaScript 中最迷人也最容易让人困惑的概念之一。很多开发者会用闭包，但说不清它到底是什么。今天我们来彻底搞懂它。

## 什么是闭包

一句话定义：

> 闭包是一个函数以及其捆绑的周边环境状态（词法环境）的引用的组合。

简单来说，当一个内部函数引用了外部函数的变量时，即使外部函数已经执行完毕，这些变量依然不会被回收。这个内部函数就是一个闭包。

\`\`\`javascript
function createCounter() {
  let count = 0;  // 外部函数的变量

  return function() {  // 内部函数（闭包）
    count++;
    return count;
  };
}

const counter = createCounter();
console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3
\`\`\`

在这个例子中，\`count\` 变量本应在 \`createCounter\` 执行完毕后被销毁。但因为返回的内部函数引用了它，所以 \`count\` 被保留了下来。这就是闭包的力量。

## 为什么要理解作用域链

闭包的本质是 **词法作用域** 和 **函数作为值传递** 的结合。

\`\`\`javascript
// 词法作用域：函数的作用域在定义时就确定了
const globalVar = 'I am global';

function outer() {
  const outerVar = 'I am outer';

  function inner() {
    console.log(globalVar);  // ✅ 可以访问全局变量
    console.log(outerVar);   // ✅ 可以访问外层函数变量
  }

  return inner;
}

const fn = outer();
fn(); // 即使 outer() 已执行完，inner 依然能访问 outerVar
\`\`\`

JavaScript 引擎在查找变量时，会沿着 **作用域链** 从内到外查找。闭包就是这条链没有被断开的结果。

## 闭包的经典应用

### 1. 数据私有化

JavaScript 没有真正的私有属性，但闭包可以模拟：

\`\`\`javascript
function createBankAccount(initialBalance) {
  let balance = initialBalance;  // 私有变量

  return {
    deposit(amount) {
      balance += amount;
      return balance;
    },
    withdraw(amount) {
      if (amount > balance) {
        throw new Error('余额不足');
      }
      balance -= amount;
      return balance;
    },
    getBalance() {
      return balance;
    }
  };
}

const account = createBankAccount(100);
account.deposit(50);   // 返回 150
account.withdraw(30);  // 返回 120
console.log(account.balance); // undefined — 无法直接访问
\`\`\`

### 2. 函数柯里化

\`\`\`javascript
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return function(...args2) {
      return curried.apply(this, [...args, ...args2]);
    };
  };
}

const sum = (a, b, c) => a + b + c;
const curriedSum = curry(sum);

console.log(curriedSum(1)(2)(3));    // 6
console.log(curriedSum(1, 2)(3));    // 6
console.log(curriedSum(1)(2, 3));    // 6
\`\`\`

### 3. 节流与防抖

\`\`\`javascript
// 防抖：连续触发只执行最后一次
function debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

// 节流：固定时间间隔只执行一次
function throttle(fn, interval) {
  let lastTime = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      fn.apply(this, args);
      lastTime = now;
    }
  };
}
\`\`\`

## 闭包的陷阱

### 1. 经典的 for 循环问题

\`\`\`javascript
// ❌ 经典错误
for (var i = 1; i <= 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// 输出: 4, 4, 4 （不是 1, 2, 3）

// ✅ 修复方法1：使用 let
for (let i = 1; i <= 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// 输出: 1, 2, 3

// ✅ 修复方法2：使用闭包
for (var i = 1; i <= 3; i++) {
  ((j) => {
    setTimeout(() => console.log(j), 100);
  })(i);
}
// 输出: 1, 2, 3
\`\`\`

### 2. 内存泄漏

如果闭包引用了大对象且长期存在，可能导致内存无法回收：

\`\`\`javascript
// ⚠️ 潜在的内存问题
function createHandler() {
  const hugeData = new Array(1000000).fill('data');
  return function() {
    console.log('按钮被点击');
    // hugeData 被闭包引用，不会被回收
    // 即使这里没用到它
  };
}

// ✅ 如果不需要，及时释放
function createHandlerFixed() {
  return function() {
    console.log('按钮被点击');
  };
}
\`\`\`

## 总结

| 要点 | 说明 |
|------|------|
| 本质 | 函数 + 其引用的外部变量 |
| 原理 | 词法作用域 + 作用域链 |
| 应用 | 数据私有化、柯里化、节流防抖 |
| 注意 | 循环陷阱、内存泄漏 |

闭包不是什么高深的魔法，它只是 JavaScript 作用域规则的必然结果。理解了作用域链，闭包就自然而然地理解了。

希望这篇文章能帮你彻底搞懂闭包。如果有疑问，欢迎留言讨论。`
  },
  {
    id: 'css-grid-flexbox',
    title: 'CSS Grid 与 Flexbox 实战指南',
    date: '2026-07-05',
    tags: ['CSS', '前端', '布局'],
    excerpt: 'Grid 和 Flexbox 是现代 CSS 布局的两大基石。它们各有擅长领域，配合使用能解决几乎所有布局问题。本文通过实战案例讲解两者的核心概念。',
    content: `# CSS Grid 与 Flexbox 实战指南

在现代前端开发中，**CSS Grid** 和 **Flexbox** 是两大布局利器。它们不是替代关系，而是互补关系。搞清楚什么时候该用哪个，是每个前端开发者的必修课。

## 一句话区分

> **Flexbox 是一维的，Grid 是二维的。**

- Flexbox 适合在 **一个方向** 上排列元素（行或列）
- Grid 适合在 **行和列两个方向** 上同时布局

## Flexbox 核心

### 容器属性

\`\`\`css
.container {
  display: flex;
  flex-direction: row;       /* row | column | row-reverse | column-reverse */
  justify-content: center;   /* 主轴对齐 */
  align-items: center;       /* 交叉轴对齐 */
  flex-wrap: wrap;           /* 是否换行 */
  gap: 16px;                 /* 间距 */
}
\`\`\`

### 子项属性

\`\`\`css
.item {
  flex-grow: 1;    /* 放大比例 */
  flex-shrink: 0;   /* 缩小比例 */
  flex-basis: 200px; /* 基准大小 */
  /* 简写: flex: 1 0 200px; */
}
\`\`\`

### 经典布局：导航栏

\`\`\`css
.navbar {
  display: flex;
  justify-content: space-between; /* 两端对齐 */
  align-items: center;             /* 垂直居中 */
  padding: 0 24px;
  height: 60px;
}

.nav-links {
  display: flex;
  gap: 16px;
}
\`\`\`

### 经典布局：完美居中

\`\`\`css
.center {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}
\`\`\`

## Grid 核心

### 容器属性

\`\`\`css
.grid-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);  /* 三等分列 */
  grid-template-columns: 200px 1fr 200px; /* 侧边栏布局 */
  grid-template-rows: auto 1fr auto;      /* 行模板 */
  gap: 20px;
}
\`\`\`

### 常用单位

| 单位 | 说明 |
|------|------|
| \`1fr\` | 按比例分配剩余空间 |
| \`auto\` | 根据内容自动 |
| \`minmax(200px, 1fr)\` | 最小200px，最大1fr |
| \`repeat(3, 1fr)\` | 重复3次 |
| \`repeat(auto-fill, minmax(200px, 1fr))\` | 自动填充 |

### 经典布局：圣杯布局

\`\`\`css
.holy-grail {
  display: grid;
  grid-template-areas:
    "header header header"
    "nav    main   aside"
    "footer footer footer";
  grid-template-columns: 200px 1fr 200px;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
}

.holy-grail > header { grid-area: header; }
.holy-grail > nav    { grid-area: nav; }
.holy-grail > main   { grid-area: main; }
.holy-grail > aside  { grid-area: aside; }
.holy-grail > footer { grid-area: footer; }
\`\`\`

### 经典布局：响应式卡片网格

\`\`\`css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}
\`\`\

> \`repeat(auto-fill, minmax(280px, 1fr))\` 是最实用的响应式 Grid 技巧。它会自动根据容器宽度决定每行放几个卡片，每个卡片最小 280px，自动适配。

## 什么时候用 Flexbox，什么时候用 Grid

| 场景 | 推荐 |
|------|------|
| 导航栏 | Flexbox |
| 按钮组 | Flexbox |
| 表单项对齐 | Flexbox |
| 卡片网格 | Grid |
| 整体页面布局 | Grid |
| 表单整体布局 | Grid |
| 文字内容居中 | Flexbox |
| 复杂的二维布局 | Grid |

**经验法则：** 如果你想在两个方向上同时控制位置，用 Grid；如果只需要在一个方向上排列，用 Flexbox。

## 实战：博客首页布局

\`\`\`css
.blog-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr); /* 移动端 */
  gap: 24px;
}

/* 桌面端：左侧主内容 + 右侧边栏 */
@media (min-width: 768px) {
  .blog-layout {
    grid-template-columns: minmax(0, 1fr) 300px;
  }
}

.post-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
\`\`\`

## 浏览器兼容性

好消息是，Flexbox 和 Grid 的浏览器支持已经非常好：

- **Flexbox**: 全球支持率 **99.3%**
- **Grid**: 全球支持率 **98.2%**

完全可以放心使用，不需要为旧浏览器提供降级方案。

## 总结

1. **Flexbox** — 一维布局，适合组件级别的内容排列
2. **Grid** — 二维布局，适合整体页面结构
3. **配合使用** — Grid 做整体框架，Flexbox 做组件内部
4. **\`gap\`** 属性在两者中都适用，比 margin 更优雅

现代 CSS 布局其实很简单。抛弃 float，拥抱 Flexbox 和 Grid，你会发现布局从未如此轻松。`
  },
  {
    id: 'git-workflow',
    title: 'Git 工作流最佳实践',
    date: '2026-06-28',
    tags: ['Git', '工程实践', '编程'],
    excerpt: 'Git 是程序员的必备工具，但很多人只会 add、commit、push。本文介绍日常开发中常用的 Git 技巧，包括分支策略、交互式变基、冲突解决等。',
    content: `# Git 工作流最佳实践

Git 是每个程序员的必备工具。但很多人对 Git 的使用停留在 \`add → commit → push\` 的水平。今天分享一些日常工作流中的实用技巧。

## 分支策略

### 命名规范

好的分支名应该能自解释：

\`\`\`bash
# 特性分支
feature/add-user-auth

# 修复分支
fix/login-redirect-bug

# 热修复
hotfix/security-patch

# 发布分支
release/v2.1.0
\`\`\`

### 常用分支操作

\`\`\`bash
# 基于远程最新代码创建分支
git checkout -b feature/new-api origin/main

# 快速切换回上一个分支
git checkout -

# 重命名当前分支
git branch -m new-name

# 删除已合并的本地分支
git branch --merged | grep -v '\\*\\|main\\|master' | xargs -n 1 git branch -d

# 清理已删除的远程分支引用
git fetch --prune
\`\`\`

## 提交规范

### Conventional Commits

推荐使用 [约定式提交](https://www.conventionalcommits.org/) 规范：

\`\`\`bash
# 格式: <type>(<scope>): <description>
git commit -m "feat(auth): 添加用户登录功能"
git commit -m "fix(api): 修复分页参数丢失问题"
git commit -m "docs(readme): 更新部署说明"
git commit -m "refactor(utils): 简化日期格式化函数"
git commit -m "chore(deps): 升级 React 到 18.3"
\`\`\

常用 type：

| type | 说明 |
|------|------|
| \`feat\` | 新功能 |
| \`fix\` | 修复 bug |
| \`docs\` | 文档变更 |
| \`style\` | 代码格式（不影响功能） |
| \`refactor\` | 重构 |
| \`perf\` | 性能优化 |
| \`test\` | 测试相关 |
| \`chore\` | 构建/工具变更 |

### 交互式暂存

\`\`\`bash
# 交互式选择要暂存的代码块
git add -p

# 它会逐块展示你的改动，让你选择:
# y - 暂存这个块
# n - 不暂存
# s - 拆分成更小的块
# e - 手动编辑
# q - 退出
\`\`\`

## 变基 vs 合并

这是 Git 中最容易引起争论的话题。我的建议是：

- **个人分支** → 用 rebase 保持历史线性
- **公共分支** → 用 merge 保留完整历史

\`\`\`bash
# 在 feature 分支上，拉取 main 的最新代码
git checkout feature/my-feature
git rebase main

# 如果有冲突，解决后继续
git add .
git rebase --continue

# 想取消 rebase
git rebase --abort
\`\`\

### 交互式变基

整理提交历史的最强工具：

\`\`\`bash
# 修改最近 5 个提交
git rebase -i HEAD~5

# 在编辑器中你会看到:
# pick   a1b2c3d 添加用户模型
# pick   e4f5g6h 添加用户 API
# pick   i7j8k9l 修复 lint 错误
# pick   m0n1o2p 添加用户测试
# pick   q3r4s5t 更新文档

# 可以把命令改为:
# pick   a1b2c3d 添加用户模型
# squash e4f5g6h 添加用户 API      → 合并到上一个
# squash i7j8k9l 修复 lint 错误     → 合并到上一个
# reword m0n1o2p 添加用户测试       → 修改提交信息
# drop   q3r4s5t 更新文档           → 丢弃
\`\`\`

## 撤销操作

\`\`\`bash
# 撤销工作区的修改（还没 add）
git checkout -- file.txt
git restore file.txt    # 新命令，效果相同

# 撤销暂存（已经 add，还没 commit）
git reset HEAD file.txt
git restore --staged file.txt  # 新命令

# 撤销最近的提交（保留改动）
git reset --soft HEAD~1

# 撤销最近的提交（丢弃改动）
git reset --hard HEAD~1

# 更安全的撤销方式（生成一个反向提交）
git revert <commit-hash>
\`\`\`

### 找回误删的提交

\`\`\`bash
# 查看所有操作记录（包括已删除的提交）
git reflog

# 找到误删提交的 hash，恢复它
git checkout <hash>
git branch recover-branch
\`\`\`

## stash 暂存

\`\`\`bash
# 暂存当前改动
git stash
git stash save "wip: 用户登录功能"  # 带消息

# 查看暂存列表
git stash list

# 恢复最近的暂存（保留 stash）
git stash apply

# 恢复并删除最近的暂存
git stash pop

# 恢复指定暂存
git stash apply stash@{2}

# 清空所有暂存
git stash clear
\`\`\

## 实用别名配置

在 \`~/.gitconfig\` 中添加：

\`\`\`ini
[alias]
    co = checkout
    br = branch
    ci = commit
    st = status -sb
    lg = log --graph --abbrev-commit --decorate --format=format:'%C(bold blue)%h%C(reset) - %C(bold green)(%ar)%C(reset) %s %C(dim white)- %an%C(reset)%C(bold yellow)%d%C(reset)' --all
    last = log -1 HEAD
    amend = commit --amend --no-edit
    unstage = reset HEAD --
\`\`\

配置后，\`git lg\` 会显示漂亮的彩色日志树：

\`\`\`bash
$ git lg
* d8a3f9c - (3 hours ago) feat: 添加用户认证 (HEAD -> main) - zhang
* b2c4e1f - (5 hours ago) refactor: 重构 API 层 - zhang
* a1b2c3d - (1 day ago) chore: 初始化项目 - zhang
\`\`\

## 总结

| 场景 | 命令 |
|------|------|
| 选择性暂存 | \`git add -p\` |
| 整理提交历史 | \`git rebase -i\` |
| 撤销提交 | \`git reset --soft\` 或 \`git revert\` |
| 暂存工作 | \`git stash\` |
| 找回误删 | \`git reflog\` |
| 查看日志 | \`git lg\` (别名) |

Git 是一个强大但复杂的工具。不需要记住所有命令，但理解它的核心概念（快照、分支是指针、三个区域），会让你在使用时更加得心应手。`
  },
  {
    id: 'reading-notes-2026',
    title: '2026 上半年读书笔记与思考',
    date: '2026-06-20',
    tags: ['随笔', '读书', '日记'],
    excerpt: '回顾 2026 年上半年读过的几本书。从技术到哲学，从小说到传记，记录一些值得分享的思考和感悟。',
    content: `# 2026 上半年读书笔记与思考

上半年读了 12 本书，技术类的有 5 本，非技术类的有 7 本。挑几本印象最深的聊聊。

## 技术类

### 《代码整洁之道》 — Robert C. Martin

> "代码与其说是写给机器看的，不如说是写给人看的。"

这本书的核心理念其实很简单：**写代码要有同理心**。你写的代码不只是你一个人看，还会有队友接手，会有未来的你回来维护。

几个让我印象深刻的点：

1. **函数应该短小** — 一个函数只做一件事，名字要能说清楚它做什么
2. **有意义的命名** — 变量名是注释的一种形式，好名字胜过好注释
3. **减少注释** — 好代码自解释，注释是代码不够清晰的信号

不过老实说，书中的 Java 示例有些过时了。核心思想依然有效，但具体实践需要结合现代语言特性来调整。

### 《设计数据密集型应用》 — Martin Kleppmann

这本书是**神作**。如果你想理解数据库、消息队列、缓存这些东西的底层原理，这是必读的。

它不讲具体的工具操作，而是讲**设计原则**：

- 数据模型怎么选？关系型 vs 文档型 vs 图型
- 复制和分区的权衡是什么？
- 一致性和可用性为什么不能兼得？

读完之后看各种中间件的文档，会有一种"原来如此"的感觉。

### 《程序员修炼之道》 — David Thomas & Andrew Hunt

经典之所以是经典，是因为它不过时。这本书第一版是 1999 年，20多年后读依然适用。

最核心的一句话：

> **关注你的技艺 (Care About Your Craft)**

如果你不关心自己写的代码质量，那没有人会关心。

## 非技术类

### 《被讨厌的勇气》 — 岸见一郎 & 古贺史健

这本书用对话体讲解阿德勒心理学，读完有一种醍醐灌顶的感觉。

核心观点是 **"课题分离"**：

- 别人怎么评价你，是别人的课题
- 你怎么做，是你的课题
- 不要把别人的课题背在自己身上

> "自由就是被别人讨厌。"

这句话初看很反直觉，但细想很有道理。如果你总是在意别人的评价，那你活的是别人的人生。

### 《纳瓦尔宝典》 — Eric Jorgenson

纳瓦尔是一个硅谷投资人，这本书整理了他的推特和播客内容。

关于财富的部分没有太多新东西（无非就是杠杆、复利、长期主义），但关于**幸福**的部分很有启发：

> "幸福不是你得到了什么，而是你不再觉得缺少什么。"

他有一个观点我特别喜欢：**把阅读当作吃饭，不需要记住每一顿吃了什么，但它们构成了你的身体。** 读书也是，不需要记住每本书的内容，但它们构成了你的思想。

### 《活着》 — 余华

每年都会重读一遍《活着》。每次读都有不同的感受。

第一次读（高中）：觉得福贵太惨了
第二次读（大学）：理解了命运的无力感
第三次读（工作后）：读懂了"活着"本身的意义

> "人是为活着本身而活着，而不是为了活着之外的任何事物而活着。"

工作越久，越能理解这句话。生活不需要意义，活着本身就是意义。

## 下半年计划

- 🔲 《深入理解计算机系统》(CSAPP) — 经典系统书，一直没啃完
- 🔲 《人月神话》 — 软件工程经典
- 🔲 《三体》重读 — 隔几年就想重读一次
- 🔲 《思考，快与慢》 — 认知心理学入门

## 一点感悟

上半年最大的变化是：**读书不再追求数量了**。

以前每年定一个"读 50 本书"的目标，结果为了凑数读了很多没营养的书。现在更注重**质量和思考**，读到一本好书，会反复读、做笔记、写总结。

读书的目的不是装满大脑，而是**改变思维方式**。一本好书，哪怕只改变了一个观念，也值了。

---

你们上半年读了什么好书？欢迎推荐。`
  },
  {
    id: 'react-performance',
    title: 'React 性能优化完全指南',
    date: '2026-06-15',
    tags: ['React', '前端', '性能优化'],
    excerpt: 'React 应用跑久了会变慢？本文从组件渲染、状态管理、打包体积三个维度，系统讲解 React 性能优化的实战方法。',
    content: `# React 性能优化完全指南

React 应用在初期通常很快，但随着项目变大、组件变多，性能问题会逐渐浮现。本文从三个维度讲解系统性的优化方案。

## 一、减少不必要的渲染

这是 React 性能问题的第一大原因。

### 问题：父组件渲染导致所有子组件渲染

\`\`\`jsx
// ❌ 每次父组件渲染，子组件都会重新渲染
function Parent() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('React');

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      <ExpensiveChild name={name} />
    </div>
  );
}
\`\`\

上面的代码中，点击按钮改变 \`count\` 时，即使 \`name\` 没变，\`ExpensiveChild\` 也会重新渲染。

### 方案1：React.memo

\`\`\`jsx
// ✅ 用 memo 包裹，props 不变就不渲染
const ExpensiveChild = React.memo(function ExpensiveChild({ name }) {
  return <div>{name}</div>;
});
\`\`\

### 方案2：useMemo 缓存计算结果

\`\`\`jsx
function ProductList({ products, filter }) {
  // ❌ 每次 render 都重新过滤
  const filtered = products.filter(p => p.category === filter);

  // ✅ 只在依赖变化时重新计算
  const filtered = useMemo(
    () => products.filter(p => p.category === filter),
    [products, filter]
  );

  return /* ... */;
}
\`\`\

### 方案3：useCallback 缓存函数

\`\`\`jsx
function Parent() {
  const [count, setCount] = useState(0);

  // ❌ 每次 render 都创建新函数，导致 memo 失效
  const handleClick = () => { console.log('clicked'); };

  // ✅ 用 useCallback 缓存
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);

  return <MemoButton onClick={handleClick} />;
}
\`\`\

### useMemo / useCallback 什么时候用

不是所有地方都需要缓存。缓存本身也有开销。经验法则：

| 场景 | 建议 |
|------|------|
| 计算量大 | 用 \`useMemo\` |
| 传递给 \`React.memo\` 组件的函数 | 用 \`useCallback\` |
| 作为其他 \`useMemo\`/\`useEffect\` 的依赖 | 用 \`useMemo\`/\`useCallback\` |
| 简单计算/普通 props | 不需要缓存 |

## 二、状态管理优化

### 拆分状态，减少更新范围

\`\`\`jsx
// ❌ 一个大 state，任何更新都触发整个组件
function BadExample() {
  const [state, setState] = useState({
    user: { name: 'Alice' },
    posts: [],        // 帖子列表
    comments: [],     // 评论列表
  });
}

// ✅ 拆分成独立 state，互不影响
function GoodExample() {
  const [user, setUser] = useState({ name: 'Alice' });
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
}
\`\`\

### 状态下放

\`\`\`jsx
// ❌ 高频更新的状态放在顶层
function App() {
  const [scrollY, setScrollY] = useState(0);
  // scrollY 更新会导致整个 App 重新渲染
  return <Layout><BigTree /></Layout>;
}

// ✅ 把状态下放到需要的组件
function ScrollProgress() {
  const [scrollY, setScrollY] = useState(0);
  // 只影响这个小组件
  return <div>{scrollY}</div>;
}
\`\`\

### useReducer 替代复杂状态

\`\`\`jsx
// 当状态更新逻辑复杂时，useReducer 比 useState 更清晰
function formReducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'RESET':
      return initialState;
    case 'SUBMIT':
      return { ...state, submitting: true };
    default:
      return state;
  }
}

function Form() {
  const [state, dispatch] = useReducer(formReducer, initialState);
}
\`\`\

## 三、列表渲染优化

### 使用 key

\`\`\`jsx
// ❌ 用 index 作为 key（增删元素时会出错）
{items.map((item, index) => (
  <ListItem key={index} data={item} />
))}

// ✅ 用唯一 ID 作为 key
{items.map(item => (
  <ListItem key={item.id} data={item} />
))}
\`\`\

### 虚拟列表

当列表项超过 100 个时，考虑虚拟列表：

\`\`\`jsx
import { useVirtual } from 'react-virtual';

function BigList({ items }) {
  const rowVirtualizer = useVirtual({
    size: items.length,
    parentRef: listRef,
    estimateSize: () => 60,
    overscan: 5,
  });

  return (
    <div ref={listRef} style={{ height: 600, overflow: 'auto' }}>
      <div style={{ height: rowVirtualizer.totalSize }}>
        {rowVirtualizer.virtualItems.map(virtualRow => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              transform: \`translateY(\${virtualRow.start}px)\`,
            }}
          >
            {items[virtualRow.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
\`\`\

## 四、减少打包体积

### 代码分割

\`\`\`jsx
import { lazy, Suspense } from 'react';

// ✅ 懒加载路由组件
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
\`\`\

### 按需引入

\`\`\`javascript
// ❌ 导入整个库
import _ from 'lodash';

// ✅ 按需导入
import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';
\`\`\

### 分析包体积

\`\`\`bash
# 安装分析工具
npm install -D rollup-plugin-visualizer

# 或使用 webpack-bundle-analyzer
npm install -D webpack-bundle-analyzer
\`\`\

构建后可以看到每个模块的体积，找出可以优化的部分。

## 五、其他优化技巧

### React.lazy + 预加载

\`\`\`jsx
// 鼠标 hover 到链接上时预加载
const LazyPage = lazy(() => import('./Page'));

function Link() {
  return (
    <span
      onMouseEnter={() => import('./Page')}
      onClick={() => navigate('/page')}
    >
      Go to Page
    </span>
  );
}
\`\`\

### useTransition 降低渲染优先级

\`\`\`jsx
import { useTransition } from 'react';

function SearchResults({ query }) {
  const [isPending, startTransition] = useTransition();

  const handleChange = (e) => {
    setQuery(e.target.value);  // 高优先级：输入框更新
    startTransition(() => {
      setResults(filterData(e.target.value));  // 低优先级：结果更新
    });
  };
}
\`\`\

## 总结

性能优化不是一次性的事情，而是持续的过程。核心原则：

1. **先测量，再优化** — 用 React DevTools Profiler 找到瓶颈
2. **减少渲染** — \`memo\` + \`useMemo\` + \`useCallback\`
3. **状态拆分** — 高频状态下放到小组件
4. **列表虚拟化** — 大列表用虚拟滚动
5. **代码分割** — 路由级懒加载

记住：过早优化是万恶之源。先写出正确的代码，发现性能问题再针对性优化。`
  },
  {
    id: 'docker-essentials',
    title: 'Docker 入门：从零到部署',
    date: '2026-06-10',
    tags: ['Docker', '后端', 'DevOps'],
    excerpt: 'Docker 已经成为现代开发的标配。本文从零开始，带你理解 Docker 的核心概念，学会编写 Dockerfile，最终部署一个完整的 Web 应用。',
    content: `# Docker 入门：从零到部署

Docker 早已不是什么新鲜词，但很多开发者对它的理解还停留在"跑个容器"的层面。今天我们从零开始，系统梳理 Docker 的核心知识。

## Docker 是什么

一句话：**Docker 是一种将应用及其依赖打包到容器中运行的技术。**

和虚拟机的区别：

| 特性 | 虚拟机 | Docker 容器 |
|------|--------|-------------|
| 启动速度 | 分钟级 | 秒级 |
| 资源占用 | 高（完整OS） | 低（共享内核） |
| 隔离性 | 强 | 中 |
| 镜像大小 | GB 级 | MB 级 |

## 核心概念

### 1. 镜像 (Image)

镜像是只读的模板，包含了运行应用所需的一切：代码、运行时、库、配置。

### 2. 容器 (Container)

容器是镜像的运行实例。可以理解为：**镜像 = 类，容器 = 对象**。

### 3. 仓库 (Registry)

存放镜像的地方。Docker Hub 是最大的公共仓库，也可以搭建私有仓库。

## 常用命令速查

\`\`\`bash
# 镜像操作
docker pull nginx:latest        # 拉取镜像
docker images                    # 查看本地镜像
docker rmi nginx                 # 删除镜像

# 容器操作
docker run -d --name web -p 8080:80 nginx  # 运行容器
docker ps                        # 查看运行中的容器
docker ps -a                     # 查看所有容器
docker stop web                  # 停止容器
docker start web                 # 启动容器
docker rm web                    # 删除容器

# 进入容器
docker exec -it web bash         # 进入容器的 bash

# 查看日志
docker logs -f web                # 实时查看日志

# 清理
docker system prune              # 清理无用资源
\`\`\

## 编写 Dockerfile

Dockerfile 是构建镜像的配方。来看一个 Node.js 应用的例子：

\`\`\`dockerfile
# 使用官方 Node 镜像作为基础
FROM node:22-alpine

# 设置工作目录
WORKDIR /app

# 先复制 package 文件（利用 Docker 缓存）
COPY package*.json ./

# 安装依赖
RUN npm ci --production

# 复制源代码
COPY . .

# 构建项目
RUN npm run build

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "dist/index.js"]
\`\`\

### 构建和运行

\`\`\`bash
# 构建镜像（-t 给镜像起名，. 表示当前目录为构建上下文）
docker build -t myapp:1.0 .

# 运行容器
docker run -d --name myapp -p 3000:3000 myapp:1.0

# 测试
curl http://localhost:3000
\`\`\

## Dockerfile 最佳实践

### 1. 使用小的基础镜像

\`\`\`dockerfile
# ❌ 完整版镜像（约 900MB）
FROM node:22

# ✅ Alpine 版（约 120MB）
FROM node:22-alpine
\`\`\

### 2. 利用构建缓存

Docker 是分层的，每条指令一层。把不常变的放前面：

\`\`\`dockerfile
# ✅ 先复制 package.json，依赖不变时利用缓存
COPY package*.json ./
RUN npm ci

# 再复制源码（源码经常变）
COPY . .
\`\`\

如果先 \`COPY . .\` 再 \`npm ci\`，每次源码改动都会重新安装依赖。

### 3. 多阶段构建

\`\`\`dockerfile
# 阶段1：构建
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 阶段2：运行（只有最终镜像会保留）
FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
\`\`\

最终镜像只包含构建产物，不包含源码和构建工具，体积小很多。

### 4. 不要用 root 运行

\`\`\`dockerfile
# 创建非 root 用户
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
\`\`\

## Docker Compose

当应用需要多个服务（如 Web + 数据库 + 缓存）时，用 Compose 编排：

\`\`\`yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=database
      - DB_PORT=5432
    depends_on:
      - database

  database:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
\`\`\

\`\`\`bash
# 一键启动所有服务
docker compose up -d

# 查看状态
docker compose ps

# 查看日志
docker compose logs -f web

# 停止并删除
docker compose down

# 停止并删除（包括数据卷）
docker compose down -v
\`\`\

## 数据持久化

容器销毁后数据会丢失，需要用 Volume 持久化：

\`\`\`bash
# 命名卷（Docker 管理）
docker run -v mydata:/data myapp

# 绑定挂载（映射到宿主机目录）
docker run -v /host/path:/container/path myapp

# 只读挂载
docker run -v /host/config:/config:ro myapp
\`\`\

## 网络

\`\`\`bash
# 创建网络
docker network create mynet

# 容器加入网络
docker run --network mynet --name app myapp

# 同一网络内的容器可以用容器名互访
# 例如 app 容器内可以用 "database" 作为主机名访问 database 容器
\`\`\

## 实战：部署一个博客

假设我们有一个 Next.js 博客应用：

\`\`\`dockerfile
# Dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
\`\`\

\`\`\`bash
# 构建
docker build -t blog:latest .

# 运行
docker run -d --name blog -p 3000:3000 \\
  -e DATABASE_URL=postgresql://... \\
  blog:latest
\`\`\

## 总结

| 概念 | 说明 |
|------|------|
| 镜像 | 只读模板，构建一次到处运行 |
| 容器 | 镜像的运行实例 |
| Dockerfile | 构建镜像的脚本 |
| Compose | 多容器编排 |
| Volume | 数据持久化 |
| Network | 容器间通信 |

Docker 的核心理念是 **一次构建，到处运行**。理解了镜像分层、构建缓存、多阶段构建，你就能写出高效的生产级 Dockerfile。`
  }
];

// 导出文章数据
if (typeof module !== 'undefined' && module.exports) {
  module.exports = POSTS;
}
