// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  Routes,
  useParams,
} from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExplorerPage } from "./ExplorerPage";

vi.mock("@xyflow/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xyflow/react")>();

  return {
    ...actual,
    ReactFlow: () => <div data-testid="relationship-map" />,
  };
});

function BuildDestination() {
  const { caseId } = useParams();
  return <div>build:{caseId}</div>;
}

describe("ExplorerPage mode navigation", () => {
  afterEach(() => {
    cleanup();
  });

  it("可以从拆开页直接进入同一对象的打造页", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/explore/orange-pi-first-boot?view=structure&goal=learn",
        ]}
      >
        <Routes>
          <Route path="/explore/:caseId" element={<ExplorerPage />} />
          <Route
            path="/explore/:caseId/:nodeId"
            element={<ExplorerPage />}
          />
          <Route
            path="/rebuild/:caseId"
            element={<BuildDestination />}
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(
      await screen.findByRole("link", { name: "开始打造" }),
    );

    expect(
      screen.getByText("build:orange-pi-first-boot"),
    ).toBeTruthy();
  });

  it("拆开页右侧先展示完整链路图，并且不再出现旧品牌", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/explore/orange-pi-first-boot/orange-pi-system?view=structure",
        ]}
      >
        <Routes>
          <Route
            path="/explore/:caseId/:nodeId"
            element={<ExplorerPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByAltText(
        "电脑、读卡器和 TF 卡、Orange Pi、路由器与浏览器依次连接的完整链路示意图",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "manifold" }),
    ).toBeTruthy();
  });

  it("点开主板节点时展示对应实拍图", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/explore/orange-pi-first-boot/orange-pi-system?view=structure&selected=orange-pi-host",
        ]}
      >
        <Routes>
          <Route
            path="/explore/:caseId/:nodeId"
            element={<ExplorerPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Orange Pi 主机与供电",
      }),
    ).toBeTruthy();
    expect(
      screen.getByAltText(
        "用户实拍的 Orange Pi 3B 主板正面，可见网口、USB、HDMI、Type-C 和 GPIO 排针",
      ),
    ).toBeTruthy();
  });
});
