#!/usr/bin/env python3
"""
Step 0: 从 EPUB 中提取纯文本
提取后需人工/LLM 判断章节边界，进入 step1
"""
import zipfile, os, re, json
from xml.etree import ElementTree as ET

def extract_epub(epub_path, output_dir):
    """提取 EPUB 的纯文本内容"""
    os.makedirs(output_dir, exist_ok=True)

    with zipfile.ZipFile(epub_path, 'r') as zf:
        # 1. 找到 OPF 文件
        try:
            container = ET.fromstring(zf.read("META-INF/container.xml"))
            ns = {"c": "urn:oasis:names:tc:opendocument:xmlns:container"}
            opf_path = container.find(".//c:rootfile", ns).get("full-path")
        except Exception:
            opf_path = None

        # 2. 解析 OPF -> 获取 spine 顺序和所有 xhtml/html 文件
        html_files = []
        if opf_path:
            opf_dir = os.path.dirname(opf_path) or ""
            opf = ET.fromstring(zf.read(opf_path))
            # 去除默认命名空间以便查找
            def strip_ns(tag):
                return tag.split("}", 1)[1] if "}" in tag else tag
            opf_root = opf

            # 从 spine 获取阅读顺序
            spine_items = []
            spine = opf_root.find(".//{http://www.idpf.org/2007/opf}spine")
            if spine is None:
                spine = opf_root.find("spine")
            if spine is not None:
                for itemref in spine:
                    idref = itemref.get("idref", "")
                    spine_items.append(idref)

            # 获取 manifest 中的文件路径
            manifest = opf_root.find(".//{http://www.idpf.org/2007/opf}manifest")
            if manifest is None:
                manifest = opf_root.find("manifest")
            if manifest is not None:
                item_map = {}
                for item in manifest:
                    item_id = item.get("id", "")
                    href = item.get("href", "")
                    media_type = item.get("media-type", "")
                    item_map[item_id] = (href, media_type)

                for sid in spine_items:
                    if sid in item_map:
                        href, media_type = item_map[sid]
                        if "html" in media_type or "xhtml" in media_type:
                            full_path = os.path.join(opf_dir, href) if opf_dir else href
                            html_files.append(full_path)

        if not html_files:
            # 降级：直接找所有 html/xhtml 文件
            for name in zf.namelist():
                if name.endswith((".html", ".xhtml", ".htm")):
                    html_files.append(name)

        # 3. 提取各文件的文本
        all_text_lines = []
        file_index = {}
        for fpath in sorted(html_files):
            try:
                content = zf.read(fpath).decode("utf-8", errors="replace")
            except Exception:
                try:
                    content = zf.read(fpath).decode("gbk", errors="replace")
                except Exception:
                    continue

            # 提取所有文本（去 HTML 标签）
            texts = re.findall(r'>([^<]+)<', content)
            chapter_lines = []
            for t in texts:
                t = t.strip()
                if t:
                    chapter_lines.append(t)
            if chapter_lines:
                start_line = len(all_text_lines)
                all_text_lines.extend(chapter_lines)
                end_line = len(all_text_lines)
                file_index[fpath] = {"start": start_line, "end": end_line, "lines": len(chapter_lines)}

        # 4. 保存
        text_path = os.path.join(output_dir, "raw_text.txt")
        with open(text_path, "w", encoding="utf-8") as f:
            f.write("\n".join(all_text_lines))

        file_index_path = os.path.join(output_dir, "_file_index.json")
        with open(file_index_path, "w", encoding="utf-8") as f:
            json.dump(file_index, f, ensure_ascii=False, indent=2)

        print(f"✅ 文本提取完成: {text_path}")
        print(f"   共 {len(all_text_lines)} 行文本, {len(html_files)} 个 HTML 文件")
        print(f"   _file_index.json 记录了各 HTML 文件对应的行号范围，辅助章节划分")
        return text_path

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("用法: python step0_epub_to_text.py <epub文件路径> [输出目录]")
        sys.exit(1)
    epub_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "extracted"
    extract_epub(epub_path, output_dir)
