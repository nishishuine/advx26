import type { Locale } from "../i18n/LanguageProvider";

export type TutorialVisual = {
  src: string;
  alt: string;
  title: string;
  caption: string;
  badge:
    | "实拍"
    | "示意图"
    | "Photo"
    | "Diagram"
    | "Бодит зураг"
    | "Схем";
  objectPosition?: string;
  rotate?: boolean;
  contain?: boolean;
};

type VisualCopy = Pick<TutorialVisual, "alt" | "title" | "caption" | "badge">;

type VisualDefinition = Omit<
  TutorialVisual,
  "alt" | "title" | "caption" | "badge"
> & {
  copy: Record<Locale, VisualCopy>;
};

const hardwareKit: VisualDefinition = {
  src: "/assets/orange-pi/beginner-hardware-kit.png",
  copy: {
    zh: {
      alt: "一套完成 Orange Pi 首次启动所需的硬件，包括电脑、TF 卡、读卡器、Orange Pi 主板、Type-C 电源和网线",
      title: "先把这 6 样东西放到桌面上",
      caption:
        "电脑、TF 卡、读卡器、Orange Pi 3B、5V/3A Type-C 电源和网线。少一样都先不要开始。",
      badge: "示意图",
    },
    en: {
      alt: "The complete hardware kit for the first Orange Pi boot: a computer, TF card, card reader, Orange Pi board, Type-C power supply, and Ethernet cable",
      title: "Put these 6 items on the table first",
      caption:
        "Computer, TF card, card reader, Orange Pi 3B, a stable 5V/3A Type-C power supply, and an Ethernet cable. Do not start until all six are ready.",
      badge: "Diagram",
    },
    mn: {
      alt: "Orange Pi-г анх удаа асаахад шаардлагатай компьютер, TF карт, карт уншигч, Orange Pi хавтан, Type-C тэжээл, сүлжээний кабель бүхий иж бүрдэл",
      title: "Эхлээд эдгээр 6 зүйлийг ширээн дээрээ бэлд",
      caption:
        "Компьютер, TF карт, карт уншигч, Orange Pi 3B, тогтвортой 5V/3A Type-C тэжээл, сүлжээний кабель. Зургааг бүгдийг нь бэлдээгүй бол эхлэх хэрэггүй.",
      badge: "Схем",
    },
  },
  contain: true,
};

const flashingSetup: VisualDefinition = {
  src: "/assets/orange-pi/tf-card-reader-flashing-setup.png",
  copy: {
    zh: {
      alt: "TF 卡插入 USB 读卡器并连接电脑，旁边的 Orange Pi 主板保持断电",
      title: "烧录时只连接电脑、读卡器和 TF 卡",
      caption:
        "TF 卡先插进读卡器，读卡器再接电脑。此时 Orange Pi 放在一旁，不能接电，也不用接电脑。",
      badge: "示意图",
    },
    en: {
      alt: "A TF card inserted into a USB card reader connected to the computer, while the Orange Pi board beside it remains powered off",
      title: "Connect only the computer, card reader, and TF card while flashing",
      caption:
        "Insert the TF card into the card reader, then connect the reader to the computer. Keep the Orange Pi aside, powered off and disconnected from the computer.",
      badge: "Diagram",
    },
    mn: {
      alt: "TF картыг USB карт уншигчид хийж компьютерт холбосон бөгөөд хажуугийн Orange Pi хавтан тэжээлгүй байна",
      title: "Систем бичих үед зөвхөн компьютер, карт уншигч, TF картыг холбо",
      caption:
        "Эхлээд TF картыг карт уншигчид хийж, дараа нь уншигчийг компьютерт холбоно. Энэ үед Orange Pi-г тусад нь, тэжээлгүй байлгана; компьютерт холбох шаардлагагүй.",
      badge: "Схем",
    },
  },
  contain: true,
};

const boardFront: VisualDefinition = {
  src: "/assets/orange-pi/orange-pi-3b-front-user.jpg",
  copy: {
    zh: {
      alt: "用户实拍的 Orange Pi 3B 主板正面，可见网口、USB、HDMI、Type-C 和 GPIO 排针",
      title: "你手里的 Orange Pi 3B 正面",
      caption:
        "这是本项目真实使用的板卡。先认清网口、USB、HDMI 和 Type-C 供电口，暂时不要通电。",
      badge: "实拍",
    },
    en: {
      alt: "A real photo of the front of the Orange Pi 3B board, showing Ethernet, USB, HDMI, Type-C, and GPIO headers",
      title: "The front of the Orange Pi 3B in your hands",
      caption:
        "This is the actual board used in this project. Locate the Ethernet, USB, HDMI, and Type-C power ports first. Do not power it on yet.",
      badge: "Photo",
    },
    mn: {
      alt: "Orange Pi 3B хавтангийн урд талыг бодитоор авсан зураг; Ethernet, USB, HDMI, Type-C болон GPIO зүүнүүд харагдана",
      title: "Таны гарт байгаа Orange Pi 3B-ийн урд тал",
      caption:
        "Энэ бол төсөлд бодитоор ашигласан хавтан. Ethernet, USB, HDMI болон Type-C тэжээлийн портуудыг эхлээд олж тань. Одоохондоо тэжээл бүү холбо.",
      badge: "Бодит зураг",
    },
  },
  objectPosition: "center 73%",
  rotate: true,
};

const boardBack: VisualDefinition = {
  src: "/assets/orange-pi/orange-pi-3b-back-user.jpg",
  copy: {
    zh: {
      alt: "用户实拍的 Orange Pi 3B 主板背面，可见右侧边缘的 TF 卡槽、排线接口与焊点区域",
      title: "翻到背面，找到右侧边缘的 TF 卡槽",
      caption:
        "烧录并安全弹出以后，TF 卡才从读卡器取出，再装进这里。板卡必须保持完全断电。",
      badge: "实拍",
    },
    en: {
      alt: "A real photo of the back of the Orange Pi 3B board, showing the TF card slot on the right edge, ribbon connectors, and solder points",
      title: "Turn the board over and find the TF card slot on the right edge",
      caption:
        "Remove the TF card from the reader and insert it here only after flashing is complete and the card has been safely ejected. The board must remain completely powered off.",
      badge: "Photo",
    },
    mn: {
      alt: "Orange Pi 3B хавтангийн ар талыг бодитоор авсан зураг; баруун захын TF картны үүр, туузан кабелийн холбогч болон гагнаасны хэсэг харагдана",
      title: "Хавтанг эргүүлээд баруун захын TF картны үүрийг ол",
      caption:
        "Системийг бичиж дуусаад картыг аюулгүй салгасны дараа л TF картыг уншигчаас гаргаж энд хийнэ. Хавтан бүрэн тэжээлгүй байх ёстой.",
      badge: "Бодит зураг",
    },
  },
  objectPosition: "center 72%",
};

const systemPath: VisualDefinition = {
  src: "/assets/orange-pi/orange-pi-system-path.png",
  copy: {
    zh: {
      alt: "电脑、读卡器和 TF 卡、Orange Pi、路由器与浏览器依次连接的完整链路示意图",
      title: "整条链路只有一个方向",
      caption:
        "电脑把系统写进 TF 卡；Orange Pi 从卡启动；路由器给它地址；浏览器最后访问它提供的网页。",
      badge: "示意图",
    },
    en: {
      alt: "A complete path diagram connecting the computer, card reader and TF card, Orange Pi, router, and browser in order",
      title: "The whole path moves in one direction",
      caption:
        "The computer writes the system to the TF card; the Orange Pi boots from it; the router assigns an address; and the browser finally opens the page served by the board.",
      badge: "Diagram",
    },
    mn: {
      alt: "Компьютер, карт уншигч ба TF карт, Orange Pi, чиглүүлэгч, веб хөтчийг дарааллаар холбосон бүтэн урсгалын схем",
      title: "Бүх урсгал нэг чиглэлтэй",
      caption:
        "Компьютер системийг TF картанд бичнэ; Orange Pi картаас асна; чиглүүлэгч IP хаяг өгнө; эцэст нь веб хөтөч хавтангийн үзүүлж буй хуудсыг нээнэ.",
      badge: "Схем",
    },
  },
  contain: true,
};

type VisualId =
  | "hardware-kit"
  | "flashing-setup"
  | "board-front"
  | "board-back"
  | "system-path";

const visualDefinitions: Record<VisualId, VisualDefinition> = {
  "hardware-kit": hardwareKit,
  "flashing-setup": flashingSetup,
  "board-front": boardFront,
  "board-back": boardBack,
  "system-path": systemPath,
};

const buildStepVisuals: Record<string, VisualId[]> = {
  "prepare-kit": ["hardware-kit", "board-front"],
  "choose-image": ["system-path"],
  "identify-card": ["flashing-setup"],
  "flash-card": ["flashing-setup"],
  "first-boot": ["board-back", "board-front"],
  "find-ip": [],
  "first-ssh": [],
  "verify-system": ["board-front"],
  "install-nginx": ["system-path"],
  "browser-acceptance": ["system-path"],
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

function localizeVisual(id: VisualId, locale: Locale): TutorialVisual {
  const { copy, ...visual } = visualDefinitions[id];
  return { ...visual, ...copy[locale] };
}

function localizeVisuals(ids: VisualId[], locale: Locale) {
  return ids.map((id) => localizeVisual(id, locale));
}

export function getBuildStepVisuals(stepId: string, locale: Locale) {
  return localizeVisuals(
    buildStepVisuals[stepId] ?? ["system-path"],
    locale,
  );
}

export function getOrangePiNodeVisuals(nodeId: string, locale: Locale) {
  if (flashingNodeIds.has(nodeId)) {
    return localizeVisuals(["flashing-setup"], locale);
  }
  if (boardNodeIds.has(nodeId)) {
    return localizeVisuals(
      nodeId === "orange-pi-board"
        ? ["board-front", "board-back"]
        : ["board-front"],
      locale,
    );
  }
  if (systemNodeIds.has(nodeId)) {
    return localizeVisuals(["system-path"], locale);
  }
  return localizeVisuals(["system-path"], locale);
}

export function getOrangePiEdgeVisuals(
  sourceId: string,
  targetId: string,
  locale: Locale,
) {
  if (flashingNodeIds.has(sourceId) || flashingNodeIds.has(targetId)) {
    return localizeVisuals(["flashing-setup"], locale);
  }
  if (boardNodeIds.has(sourceId) || boardNodeIds.has(targetId)) {
    return localizeVisuals(["board-back"], locale);
  }
  return localizeVisuals(["system-path"], locale);
}

export function getOrangePiOverviewVisuals(locale: Locale) {
  return localizeVisuals(["system-path"], locale);
}
