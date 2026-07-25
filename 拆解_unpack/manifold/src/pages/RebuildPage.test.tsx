// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  Routes,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { graphRepository } from "../domain/repository";
import { LanguageProvider } from "../i18n/LanguageProvider";
import { RebuildPage } from "./RebuildPage";

vi.mock("@xyflow/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xyflow/react")>();

  return {
    ...actual,
    ReactFlow: ({
      nodes = [],
      onNodeClick,
      "aria-label": ariaLabel,
    }: {
      nodes?: Array<{
        id: string;
        data: {
          index: number;
          title: string;
          current: boolean;
          complete: boolean;
        };
      }>;
      onNodeClick?: (event: MouseEvent, node: unknown) => void;
      "aria-label"?: string;
    }) => (
      <div aria-label={ariaLabel}>
        {nodes.map((node) => (
          <button
            key={node.id}
            type="button"
            aria-current={node.data.current ? "step" : undefined}
            data-complete={node.data.complete ? "true" : "false"}
            onClick={(event) =>
              onNodeClick?.(event.nativeEvent, node)
            }
          >
            {`第 ${node.data.index} 步：${node.data.title}`}
          </button>
        ))}
      </div>
    ),
  };
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

function renderRunbook(step = 1) {
  return render(
    <MemoryRouter
      initialEntries={[
        `/rebuild/orange-pi-first-boot?step=${step}`,
      ]}
    >
      <Routes>
        <Route path="/rebuild/:caseId" element={<RebuildPage />} />
        <Route
          path="/explore/:caseId/:nodeId"
          element={<ExploreDestination />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

async function getStepInfo(stepId: string) {
  const guide = await graphRepository.getBuildGuide(
    "orange-pi-first-boot",
  );
  if (!guide) throw new Error("Missing Orange Pi build guide");
  const index = guide.steps.findIndex((step) => step.id === stepId);
  if (index < 0) throw new Error(`Missing step ${stepId}`);
  return {
    guide,
    step: guide.steps[index],
    number: index + 1,
  };
}

function ExploreDestination() {
  const { caseId, nodeId } = useParams();
  const [searchParams] = useSearchParams();
  return (
    <div>
      explore:{caseId}:{nodeId}:{searchParams.get("view")}:
      {searchParams.get("goal")}
    </div>
  );
}

describe("RebuildPage executable runbook", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("一次展示一个可执行步骤，并可进入下一步", async () => {
    renderRunbook();
    const guide = await graphRepository.getBuildGuide(
      "orange-pi-first-boot",
    );

    expect(
      await screen.findByRole("heading", {
        name: "先把 6 样东西放到桌面上",
      }),
    ).toBeTruthy();
    expect(
      screen.getByAltText(
        "一套完成 Orange Pi 首次启动所需的硬件，包括电脑、TF 卡、读卡器、Orange Pi 主板、Type-C 电源和网线",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "开始前确认" }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "照着做" })).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "做到这些才算完成" }),
    ).toBeTruthy();
    expect(screen.getByLabelText("打造步骤链路")).toBeTruthy();
    expect(
      screen.getAllByRole("button", { name: /^第 \d+ 步：/ }),
    ).toHaveLength(guide?.steps.length ?? 0);

    const chooseImage = await getStepInfo("choose-image");
    const chooseImageButton = `第 ${chooseImage.number} 步：${chooseImage.step.title}`;
    fireEvent.click(
      screen.getByRole("button", {
        name: chooseImageButton,
      }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "先在电脑下载烧录工具并选择系统",
      }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("button", {
          name: chooseImageButton,
        })
        .getAttribute("aria-current"),
    ).toBe("step");
  });

  it("从找 IP 到 SSH 会保留设备信息，并阻止无效输入生成命令", async () => {
    const findIp = await getStepInfo("find-ip");
    renderRunbook(findIp.number);

    expect(
      await screen.findByRole("heading", {
        name: "确认在同一局域网，再找到 Orange Pi 的 IP",
      }),
    ).toBeTruthy();
    expect(
      screen.getByLabelText("PowerShell 里关键输出长这样"),
    ).toBeTruthy();
    expect(
      screen.getByLabelText("局域网真实连接关系"),
    ).toBeTruthy();

    const ipInput = screen.getByPlaceholderText("例如 192.168.1.123");
    const unresolvedCommand = screen.getByRole("button", {
      name: "Test-NetConnection IP待填写 -Port 22",
    }) as HTMLButtonElement;
    expect(unresolvedCommand.disabled).toBe(true);

    fireEvent.change(ipInput, {
      target: { value: "http://192.168.1.42" },
    });
    expect(ipInput.getAttribute("aria-invalid")).toBe("true");
    expect(unresolvedCommand.disabled).toBe(true);

    fireEvent.change(ipInput, { target: { value: "192.168.1.42" } });
    expect(ipInput.getAttribute("aria-invalid")).toBe("false");
    expect(
      (
        screen.getByRole("button", {
          name: "Test-NetConnection 192.168.1.42 -Port 22",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);

    fireEvent.click(
      screen.getByRole("button", {
        name: /下一步 · 第一次用 SSH 远程登录/,
      }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "第一次用 SSH 远程登录，并确认登录成功",
      }),
    ).toBeTruthy();
    expect(
      (screen.getByLabelText("Orange Pi IP") as HTMLInputElement).value,
    ).toBe("192.168.1.42");

    const usernameInput = screen.getByPlaceholderText("例如 jie1");
    fireEvent.change(usernameInput, { target: { value: "1jie" } });
    expect(usernameInput.getAttribute("aria-invalid")).toBe("true");
    fireEvent.change(usernameInput, { target: { value: "Jie1" } });
    expect(usernameInput.getAttribute("aria-invalid")).toBe("false");

    expect(
      (
        screen.getByRole("button", {
          name: "ssh root@192.168.1.42",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
    expect(
      screen.getAllByRole("button", {
        name: "ssh jie1@192.168.1.42",
      }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByLabelText("第一次 SSH 登录的屏幕变化"),
    ).toBeTruthy();
  });

  it("可以从打造页直接返回同一对象的拆开页", async () => {
    renderRunbook();

    fireEvent.click(
      await screen.findByRole("link", { name: "拆开看关系" }),
    );

    expect(
      screen.getByText(
        "explore:orange-pi-first-boot:orange-pi-system:structure:learn",
      ),
    ).toBeTruthy();
  });

  it("烧录步骤显示正确连接图，并且页面不再出现旧品牌", async () => {
    const identifyCard = await getStepInfo("identify-card");
    renderRunbook(identifyCard.number);

    expect(
      await screen.findByRole("heading", {
        name: "只识别这张 TF 卡，先不要写入",
      }),
    ).toBeTruthy();
    expect(
      screen.getByAltText(
        "TF 卡插入 USB 读卡器并连接电脑，旁边的 Orange Pi 主板保持断电",
      ),
    ).toBeTruthy();
    expect(screen.getByText("烧录，不是复制文件")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "manifold" }),
    ).toBeTruthy();
  });

  it("断电装卡步骤同时展示用户提供的主板正反面实拍", async () => {
    const firstBoot = await getStepInfo("first-boot");
    renderRunbook(firstBoot.number);

    expect(
      await screen.findByRole("heading", {
        name: "安全弹出后，断电装卡再启动",
      }),
    ).toBeTruthy();
    expect(
      screen.getByAltText(
        "用户实拍的 Orange Pi 3B 主板正面，可见网口、USB、HDMI、Type-C 和 GPIO 排针",
      ),
    ).toBeTruthy();
    expect(
      screen.getByAltText(
        "用户实拍的 Orange Pi 3B 主板背面，可见右侧边缘的 TF 卡槽、排线接口与焊点区域",
      ),
    ).toBeTruthy();
  });

  it("英文和蒙古文切换后保持同一个打造步骤", async () => {
    render(
      <LanguageProvider>
        <MemoryRouter
          initialEntries={[
            "/rebuild/orange-pi-first-boot?step=1",
          ]}
        >
          <Routes>
            <Route
              path="/rebuild/:caseId"
              element={<RebuildPage />}
            />
          </Routes>
        </MemoryRouter>
      </LanguageProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "先把 6 样东西放到桌面上",
      }),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "切换为英文" }),
    );
    expect(
      await screen.findByRole("heading", {
        name: "Put these 6 items on the table first",
      }),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Switch to Mongolian" }),
    );
    expect(
      await screen.findByRole("heading", {
        name: "Эхлээд эдгээр 6 зүйлийг ширээн дээрээ тавина",
      }),
    ).toBeTruthy();
  });
});
