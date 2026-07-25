# MANIFOLD — AdventureX 提交用生图 Prompts

> 风格统一：黑白 · 先锋 · 艺术感
> **v2 更新：MANIFOLD 字标直接生成进画面，字体本身做艺术化处理**
> ⚠️ 模型写拉丁单词成功率较高但不保证，**生成后检查拼写 M-A-N-I-F-O-L-D**，错一个字母就重抽；中文"流形"出错率高，建议只用 MANIFOLD 或后期补字。

---

## 方向 A · 流形曲面（主推，最贴品牌）

数学流形线框在大地上起伏，MANIFOLD 字母由同款线框构成——字即流形。

### A1 卡片封面（440×140，生成 21:9 后裁）
```
Ultra-minimalist monochrome banner, pure black background, the word "MANIFOLD" in large capital letters constructed entirely from delicate white wireframe mesh lines, as if the typography is made of a mathematical manifold grid, letters centered in the middle of the composition, thin contour lines and flowing grid waves extending subtly behind the text, sparse glowing dots at line intersections, wide horizontal banner layout, generous empty black margins on far left and right edges, black and white only, futuristic scientific art, elegant, precise fine line art, 8k
```

### A2 详情封面（3840×320，生成 21:9 后裁）
```
Extreme panoramic monochrome landscape, pure black void, a vast white wireframe manifold terrain stretching to the horizon with flowing topographic waves, the word "MANIFOLD" in very large ultra-thin widely letter-spaced capital letters floating above the terrain ridge, typography perfectly centered, elegant hairline sans-serif font, letters glowing faintly white, terrain grid lines subtly deforming around the letters as if warped by gravity, main content in the central third, far edges nearly empty, black and white only, museum-grade avant-garde poster, 8k
```

### A3 主封面 16:9（1920×1080）
```
Monochrome hero key visual, pure black background, a large luminous white wireframe manifold surface floating in dark space viewed at a dramatic low angle, above it the word "MANIFOLD" in huge capital letters built from the same flowing wireframe grid lines, letters appear woven from mathematical curves, a constellation of small glowing nodes connected by hairlines around the typography, centered composition, black and white only, cinematic lighting, futuristic fine art poster, extremely detailed line work, 8k
```

---

## 方向 B · 语义骨架（最贴产品概念）

文字被"解剖"出结构——MANIFOLD 一词本身就在解构：左半实心、右半散作标注骨架。

### B1 卡片封面
```
Minimalist black and white concept banner, pure black background, the word "MANIFOLD" in large capital letters at center, the left half of each letter solid white while the right half deconstructs into thin geometric brackets, connector lines and small nodes, as if the typography is being X-rayed into a semantic skeleton, horizontal banner layout, main typography centered, clean empty margins on both far sides, black and white only, Swiss design meets generative art, high contrast, 8k
```

### B2 详情封面
```
Extreme wide panoramic monochrome artwork, pure black background, the word "MANIFOLD" in large elegant capitals perfectly centered, letters transitioning from solid white on the left to an exploded diagram of thin structural lines and annotation brackets on the right, like text disassembling into a knowledge graph, delicate white linework extending horizontally, generous empty black space on far left and right, black and white only, avant-garde data art poster, precise, elegant, 8k
```

### B3 主封面 16:9
```
Black and white avant-garde key visual, pure black background, the word "MANIFOLD" in very large capital letters at vertical center, each letter half-solid and half-skeleton, the solid strokes dissolving into an intricate exploded structure of thin white lines, brackets and nodes, skeleton emerging from inside the typography, dramatic centered composition with wide negative space, monochrome only, fine technical illustration style, museum quality poster, 8k
```

---

## 方向 C · 新坐标星群（最贴赛道 XYZ）

星群之间，MANIFOLD 以空心描边大字悬于坐标原点——"新坐标，新标准"。

### C1 卡片封面
```
Minimal monochrome star map banner, pure black background, the word "MANIFOLD" in large capital letters drawn only as thin white outlines, hollow stroked typography with wide letter spacing, perfectly centered, six small constellations of white dots connected by hairlines scattered around the letters, one thin coordinate axis line crossing behind the text, empty black margins far left and right, black and white only, celestial navigation chart aesthetic, poetic, precise, 8k
```

### C2 详情封面
```
Ultra-wide panoramic monochrome cosmic chart, pure black void, the word "MANIFOLD" in very large thin-outline hollow capital letters floating at the exact center, three faint coordinate axis lines converging behind the typography, six constellations of fine white dots and hairlines spread across the middle band like an archipelago, a faint wireframe manifold grid rising from the bottom edge, vast empty space on far sides, black and white only, astronomical atlas style poster, minimal, sublime, 8k
```

### C3 主封面 16:9
```
Monochrome conceptual key visual, pure black background, the word "MANIFOLD" in huge hollow outlined capital letters, letters drawn only by thin white contour lines with elegant wide spacing, six glowing constellations of tiny dots connected by delicate lines orbiting around the typography, one luminous coordinate axis linking them, a faint wireframe manifold surface far below like a dark ocean, large centered composition, black and white only, fine art star atlas poster, cinematic minimalism, 8k
```

---

## 备用：纯字体实验（若想单独抽字标）

不满意字体时可单独生成字标 PNG，再合成到任何背景上：
```
The single word "MANIFOLD" in capital letters, experimental monochrome typography, letters constructed from thin white wireframe mesh lines like a mathematical manifold grid, on a pure black background, centered, generous padding, black and white only, no other elements, high contrast, precise fine line art, 8k
```
变体关键词（替换 typography 描述）：
- `ultra-thin widely letter-spaced hairline sans-serif` —— 极细超宽字距（最先锋）
- `hollow outline stroked letters` —— 空心描边字
- `letters sliced horizontally with subtle glitch offsets` —— 切片故障字
- `letters engraved like technical etching with fine cross-hatching` —— 雕版蚀刻字

## 通用负面提示词（带字版专用，注意不能排除 text）
```
color, colorful, watermark, blurry, low quality, gradient background, grey background, photo, realistic human, hands, cluttered, misspelled, extra letters, chinese characters
```

## 无字版（备用，字体翻车时的退路）
> 若带字版多次尝试仍拼写错误，退回无字版 + 后期叠字。
> 无字版 prompt 与负面词见附录。

### 附录：无字版通用负面提示词
```
color, colorful, text, letters, words, typography, watermark, logo, blurry, low quality, gradient background, grey background, photo, realistic human, hands, cluttered, busy edges
```

### 附录：无字版 prompt（A/B/C 各一，更多尺寸可按带字版改写去掉文字描述）
A 无字：
```
Ultra-minimalist monochrome banner, pure black background, a delicate white wireframe mesh of a mathematical manifold surface flowing horizontally, thin precise contour lines, sparse glowing dots at intersections, main visual mass in the horizontal center, empty margins on edges, black and white only, no text, no letters, elegant futuristic scientific art, 8k
```
B 无字：
```
Minimalist black and white concept art, abstract calligraphy-like strokes dissolving into precise geometric annotation brackets and connector lines, transformation from organic chaos to structured order, thin white lines on pure black, central composition, black and white only, no readable text, Swiss design meets generative art, 8k
```
C 无字：
```
Minimal monochrome star map, pure black background, six small constellations of white dots connected by hairlines, one thin coordinate axis line crossing the scene, central band composition, black and white only, no text, celestial chart aesthetic, 8k
```

## 裁切命令（生成后按规格裁，ffmpeg）

```bash
# 卡片封面：先裁到 3.14:1 再缩到 440x140（中心裁切）
ffmpeg -i in.png -vf "crop=iw:iw/3.14,scale=440:140" card_440x140.png

# 详情封面：裁到 12:1 再缩到 3840x320
ffmpeg -i in.png -vf "crop=iw:iw/12,scale=3840:320" banner_3840x320.png

# 主封面：16:9 直接用，缩到 1920x1080
ffmpeg -i in.png -vf "scale=1920:1080" cover_1920x1080.png
```

## 相册图建议（不用生图，用真截图，更有说服力）
1. 阅读伴侣：正文高亮 + 角色卡弹出（视频 2:05 帧）
2. 关系图全屏（视频 2:15 帧）
3. 拆解：Orange Pi 五段链路（视频 2:45 帧）
4. 重建模式 9 步教程（视频 3:03 帧）
5. 网站 manifold-site 首页截图（黑白，调性统一）
> 视频抽帧：`ffmpeg -ss 秒 -i 无声视频.mp4 -frames:v 1 out.png`
