export type TutorialVisual = {
  src: string;
  alt: string;
  title: string;
  caption: string;
  badge: "实拍" | "示意图";
  objectPosition?: string;
  rotate?: boolean;
  contain?: boolean;
};

const hardwareKit: TutorialVisual = {
  src: "/assets/orange-pi/beginner-hardware-kit.png",
  alt: "一套完成 Orange Pi 首次启动所需的硬件，包括电脑、TF 卡、读卡器、Orange Pi 主板、Type-C 电源和网线",
  title: "先把这 6 样东西放到桌面上",
  caption:
    "电脑、TF 卡、读卡器、Orange Pi 3B、5V/3A Type-C 电源和网线。少一样都先不要开始。",
  badge: "示意图",
  contain: true,
};

const flashingSetup: TutorialVisual = {
  src: "/assets/orange-pi/tf-card-reader-flashing-setup.png",
  alt: "TF 卡插入 USB 读卡器并连接电脑，旁边的 Orange Pi 主板保持断电",
  title: "烧录时只连接电脑、读卡器和 TF 卡",
  caption:
    "TF 卡先插进读卡器，读卡器再接电脑。此时 Orange Pi 放在一旁，不能接电，也不用接电脑。",
  badge: "示意图",
  contain: true,
};

const boardFront: TutorialVisual = {
  src: "/assets/orange-pi/orange-pi-3b-front-user.jpg",
  alt: "用户实拍的 Orange Pi 3B 主板正面，可见网口、USB、HDMI、Type-C 和 GPIO 排针",
  title: "你手里的 Orange Pi 3B 正面",
  caption:
    "这是本项目真实使用的板卡。先认清网口、USB、HDMI 和 Type-C 供电口，暂时不要通电。",
  badge: "实拍",
  objectPosition: "center 73%",
  rotate: true,
};

const boardBack: TutorialVisual = {
  src: "/assets/orange-pi/orange-pi-3b-back-user.jpg",
  alt: "用户实拍的 Orange Pi 3B 主板背面，可见右侧边缘的 TF 卡槽、排线接口与焊点区域",
  title: "翻到背面，找到右侧边缘的 TF 卡槽",
  caption:
    "烧录并安全弹出以后，TF 卡才从读卡器取出，再装进这里。板卡必须保持完全断电。",
  badge: "实拍",
  objectPosition: "center 72%",
};

const systemPath: TutorialVisual = {
  src: "/assets/orange-pi/orange-pi-system-path.png",
  alt: "电脑、读卡器和 TF 卡、Orange Pi、路由器与浏览器依次连接的完整链路示意图",
  title: "整条链路只有一个方向",
  caption:
    "电脑把系统写进 TF 卡；Orange Pi 从卡启动；路由器给它地址；浏览器最后访问它提供的网页。",
  badge: "示意图",
  contain: true,
};

const buildStepVisuals: Record<string, TutorialVisual[]> = {
  "prepare-kit": [hardwareKit, boardFront],
  "choose-image": [systemPath],
  "identify-card": [flashingSetup],
  "flash-card": [flashingSetup],
  "first-boot": [boardBack, boardFront],
  "find-ip": [],
  "first-ssh": [],
  "verify-system": [boardFront],
  "install-nginx": [systemPath],
  "browser-acceptance": [systemPath],
};

const flashingNodeIds = new Set([
  "windows-workbench",
  "boot-storage",
  "disk-tools",
  "image-writer",
  "system-image",
  "card-reader",
  "tf-card",
  "linux-filesystem",
  "get-disk-command",
  "get-volume-command",
  "manual-disk-confirm",
  "board-match",
  "image-file",
  "sha256-check",
]);

const boardNodeIds = new Set([
  "orange-pi-host",
  "orange-pi-board",
  "type-c-power",
  "boot-chain",
  "linux-system",
  "read-tf",
  "load-kernel",
  "start-userspace",
]);

const systemNodeIds = new Set([
  "orange-pi-system",
  "network-access",
  "web-result",
  "ethernet-router",
  "dhcp-address",
  "ssh-service",
  "remote-shell",
  "nginx-package",
  "systemd-service",
  "page-path",
  "browser-acceptance",
  "ssh-command",
  "host-fingerprint",
  "login-shell",
  "index-html",
  "http-response",
  "visible-page",
  "windows-clients",
]);

export function getBuildStepVisuals(stepId: string) {
  return buildStepVisuals[stepId] ?? [systemPath];
}

export function getOrangePiNodeVisuals(nodeId: string) {
  if (flashingNodeIds.has(nodeId)) return [flashingSetup];
  if (boardNodeIds.has(nodeId)) {
    return nodeId === "orange-pi-board" ? [boardFront, boardBack] : [boardFront];
  }
  if (systemNodeIds.has(nodeId)) return [systemPath];
  return [systemPath];
}

export function getOrangePiEdgeVisuals(sourceId: string, targetId: string) {
  if (flashingNodeIds.has(sourceId) || flashingNodeIds.has(targetId)) {
    return [flashingSetup];
  }
  if (boardNodeIds.has(sourceId) || boardNodeIds.has(targetId)) {
    return [boardBack];
  }
  return [systemPath];
}

export const orangePiOverviewVisuals = [systemPath];
