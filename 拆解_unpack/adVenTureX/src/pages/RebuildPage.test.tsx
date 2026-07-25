// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
      </Routes>
    </MemoryRouter>,
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

    expect(
      await screen.findByRole("heading", {
        name: "把真正需要的东西放到桌面上",
      }),
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
    ).toHaveLength(9);

    fireEvent.click(
      screen.getByRole("button", {
        name: "第 2 步：锁定一个镜像和一个烧录工具",
      }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "锁定一个镜像和一个烧录工具",
      }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("button", {
          name: "第 2 步：锁定一个镜像和一个烧录工具",
        })
        .getAttribute("aria-current"),
    ).toBe("step");
  });

  it("保存设备信息并自动生成可执行的 SSH 命令", async () => {
    renderRunbook(6);

    expect(
      await screen.findByRole("heading", {
        name: "第一次 SSH 登录并创建自己的用户",
      }),
    ).toBeTruthy();

    const unresolvedCommand = screen.getByRole("button", {
      name: "ssh root@IP待填写",
    }) as HTMLButtonElement;
    expect(unresolvedCommand.disabled).toBe(true);

    fireEvent.change(
      screen.getByPlaceholderText("例如 192.168.1.123"),
      { target: { value: "192.168.1.42" } },
    );
    fireEvent.change(screen.getByPlaceholderText("例如 jie"), {
      target: { value: "Jie" },
    });

    expect(
      (
        screen.getByRole("button", {
          name: "ssh root@192.168.1.42",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
    expect(
      screen.getByRole("button", {
        name: "ssh jie@192.168.1.42",
      }),
    ).toBeTruthy();
  });
});
