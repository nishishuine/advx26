// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RebuildPage } from "./RebuildPage";

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
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: vi.fn(),
    });
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

    fireEvent.click(screen.getByRole("button", { name: "下一步" }));

    expect(
      await screen.findByRole("heading", {
        name: "锁定一个镜像和一个烧录工具",
      }),
    ).toBeTruthy();
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth",
    });
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
