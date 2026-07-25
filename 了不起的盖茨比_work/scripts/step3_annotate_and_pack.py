#!/usr/bin/env python3
"""
Step 3: 正文标注 + 附属文件生成 + 打包为 .bookpack（通用版）

用法: python step3_annotate_and_pack.py <build_dir> [--output OUTPUT_DIR]
"""
import json, os, re, zipfile, sys, argparse
from collections import OrderedDict

def build_alias_mapping(chars):
    """构建别名映射：按 first_chapter 排序，最早出现的同名优先"""
    entries = []
    for c in chars:
        for alias in c.get("aliases", []):
            if len(alias) >= 2:
                entries.append((alias, c["id"], c["first_chapter"]))
    entries.sort(key=lambda x: x[2])
    mapping = OrderedDict()
    for alias, cid, _ in entries:
        if alias not in mapping:
            mapping[alias] = cid
    return mapping

def self_avoiding_walk(matches):
    """防重叠算法：贪心选最长的不重叠匹配"""
    matches.sort(key=lambda x: (x[0], -x[1]))
    selected = []
    for match in matches:
        if selected and match[0] < selected[-1][1]:
            continue
        selected.append(match)
    return selected

def annotate_paragraph(chars, paragraph):
    """对单个段落进行两阶段标注"""
    result = paragraph

    all_patterns = []
    for c in chars:
        for alias in c.get("aliases", []):
            if len(alias) >= 2:
                all_patterns.append((alias, c["id"], c["first_chapter"]))
    all_patterns.sort(key=lambda x: -len(x[0]))

    # 阶段一：找到所有匹配
    all_matches = []
    for pattern, cid, fc in all_patterns:
        pos = 0
        while True:
            idx = result.find(pattern, pos)
            if idx == -1:
                break
            all_matches.append((idx, idx + len(pattern), pattern, cid))
            pos = idx + 1

    # 防重叠
    all_matches.sort(key=lambda x: (x[0], -x[1]))
    pre_selected = [(m[0], m[1], (m[2], m[3])) for m in all_matches]
    selected = self_avoiding_walk(pre_selected)

    # 从右往左应用标记
    selected_sorted = sorted(selected, key=lambda x: -x[0])
    for start, end, (pattern, cid) in selected_sorted:
        result = result[:start] + f"[[c:{cid}]]{pattern}[[/]]" + result[end:]

    return result

def strip_annotations(text):
    """剥离标注标记"""
    return re.sub(r'\[\[c:\w+\]\]|\[\[\/\]\]', '', text)

def main():
    parser = argparse.ArgumentParser(description="标注 + 附属文件生成 + 打包 .bookpack")
    parser.add_argument("build_dir", help="build 目录（含 chapters/ 和 characters.json）")
    parser.add_argument("--output", "-o", help="输出目录（默认 build_dir 的父目录/output）", default=None)
    parser.add_argument("--book-id", help="书的唯一 ID（用于 manifest）", default=None)
    parser.add_argument("--title", help="书名", default=None)
    parser.add_argument("--author", help="作者", default="")
    parser.add_argument("--language", help="语言", default="zh")
    parser.add_argument("--source-language", help="原文语言", default="")
    parser.add_argument("--cover", help="封面文件路径（可选，自动识别 jpg/png/svg）", default=None)
    args = parser.parse_args()

    build_dir = args.build_dir
    output_dir = args.output or os.path.join(os.path.dirname(os.path.abspath(build_dir)), "output")
    os.makedirs(output_dir, exist_ok=True)

    # ===== 加载数据 =====
    with open(os.path.join(build_dir, "characters.json"), "r", encoding="utf-8") as f:
        chars_data = json.load(f)["characters"]

    with open(os.path.join(build_dir, "_chapters_data.json"), "r", encoding="utf-8") as f:
        chapters_data = json.load(f)

    char_by_id = {c["id"]: c for c in chars_data}

    # ===== 构建 alias_mapping =====
    alias_mapping = build_alias_mapping(chars_data)
    with open(os.path.join(build_dir, "alias_mapping.json"), "w", encoding="utf-8") as f:
        json.dump(alias_mapping, f, ensure_ascii=False, indent=2)
    print(f"alias_mapping: {len(alias_mapping)} 条别名映射")

    # ===== 正文标注 =====
    print("\n开始标注正文...")
    fidelity_failures = []
    for idx in sorted(chapters_data.keys()):
        ch = chapters_data[idx]
        original_paras = ch["paragraphs"]
        annotated_paras = [annotate_paragraph(chars_data, p) for p in original_paras]

        # 保真校验
        failed_indices = []
        for i, (orig, ann) in enumerate(zip(original_paras, annotated_paras)):
            if strip_annotations(ann) != orig:
                failed_indices.append(i)

        if failed_indices:
            fidelity_failures.append((idx, len(failed_indices)))
            print(f"  ⚠️  ch{int(idx):02d}: {len(failed_indices)} 个段落保真校验失败")
        else:
            print(f"  ✅ ch{int(idx):02d}: 保真校验通过")

        ch_annotated = {
            "index": ch["index"],
            "id": ch["id"],
            "title": ch["title"],
            "paragraphs": annotated_paras
        }
        ch_file = os.path.join(build_dir, "chapters", f"ch{int(idx):02d}.json")
        with open(ch_file, "w", encoding="utf-8") as f:
            json.dump(ch_annotated, f, ensure_ascii=False, indent=2)
        chapters_data[idx] = ch_annotated

    text_verified = len(fidelity_failures) == 0

    # ===== 构建 graph.json =====
    nodes = []
    for c in chars_data:
        nodes.append({
            "id": c["id"],
            "label": c["name"],
            "portrait": c.get("portrait", f"portraits/{c['id']}.svg"),
            "color": c.get("color", "#666666"),
            "family": c.get("family", ""),
            "first_chapter": c.get("first_chapter", 1)
        })

    edges = []
    seen = set()
    for c in chars_data:
        for r in c.get("relations", []):
            key = tuple(sorted([c["id"], r["target_id"]]))
            if key not in seen:
                seen.add(key)
                edges.append({
                    "source": c["id"],
                    "target": r["target_id"],
                    "type": r["type"],
                    "label": r["label"],
                    "based_on_chapters": r.get("based_on_chapters", [1])
                })

    graph = {"nodes": nodes, "edges": edges}
    with open(os.path.join(build_dir, "graph.json"), "w", encoding="utf-8") as f:
        json.dump(graph, f, ensure_ascii=False, indent=2)
    print(f"\ngraph.json: {len(nodes)} 节点, {len(edges)} 边")

    # ===== 构建 book.json =====
    book_title = args.title or "未知书名"
    book_author = args.author or "未知作者"
    book = {
        "title": book_title,
        "author": book_author,
        "language": args.language,
        "source_language": args.source_language or args.language,
        "show_original_name": "first",
        "cover": args.cover or "cover.svg",
        "total_chapters": len(chapters_data),
        "chapters": []
    }
    for idx in sorted(chapters_data.keys(), key=lambda x: int(x)):
        ch = chapters_data[idx]
        book["chapters"].append({
            "index": ch["index"],
            "id": ch["id"],
            "title": ch.get("title", f"第{int(idx)}章"),
            "file": f"chapters/{ch['id']}.json",
            "char_count": sum(len(p) for p in ch["paragraphs"])
        })

    with open(os.path.join(build_dir, "book.json"), "w", encoding="utf-8") as f:
        json.dump(book, f, ensure_ascii=False, indent=2)
    print("book.json 生成完成")

    # ===== 构建 theme.json =====
    families = {}
    for c in chars_data:
        fam = c.get("family", "其他")
        if fam not in families:
            families[fam] = {"palette": []}
        if c.get("color"):
            families[fam]["palette"].append(c["color"])

    if not families:
        families = {
            "默认": {"palette": ["#1A5276", "#7D3C98", "#E74C3C", "#2E86C1", "#D4AC0D", "#1ABC9C"]}
        }

    theme = {
        "families": families,
        "default_palette": ["#2E7D32", "#00838F", "#6A1B9A", "#EF6C00"],
        "mode": "family"
    }
    with open(os.path.join(build_dir, "theme.json"), "w", encoding="utf-8") as f:
        json.dump(theme, f, ensure_ascii=False, indent=2)
    print("theme.json 生成完成")

    # ===== 生成简易头像 SVGs（如果没有真实头像） =====
    existing_avatars = set()
    portraits_dir = os.path.join(build_dir, "portraits")
    if os.path.exists(portraits_dir):
        existing_avatars = set(os.listdir(portraits_dir))

    svg_template = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <rect width="100" height="100" fill="{bg}" rx="15"/>
  <text x="50" y="50" text-anchor="middle" dy=".35em" fill="white" font-size="36" font-family="serif">{initial}</text>
</svg>'''

    os.makedirs(portraits_dir, exist_ok=True)
    for c in chars_data:
        svg_name = f"{c['id']}.svg"
        if svg_name not in existing_avatars:
            svg = svg_template.format(bg=c.get("color", "#666666"), initial=c["name"][0])
            with open(os.path.join(portraits_dir, svg_name), "w", encoding="utf-8") as f:
                f.write(svg)
    print(f"portraits: {len(chars_data)} 个头像（已存在则跳过）")

    # ===== 生成封面（如果没有提供） =====
    cover_provided = args.cover and os.path.exists(os.path.join(build_dir, os.path.basename(args.cover)))
    if not cover_provided:
        cover_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
  <rect width="600" height="800" fill="#1A1A2E"/>
  <text x="300" y="300" text-anchor="middle" fill="#D4AC0D" font-size="48" font-family="serif">{book_title}</text>
  <text x="300" y="370" text-anchor="middle" fill="#CCCCCC" font-size="24" font-family="serif">{book_author}</text>
  <line x1="150" y1="400" x2="450" y2="400" stroke="#D4AC0D" stroke-width="1"/>
  <circle cx="300" cy="580" r="60" fill="none" stroke="#D4AC0D" stroke-width="2" opacity="0.5"/>
</svg>'''
        with open(os.path.join(build_dir, "cover.svg"), "w", encoding="utf-8") as f:
            f.write(cover_svg)
        book["cover"] = "cover.svg"
        # 更新 book.json
        with open(os.path.join(build_dir, "book.json"), "w", encoding="utf-8") as f:
            json.dump(book, f, ensure_ascii=False, indent=2)
        print("cover.svg 生成完成")

    # ===== 构建 manifest.json =====
    total_chars = len(chars_data)
    total_events = sum(len(c.get("key_events", [])) for c in chars_data)
    total_relations = sum(len(c.get("relations", [])) for c in chars_data)
    import datetime
    book_id = args.book_id or re.sub(r'[^a-z0-9]+', '-', book_title.lower()).strip('-')

    manifest = {
        "schema_version": "1.0",
        "package_type": "reading-companion-book",
        "book_id": book_id,
        "generated_at": datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "generator": "bookpack-builder-skill@1.0",
        "source": {"filename": f"{book_title}", "format": "epub"},
        "stats": {
            "chapters": len(chapters_data),
            "characters": total_chars,
            "portraits": total_chars,
            "relations": total_relations,
            "key_events": total_events
        },
        "integrity": {
            "text_verified": text_verified,
            "verified_at": datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
        }
    }
    with open(os.path.join(build_dir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print("manifest.json 生成完成")

    # ===== 打包为 .bookpack =====
    bookpack_name = f"{book_title}.bookpack"
    bookpack_path = os.path.join(output_dir, bookpack_name)
    with zipfile.ZipFile(bookpack_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.write(os.path.join(build_dir, "manifest.json"), "manifest.json")
        zf.write(os.path.join(build_dir, "book.json"), "book.json")
        for idx in sorted(chapters_data.keys(), key=lambda x: int(x)):
            ch_path = os.path.join(build_dir, "chapters", f"ch{int(idx):02d}.json")
            if os.path.exists(ch_path):
                zf.write(ch_path, f"chapters/ch{int(idx):02d}.json")
        zf.write(os.path.join(build_dir, "characters.json"), "characters.json")
        zf.write(os.path.join(build_dir, "alias_mapping.json"), "alias_mapping.json")
        zf.write(os.path.join(build_dir, "graph.json"), "graph.json")
        zf.write(os.path.join(build_dir, "theme.json"), "theme.json")
        for c in chars_data:
            svg_path = os.path.join(build_dir, "portraits", f"{c['id']}.svg")
            if os.path.exists(svg_path):
                zf.write(svg_path, f"portraits/{c['id']}.svg")
            png_path = os.path.join(build_dir, "portraits", f"{c['id']}.png")
            if os.path.exists(png_path):
                zf.write(png_path, f"portraits/{c['id']}.png")
            jpg_path = os.path.join(build_dir, "portraits", f"{c['id']}.jpg")
            if os.path.exists(jpg_path):
                zf.write(jpg_path, f"portraits/{c['id']}.jpg")
        # 封面
        cover_file = book.get("cover", "cover.svg")
        cover_path = os.path.join(build_dir, os.path.basename(cover_file))
        if os.path.exists(cover_path):
            zf.write(cover_path, os.path.basename(cover_file))

    pack_size = os.path.getsize(bookpack_path)
    print(f"\n✅ .bookpack 打包完成: {bookpack_path}")
    print(f"   包大小: {pack_size:,} 字节 ({pack_size/1024:.1f} KB)")

    # 校验统计
    print("\n" + "=" * 60)
    print("📊 最终校验统计")
    print("=" * 60)
    print(f"  ✔ 章节数: {len(chapters_data)}")
    for idx in sorted(chapters_data.keys(), key=lambda x: int(x)):
        ch = chapters_data[idx]
        wc = sum(len(p) for p in ch["paragraphs"])
        print(f"     ch{int(idx):02d}: {wc} 字, {len(ch['paragraphs'])} 段")
    print(f"  ✔ 角色数: {total_chars}")
    print(f"  ✔ 事件数: {total_events}")
    print(f"  ✔ 关系数: {total_relations}")
    print(f"  ✔ 别名映射: {len(alias_mapping)}")
    print(f"  ✔ 保真校验: {'✅ 通过' if text_verified else '⚠️ 有失败段落（见上方警告）'}")

if __name__ == "__main__":
    main()
