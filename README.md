# hunzi-whiteboard — 边画边讲（竖屏白板讲解）skill

一个 Claude Code skill：做像《混子哥边画边讲》那样的竖屏白板手绘讲解视频。一块固定白板，用 Q 版人物、关系箭头和小故事，把一段历史、一组人物关系或一类文化清单讲清楚，画完的整块板就是一张能截图收藏的知识图。

- `SKILL.md`：方法、硬规格、工作流、检查清单（skill 入口）
- `references/hunzi-study.md`：混子哥播放量前 10 的视频拆解（结构、开场和结尾套路、语速、版面、我们没有真人出镜时怎么移植）
- `references/lessons-wei-jin.md`：《一口气理清魏晋南北朝与五胡十六国》8 版迭代的反馈和技术坑
- `template/`：能直接跑的起手工程（Lemo-Opuscar 白板引擎竖屏版、Q 版人物生成器、单手排班、三块板、字幕、MiniMax 配音、混音、封面和小红书卡片、一键构建）
- `examples/wei-jin/`：完整例子的旁白和画面代码

## 安装

```bash
git clone <this repo> ~/hunzi-whiteboard-skill
ln -s ~/hunzi-whiteboard-skill <你的项目>/.claude/skills/hunzi-whiteboard   # 或 ~/.claude/skills/hunzi-whiteboard
```

## 依赖

- Lemo-Opuscar 库（默认 `~/lemo-opuscar`，环境变量 `LIB`）：渲染、事件导出、音效
- 视频仓库（默认 `~/videos`，环境变量 `VIDEOS_ROOT`）：`.venv`（fontTools、mgaudio 依赖）和 `lib/audio/bgm.py`（配乐），可选 `brand/avatar.png`（头像水印）
- `mmx` CLI（MiniMax TTS）、`ffmpeg`、`whisper`（配音核对）
- 网络：首次运行时下载汉字笔顺数据（jsDelivr）和霞鹜文楷字体（GitHub Releases），都不放进本仓库

## 快速开始

```bash
cp -R ~/hunzi-whiteboard-skill/template <项目>/src
sh <项目>/src/setup.sh
# 写 <项目>/src/lines.json 和 film.js 里“TOPIC CONTENT”标记之间的板面内容
sh <项目>/src/build.sh --vo
```
