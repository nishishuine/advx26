// @vitest-environment jsdom

import { act } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  Routes,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomePage } from "./HomePage";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

function ResultPage({ destination }: { destination: "explore" | "rebuild" }) {
  const { caseId } = useParams();
  const [searchParams] = useSearchParams();
  return (
    <div>
      <span>destination:{destination};</span>
      case:{caseId};from:{searchParams.get("from")}
    </div>
  );
}

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/explore/:caseId"
          element={<ResultPage destination="explore" />}
        />
        <Route
          path="/rebuild/:caseId"
          element={<ResultPage destination="rebuild" />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("HomePage conversation entry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("只呈现核心输入、图片、语音与确认入口", () => {
    renderHome();

    expect(
      screen.getByRole("heading", { name: "你要做些什么" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "上传图片" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "开始语音输入" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "确认并生成关系图" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /拆开/ }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: /打造/ }).getAttribute("aria-pressed"),
    ).toBe("false");
    expect(screen.queryByText("LOCAL MVP")).toBeNull();
    expect(screen.queryByText(/静态关系数据/)).toBeNull();
  });

  it("默认选择拆开，提交后进入物体关系图", () => {
    renderHome();
    const input = screen.getByLabelText("描述想要拆解的对象");
    const submit = screen.getByRole("button", {
      name: "确认并生成关系图",
    });

    expect((submit as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(input, {
      target: { value: "怎样让 Orange Pi 3B 启动并发布第一个网页？" },
    });
    expect((submit as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(submit);

    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByText("destination:explore;")).toBeTruthy();
    expect(
      screen.getByText("case:orange-pi-first-boot;from:conversation"),
    ).toBeTruthy();
  });

  it("选择打造后进入从零到一教程", () => {
    renderHome();
    const buildMode = screen.getByRole("button", { name: /打造/ });

    fireEvent.click(buildMode);
    expect(buildMode.getAttribute("aria-pressed")).toBe("true");
    expect(
      screen.getByRole("button", { name: /拆开/ }).getAttribute("aria-pressed"),
    ).toBe("false");

    fireEvent.change(screen.getByLabelText("描述想要打造的对象"), {
      target: { value: "从零打造一台可以发布网页的 Orange Pi 3B" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "确认并开始打造" }),
    );

    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByText("destination:rebuild;")).toBeTruthy();
    expect(
      screen.getByText("case:orange-pi-first-boot;from:conversation"),
    ).toBeTruthy();
  });

  it("中文输入法组词时按下回车不会误提交", () => {
    renderHome();
    const input = screen.getByLabelText("描述想要拆解的对象");
    fireEvent.change(input, {
      target: { value: "Orange Pi 如何连接网络？" },
    });

    fireEvent.keyDown(input, {
      key: "Enter",
      code: "Enter",
      isComposing: true,
    });
    act(() => vi.advanceTimersByTime(600));

    expect(
      screen.queryByText(
        "case:orange-pi-first-boot;from:conversation",
      ),
    ).toBeNull();
  });
});
