#!/usr/bin/env python3
"""给 8 本书的 .bookpack 替换封面：换掉 cover.svg，写入真实封面图，更新 book.json。
canonical 路径处理后再同步覆盖所有重复副本。"""
import zipfile, json, shutil, os

DL = "/Users/larkinli/Downloads"
ROOT = "/Users/larkinli/Downloads/advx26项目"

# 书名 -> (封面图, canonical 书包, [其它副本])
BOOKS = {
    "茶花女": (f"{DL}/茶花女封面.jpg", f"{ROOT}/茶花女_work/output/茶花女.bookpack", []),
    "红楼梦": (f"{DL}/红楼梦封面.jpeg", f"{ROOT}/红楼梦.bookpack",
              [f"{ROOT}/红楼梦_work/output/红楼梦.bookpack"]),
    "霍乱时期的爱情": (f"{DL}/霍乱时期的爱情封面.webp", f"{ROOT}/霍乱时期的爱情.bookpack",
              [f"{ROOT}/霍乱时期的爱情_work/output/霍乱时期的爱情.bookpack"]),
    "了不起的盖茨比": (f"{DL}/了不起的盖茨比封面.jpg", f"{ROOT}/reader/了不起的盖茨比.bookpack",
              [f"{ROOT}/了不起的盖茨比_work/output/了不起的盖茨比.bookpack"]),
    "水浒传": (f"{DL}/水浒传封面.jpg", f"{ROOT}/水浒传.bookpack",
              [f"{ROOT}/水浒传_work/output/水浒传.bookpack"]),
    "月亮和六便士": (f"{DL}/月亮和六便士封面.jpeg", f"{ROOT}/月亮和六便士_work/output/月亮和六便士.bookpack", []),
    "长日将尽": (f"{DL}/长日将尽封面.jpg", f"{ROOT}/长日将尽.bookpack", []),
    "生命中不能承受之轻": (f"{DL}/不能承受的生命之轻封面.png", f"{ROOT}/reader/生命中不能承受之轻.bookpack",
              [f"{ROOT}/生命中不能承受之轻_work/output/生命中不能承受之轻.bookpack"]),
}
EXT2NAME = {"jpg": "cover.jpg", "jpeg": "cover.jpg", "png": "cover.png", "webp": "cover.webp"}

for title, (img, pack, copies) in BOOKS.items():
    ext = img.rsplit(".", 1)[-1].lower()
    cover_name = EXT2NAME[ext]
    tmp = pack + ".tmp"
    with zipfile.ZipFile(pack) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        bj = json.loads(zin.read("book.json"))
        old_cover = bj.get("cover") or "cover.svg"
        bj["cover"] = cover_name
        for item in zin.infolist():
            if item.filename in (old_cover, "book.json", cover_name):
                continue
            zout.writestr(item, zin.read(item.filename))
        zout.writestr("book.json", json.dumps(bj, ensure_ascii=False, indent=2))
        with open(img, "rb") as f:
            zout.writestr(cover_name, f.read())
    os.replace(tmp, pack)
    for c in copies:
        shutil.copyfile(pack, c)
    print(f"✓ {title}: {old_cover} → {cover_name}  ({os.path.getsize(pack)//1024} KB, 副本 {len(copies)} 个)")
print("全部完成")
