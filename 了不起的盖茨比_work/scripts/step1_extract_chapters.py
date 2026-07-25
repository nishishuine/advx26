#!/usr/bin/env python3
"""
Step 1: 章节切分与清洗（通用版）
用法: python step1_extract_chapters.py <raw_text.txt> <output_dir> [--chapter-defs CHAPTER_DEFS_JSON]

如果不提供 --chapter-defs，会扫描并建议章节边界供用户在 JSON 中指定。

章节定义 JSON 格式:
{
  "chapters": [
    {"start_line": 0, "end_line": 100, "title": "第一章", "short_title": "相遇"},
    ...
  ]
}
"""
import re, json, os, sys, argparse

def clean_dirty_spaces(text):
    """清洗脏空格：中文字符间、中文与英文字母间的多余空格"""
    text = re.sub(r'([\u4e00-\u9fff])\s+([\u4e00-\u9fff])', r'\1\2', text)
    text = re.sub(r'([\u4e00-\u9fff])\s+([a-zA-Z])', r'\1\2', text)
    text = re.sub(r'([a-zA-Z])\s+([\u4e00-\u9fff])', r'\1\2', text)
    text = text.replace('\u3000', '')  # 全角空格
    return text

def is_noise_line(stripped):
    """判断是否为噪声行（通用规则）"""
    noise_keywords = [
        '后一页', '前一页', '回目录', '目录', 'Copyright', 'All rights reserved',
        '您所在的位置', '作 者', '类 别', '书籍简介', '—完—', '完本',
        '手机阅读', 'www.', 'http://', 'https://', 'ebook', 'Ebook',
    ]
    for n in noise_keywords:
        if n.lower() in stripped.lower():
            return True
    return False

def is_section_number(stripped):
    """检测是否为纯数字段（小节号）"""
    return stripped.isdigit() and 1 <= int(stripped) <= 999

def is_toc_line(stripped):
    """判断是否为目录行"""
    toc_patterns = [
        r'^第[一二三四五六七八九十百千\d]+章\s*$',
        r'^第[一二三四五六七八九十百千\d]+章\s+\S+',
        r'^\d+\.\s*\S+.*$',  # 1. 标题
    ]
    for p in toc_patterns:
        if re.match(p, stripped):
            return True, stripped
    return False, None

def scan_for_chapter_candidates(lines):
    """扫描文本，找出可能的章节标题位置"""
    candidates = []
    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue
        # 匹配 "第X章"、"Chapter X" 等模式
        ch_patterns = [
            r'^第[一二三四五六七八九十百千\d]+章',       # 第一章 / 第1章
            r'^Chapter\s+\d+', i                          # Chapter 1
        ]
        for idx, p in enumerate(ch_patterns):
            if idx == 0:
                if re.match(p, stripped):
                    candidates.append((i, stripped[:60]))
                    break
            elif isinstance(idx, int):
                if re.match(p, stripped, re.IGNORECASE):
                    candidates.append((i, stripped[:60]))
                    break
    return candidates

def extract_chapter(lines, start_line, end_line):
    """提取一个章节的内容，返回段落列表"""
    paragraphs = []
    for i in range(start_line, end_line):
        stripped = lines[i].strip()
        if not stripped:
            continue
        if is_noise_line(stripped):
            continue
        cleaned = clean_dirty_spaces(stripped)
        paragraphs.append(cleaned)
    return paragraphs

def main():
    parser = argparse.ArgumentParser(description="章节切分与清洗")
    parser.add_argument("input", help="raw_text.txt 路径")
    parser.add_argument("output", help="输出目录")
    parser.add_argument("--chapter-defs", help="章节定义 JSON 文件路径", default=None)
    parser.add_argument("--scan", action="store_true", help="扫描并建议章节边界")
    args = parser.parse_args()

    with open(args.input, "r", encoding="utf-8") as f:
        lines = f.readlines()

    os.makedirs(args.output, exist_ok=True)
    os.makedirs(os.path.join(args.output, "chapters"), exist_ok=True)

    if args.scan or not args.chapter_defs:
        candidates = scan_for_chapter_candidates(lines)
        print(f"\n📖 文本共 {len(lines)} 行")
        print(f"📋 扫描到 {len(candidates)} 个可能的章节标题:")
        for line_no, text in candidates:
            print(f"  行 {line_no:>6}: {text}")
        print(f"\n💡 请根据以上结果创建章节定义 JSON 文件:")
        print(f'  {{"chapters": [')
        for i, (line_no, text) in enumerate(candidates):
            next_line = candidates[i+1][0] if i+1 < len(candidates) else len(lines)
            print(f'    {{"start_line": {line_no}, "end_line": {next_line}, "title": "{text}", "short_title": ""}},')
        print(f'  ]}}')
        print(f"\n然后重新运行: python {sys.argv[0]} {args.input} {args.output} --chapter-defs chapter_defs.json")
        if args.scan:
            # 保存扫描结果
            scan_result = {
                "total_lines": len(lines),
                "candidates": [{"line": l, "text": t[:60]} for l, t in candidates]
            }
            scan_path = os.path.join(args.output, "_chapter_scan.json")
            with open(scan_path, "w", encoding="utf-8") as f:
                json.dump(scan_result, f, ensure_ascii=False, indent=2)
            print(f"扫描结果已保存到: {scan_path}")
        return

    # 加载章节定义
    with open(args.chapter_defs, "r", encoding="utf-8") as f:
        defs = json.load(f)
    chapter_defs = defs.get("chapters", defs)  # 兼容直接传数组

    chapters_data = {}
    for idx, ch_def in enumerate(chapter_defs, 1):
        start, end = ch_def["start_line"], ch_def["end_line"]
        title = ch_def.get("title", f"第{idx}章")
        short_title = ch_def.get("short_title", "")
        paras = extract_chapter(lines, start, end)
        chapters_data[idx] = {
            "index": idx,
            "id": f"ch{idx:02d}",
            "title": f"第{idx}章 {short_title}" if short_title else title,
            "short_title": short_title or title,
            "paragraphs": paras,
            "char_count": sum(len(p) for p in paras)
        }
        print(f"  ch{idx:02d}: {len(paras):>4} 段落, {chapters_data[idx]['char_count']:>6} 字  ← {short_title or title}")

    # 写入各章 JSON
    for idx, ch in chapters_data.items():
        ch_file = os.path.join(args.output, "chapters", f"ch{idx:02d}.json")
        with open(ch_file, "w", encoding="utf-8") as f:
            json.dump(ch, f, ensure_ascii=False, indent=2)

    # 保存章节数据供后续使用
    with open(os.path.join(args.output, "_chapters_data.json"), "w", encoding="utf-8") as f:
        json.dump(chapters_data, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 章节切分完成! 共 {len(chapters_data)} 章")

if __name__ == "__main__":
    main()
