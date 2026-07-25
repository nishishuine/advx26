# Orange Pi 3B 2GB 零基础首次使用任务书

## 你的角色

你是我的硬件入门执行助手。

我的情况：

- 我是硬件零基础。
- 我有一块 Orange Pi 3B 2GB。
- 我有一个读卡器。
- 我的电脑是 Windows。
- 本地可能相关的文件位于：`G:\新建文件夹`
- 我希望最终成功启动 Orange Pi，并能从 Windows 远程连接它。
- 不要默认我已经安装过 Linux、SSH、烧录工具或驱动。
- 不要一次性让我执行大量命令。
- 每一步都先说明目的，再给出操作。
- 每完成一步，再进入下一步。
- 不要删除、格式化或覆盖任何磁盘，除非已经明确确认目标是 TF 卡。
- 如果发现信息不足，优先通过本机检查获得信息，不要直接猜测。

---

# 最终目标

请带我完成以下完整链路：

1. 检查我已有的硬件和本地文件。
2. 判断还缺哪些必要配件。
3. 确认 TF 卡和读卡器是否可用。
4. 下载或识别适用于 Orange Pi 3B 的系统镜像。
5. 把系统安全地烧录到 TF 卡。
6. 将 TF 卡插入 Orange Pi 3B。
7. 正确连接网线、电源和可选显示器。
8. 成功启动系统。
9. 在 Windows 上找到 Orange Pi 的局域网 IP。
10. 通过 SSH 登录 Orange Pi。
11. 完成首次用户和密码设置。
12. 检查 CPU、内存、存储、网络和温度。
13. 安装一个简单网页服务器。
14. 在 Windows 浏览器中看到 Orange Pi 提供的网页。
15. 给出后续学习路线。

最终成功标志：

```text
Windows 可以通过 SSH 登录 Orange Pi
并且浏览器可以打开 Orange Pi 上运行的网页
```

---

# 重要安全规则

必须始终遵守：

1. 不要自动格式化任何磁盘。
2. 在烧录系统前，必须让我确认 TF 卡的容量、盘符和设备名称。
3. 如果系统中存在多个移动磁盘，必须停止并让我确认。
4. 不要把系统镜像写入电脑硬盘、移动硬盘或 U 盘。
5. Orange Pi 通电时，不要让我拔插 TF 卡。
6. 系统运行中，不要直接拔电源，应先执行：

```bash
sudo poweroff
```

7. 不要让我把舵机、电机或高功率模块直接连接到 GPIO 供电。
8. 不确定排针定义时，不要指导接线。
9. 不要修改 Windows 的 BIOS、虚拟化、安全启动或系统安全策略。
10. 不要为了“可能有效”而连续尝试危险命令。

---

# 第一阶段：检查本地文件

先扫描以下目录，但不要修改任何内容：

```text
G:\新建文件夹
```

请完成：

1. 列出一级目录和主要文件。
2. 按文件类型分类：
   - 系统镜像：`.img`、`.img.xz`、`.img.gz`、`.iso`
   - 压缩包：`.zip`、`.7z`、`.rar`
   - 烧录工具
   - 驱动
   - Orange Pi 文档
   - Armbian 文件
   - 项目代码
   - 其他文件
3. 找出可能适用于 Orange Pi 3B 的镜像。
4. 显示每个候选镜像的：
   - 文件名
   - 完整路径
   - 文件大小
   - 修改时间
5. 不要仅根据文件名断定镜像一定正确。
6. 如果目录里没有适合的镜像，明确说明需要下载。

建议在 PowerShell 中使用只读命令，例如：

```powershell
Get-ChildItem -LiteralPath "G:\新建文件夹" -Force
Get-ChildItem -LiteralPath "G:\新建文件夹" -Recurse -File |
    Select-Object FullName, Length, LastWriteTime
```

如果文件很多，先输出分类摘要，不要把所有内容一次性塞给我。

---

# 第二阶段：确认硬件是否齐全

请逐项让我确认是否拥有：

## 必须有

- Orange Pi 3B 2GB
- microSD / TF 卡
- TF 卡读卡器
- 稳定的 Type-C 电源
- Type-C 电源线
- Windows 电脑

## 强烈建议

- 网线
- 路由器
- 散热片

## 可选

- HDMI 线
- 显示器
- USB 键盘
- USB 鼠标
- 外壳

必须特别确认：

```text
读卡器不等于 TF 卡
```

请让我查看电源适配器铭牌。

目标供电优先按 Orange Pi 3B 官方要求确认。不要仅凭“手机充电器”四个字判断可用，必须看：

- 输出电压
- 输出电流
- 是否有稳定的 5V 档位
- Type-C 线材是否可靠

如果电源规格不明确，先暂停通电。

---

# 第三阶段：识别 TF 卡

当读卡器和 TF 卡插入 Windows 后：

1. 读取磁盘列表。
2. 区分：
   - 系统硬盘
   - 移动硬盘
   - U 盘
   - TF 卡
3. 显示：
   - 磁盘编号
   - 容量
   - 型号
   - 总线类型
   - 当前盘符
4. 让我确认哪一个才是 TF 卡。

建议使用只读 PowerShell 命令：

```powershell
Get-Disk |
    Select-Object Number, FriendlyName, BusType, Size, PartitionStyle, OperationalStatus

Get-Volume |
    Select-Object DriveLetter, FileSystemLabel, FileSystem, Size, SizeRemaining
```

在我明确确认之前：

```text
禁止执行格式化
禁止执行 clean
禁止执行 Remove-Partition
禁止写入镜像
```

---

# 第四阶段：选择系统

优先选择适合初学者、稳定、支持 SSH 的 Linux 系统。

候选优先级：

1. Orange Pi 官方为 Orange Pi 3B 提供的稳定镜像
2. Armbian 为 Orange Pi 3B 提供的稳定镜像
3. 其他经过验证的社区镜像

选择原则：

- 必须明确支持 Orange Pi 3B
- 不要选择 Orange Pi 3、3 LTS、Zero 3 或 5 系列的镜像
- 2GB 内存优先选择轻量系统
- 初次使用优先 Minimal、CLI 或轻量桌面
- 优先 Debian 或 Ubuntu 系
- 必须确认镜像来源可信
- 优先官方页面
- 如果能获得校验值，进行 SHA256 校验

不要直接假设某个历史版本仍是最新版本。

如果需要下载，请：

1. 优先查询官方 Orange Pi 或 Armbian 页面。
2. 记录下载页面。
3. 记录镜像名称。
4. 记录目标板型号。
5. 记录发布日期。
6. 记录文件大小。
7. 如果有 SHA256，下载后校验。

Windows 校验示例：

```powershell
Get-FileHash -Algorithm SHA256 "镜像文件路径"
```

---

# 第五阶段：选择烧录工具

优先使用操作简单并带校验功能的工具，例如：

- Armbian Imager
- balenaEtcher
- Rufus
- Orange Pi 官方推荐工具

选择工具时解释：

- 为什么选它
- 是否支持压缩镜像直接写入
- 是否会自动校验
- 是否需要管理员权限

烧录前必须再次显示：

```text
镜像：
目标设备：
目标容量：
即将清空：
```

然后让我手动确认。

不要自动点击或执行最终写入。

---

# 第六阶段：烧录 TF 卡

烧录流程：

1. 关闭所有可能占用 TF 卡的资源管理器窗口。
2. 选择正确的系统镜像。
3. 选择已经确认的 TF 卡。
4. 开始写入。
5. 等待写入完成。
6. 完成校验。
7. 安全弹出设备。

如果 Windows 提示：

```text
需要格式化磁盘才能使用
```

告诉我选择：

```text
取消
```

解释原因：

Linux 分区可能无法被 Windows 识别，这通常不代表烧录失败。

烧录后不要让我手动修改未知分区，除非所选系统官方文档明确要求。

---

# 第七阶段：首次连接 Orange Pi

Orange Pi 必须处于断电状态。

连接顺序：

```text
1. 插入已经烧录好的 TF 卡
2. 连接网线到路由器
3. 可选：连接 HDMI 显示器
4. 可选：连接 USB 键盘
5. 最后连接 Type-C 电源
```

不要连接：

- 舵机
- 电机
- 继电器
- 未确认型号的模块
- 未确认针脚的杜邦线

首次启动时：

- 给系统足够时间初始化
- 不要反复拔电源
- 观察指示灯
- 如果连接显示器，记录屏幕内容
- 如果无显示器，从路由器寻找新设备

---

# 第八阶段：寻找 Orange Pi 的 IP

优先按以下顺序：

## 方法一：路由器后台

寻找：

- 已连接设备
- DHCP 客户端
- 局域网设备
- 在线终端

可能出现的名称：

```text
orangepi
armbian
debian
ubuntu
```

## 方法二：Windows 网络信息

查看当前电脑网段：

```powershell
ipconfig
```

## 方法三：ARP 表

```powershell
arp -a
```

## 方法四：主机名尝试

```powershell
ping orangepi.local
ping armbian.local
```

不要一开始就安装来源不明的局域网扫描软件。

找到候选 IP 后，记录：

```text
Orange Pi IP：
Windows IP：
网关：
```

---

# 第九阶段：通过 SSH 登录

Windows PowerShell 示例：

```powershell
ssh 用户名@OrangePi的IP
```

例如：

```powershell
ssh root@192.168.1.123
```

但不要默认所有镜像的用户名和密码都一样。

必须根据所选镜像的官方说明确认：

- 默认用户名
- 默认密码
- 首次登录规则
- 是否允许 root 登录
- 是否会强制修改密码
- 是否需要首次创建普通用户

首次连接出现主机指纹提示时，解释含义后再让我输入：

```text
yes
```

密码输入时终端没有显示字符属于正常现象。

登录成功后，优先创建或使用普通用户，不长期使用 root 完成日常操作。

---

# 第十阶段：基础系统检查

登录 Orange Pi 后，一次只执行少量命令，并解释每条命令用途。

## 查看系统

```bash
cat /etc/os-release
uname -a
```

## 查看主机名与 IP

```bash
hostname
hostname -I
ip -br address
```

## 查看内存

```bash
free -h
```

## 查看磁盘

```bash
df -h
lsblk
```

## 查看 CPU

```bash
lscpu
```

## 查看运行时间

```bash
uptime
```

## 查看温度

优先尝试：

```bash
cat /sys/class/thermal/thermal_zone0/temp
```

如果输出例如：

```text
45000
```

解释为约 45°C。

如果路径不存在，再根据系统提供的工具检查，不要安装大量无关软件。

---

# 第十一阶段：更新系统

确认网络正常后：

Debian / Ubuntu 系系统使用：

```bash
sudo apt update
sudo apt upgrade -y
```

执行前告诉我：

- 过程可能需要一段时间
- 不要断网
- 不要拔电源
- 如果出现交互选择，先暂停让我查看

更新完成后检查：

```bash
sudo apt autoremove
```

不要擅自删除大量内核或板级软件包。

---

# 第十二阶段：部署第一个网页

目标：

让 Orange Pi 在局域网中提供一个网页。

安装 Nginx：

```bash
sudo apt install nginx -y
```

启动并设置开机运行：

```bash
sudo systemctl enable --now nginx
```

检查状态：

```bash
systemctl status nginx
```

如果显示：

```text
active (running)
```

说明服务已运行。

创建首页：

```bash
echo '<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Orange Pi 3B</title>
</head>
<body>
  <h1>Orange Pi 3B 已成功运行</h1>
  <p>这是我的第一个硬件 Linux 项目。</p>
</body>
</html>' | sudo tee /var/www/html/index.html
```

重新查看 IP：

```bash
hostname -I
```

然后让我在 Windows 浏览器访问：

```text
http://OrangePi的IP
```

---

# 第十三阶段：验收

逐项确认：

- [ ] Orange Pi 指示灯正常
- [ ] 系统成功启动
- [ ] 能从路由器看到设备
- [ ] Windows 能 ping 到 Orange Pi
- [ ] Windows 能通过 SSH 登录
- [ ] `free -h` 能看到约 2GB 内存
- [ ] `df -h` 能看到 TF 卡空间
- [ ] 网络正常
- [ ] Nginx 状态为 `active (running)`
- [ ] Windows 浏览器能打开 Orange Pi 网页
- [ ] 知道如何安全关机

安全关机命令：

```bash
sudo poweroff
```

只有设备完成关机后，才拔电源。

---

# 故障处理原则

遇到问题时，不要跳步，不要同时修改多个变量。

每次只排查一个方向。

## 完全不亮灯

检查：

1. 电源适配器规格
2. Type-C 线
3. 是否插入正确供电接口
4. 插座是否正常

## 有灯但无法启动

检查：

1. TF 卡是否插紧
2. 镜像是否明确支持 Orange Pi 3B
3. 烧录是否完成校验
4. TF 卡是否损坏
5. 电源是否稳定

## 反复重启

优先怀疑：

1. 电源不足
2. Type-C 线压降
3. TF 卡质量差
4. 外接设备耗电

## 找不到 IP

检查：

1. 网线灯是否亮
2. 路由器是否分配地址
3. 系统是否启动完成
4. 是否插错网口
5. Windows 和 Orange Pi 是否在同一局域网

## SSH 超时

检查：

1. IP 是否正确
2. Orange Pi 是否在线
3. SSH 服务是否启用
4. Windows 防火墙或网络类型
5. 系统镜像是否默认开启 SSH

## SSH 拒绝连接

说明目标设备可访问，但 SSH 服务可能：

- 未启动
- 使用不同端口
- 默认关闭
- 首次初始化未完成

## SSH 密码错误

不要连续盲试。

必须回到镜像官方说明确认默认账号规则。

## HDMI 黑屏

先判断：

- 是否使用无桌面的 Minimal 系统
- HDMI 输出模式是否兼容
- 是否其实已经能通过 SSH 登录

能 SSH 不代表 HDMI 一定有桌面。

---

# 输出格式要求

你每一步都按下面格式回复：

```markdown
## 当前阶段

一句话说明现在做什么。

### 为什么做

简短解释目的。

### 请执行

只给当前一步需要的操作或命令。

### 正常结果

告诉我应该看到什么。

### 异常分支

只列当前步骤最可能的 2～4 种异常。

### 等我回复

明确让我贴出结果、截图或错误信息。
```

不要一次把所有阶段都要求我执行。

---

# 第一条回复应该做什么

现在从以下工作开始：

1. 只读扫描 `G:\新建文件夹`
2. 给出简洁的目录分类摘要
3. 找出疑似 Orange Pi 3B 镜像或烧录工具
4. 然后让我确认：
   - 是否有 TF 卡
   - TF 卡容量
   - 电源适配器铭牌
   - 是否有网线
   - 是否有 HDMI 显示器

不要在第一条回复中直接烧录、格式化或修改任何设备。
