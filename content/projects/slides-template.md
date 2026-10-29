---
title: slides-template
description: 用 Markdown 写内容，生成蒋炎岩风格的网页幻灯片。
---

# slides-template

用 Markdown 写内容，一条命令生成和参考图同一套主题的网页幻灯片（reveal.js），可导出 PDF，也可以直接部署到 GitHub Pages。

![预览](/assets/img/slides-preview.png)

> 参考图里那页“我是谁？”来自南京大学蒋炎岩（jyy）老师的 reveal.js 幻灯片。这个模板是**可 fork 的定制版**：把名字、单位、颜色换掉，就是你们自己的模板。

## 它从哪来

参考图不是 PowerPoint，而是 [reveal.js](https://revealjs.com/) 生成的网页幻灯片。上游项目是 [zweix123/jyyslide-md](https://github.com/zweix123/jyyslide-md)（MIT）：用 Python 把一套简化的 Markdown 编译成 reveal.js 网页，主题 CSS 在 `src/static/jyy/jyy.css`。

这个模板在上游基础上做了几件事：

1. 新增 `src/static/jyy/custom.css`，把“换皮肤”集中到一个文件；
2. 页码改成只显示当前页，翻页箭头改成灰色；
3. 去掉了一个不存在的 `plugin/markdown/markdown.js` 引用；
4. front matter 支持 `title:`，单位 logo 变成可选项；
5. 用 `requirements.txt` + `scripts/` 替代 Poetry，少装一堆开发依赖。

## 30 秒跑起来

需要 Python 3.10+。

```bash
cd slides-template

bash scripts/setup.sh     # 第一次：创建 .venv 并安装依赖
bash scripts/build.sh     # 编译 decks/demo.md -> decks/dist/
bash scripts/serve.sh     # 打开 http://localhost:8000
```

之后每次改完 `decks/demo.md`，只需要重新执行 `bash scripts/build.sh`，刷新浏览器即可。

> 为什么不用 `file://` 直接打开 `index.html`？
> 浏览器对本地文件的脚本/图片有限制，用 `serve.sh` 起一个本地 HTTP 服务最稳。

## 只改三个地方，就变成你们的

1. `decks/demo.md` 的 front matter：标题、作者、单位。
2. `src/static/jyy/custom.css`：主色、字体、页脚。
3. `docs/` 里的预览图：换成你们自己的截图。

```yaml
---
title: 操作系统概述
author: Your Name
institute: Your University
---
```

## 为什么用网页幻灯片

- **版本控制**：纯文本，diff 清楚，多人协作不冲突。
- **代码高亮**：讲编程课不用截图贴代码。
- **公式**：MathJax/KaTeX 直接写 LaTeX。
- **发布**：构建产物是静态文件，扔到任何静态托管都能看。

缺点是排版自由度不如 Keynote，但对技术演讲来说，约束反而是好事。

模板基于上游 [zweix123/jyyslide-md](https://github.com/zweix123/jyyslide-md)（MIT）；完整的上游说明和示例见该项目。
