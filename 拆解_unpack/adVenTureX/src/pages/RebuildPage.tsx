import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  MarkerType,
  ReactFlow,
  type Edge,
  type NodeMouseHandler,
} from "@xyflow/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Circle,
  CircleAlert,
  Clock3,
  Copy,
  Wrench,
} from "lucide-react";
import {
  BuildStepFlowNode,
  type BuildStepNode,
} from "../components/BuildStepFlowNode";
import { PageLoader } from "../components/PageLoader";
import { graphRepository } from "../domain/repository";
import type { BuildGuide, BuildStep, WorldCase } from "../domain/types";

type DeviceInfo = {
  ip: string;
  username: string;
};

const buildNodeTypes = { "build-step": BuildStepFlowNode };

export function RebuildPage() {
  const { caseId = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const inspectorBodyRef = useRef<HTMLDivElement>(null);
  const [guide, setGuide] = useState<BuildGuide | null | undefined>(undefined);
  const [worldCase, setWorldCase] = useState<WorldCase | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    ip: "",
    username: "",
  });
  const [progressLoaded, setProgressLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      graphRepository.getCase(caseId),
      graphRepository.getBuildGuide(caseId),
    ])
      .then(([loadedCase, loadedGuide]) => {
        if (!alive) return;
        setWorldCase(loadedCase);
        setGuide(loadedGuide);
      })
      .catch(() => {
        if (alive) setGuide(null);
      });

    return () => {
      alive = false;
    };
  }, [caseId]);

  useEffect(() => {
    setProgressLoaded(false);
    try {
      const saved = window.localStorage.getItem(`8bit-runbook:v2:${caseId}`);
      const parsed = saved ? JSON.parse(saved) : {};
      setChecked(
        parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? parsed
          : {},
      );
    } catch {
      setChecked({});
    }
    setProgressLoaded(true);
  }, [caseId]);

  useEffect(() => {
    if (!progressLoaded) return;
    try {
      window.localStorage.setItem(
        `8bit-runbook:v2:${caseId}`,
        JSON.stringify(checked),
      );
    } catch {
      // The tutorial remains usable when storage is unavailable.
    }
  }, [caseId, checked, progressLoaded]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`8bit-device:${caseId}`);
      const parsed = saved ? JSON.parse(saved) : null;
      setDeviceInfo({
        ip: typeof parsed?.ip === "string" ? parsed.ip : "",
        username:
          typeof parsed?.username === "string" ? parsed.username : "",
      });
    } catch {
      setDeviceInfo({ ip: "", username: "" });
    }
  }, [caseId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        `8bit-device:${caseId}`,
        JSON.stringify(deviceInfo),
      );
    } catch {
      // Device values can remain in memory when storage is unavailable.
    }
  }, [caseId, deviceInfo]);

  const requestedStep = Number(searchParams.get("step") ?? "1");
  const stepIndex = guide
    ? Math.min(
        guide.steps.length - 1,
        Math.max(
          0,
          Number.isFinite(requestedStep)
            ? Math.trunc(requestedStep) - 1
            : 0,
        ),
      )
    : 0;
  const step = guide?.steps[stepIndex];

  const completedSteps = useMemo(() => {
    if (!guide) return 0;
    return guide.steps.filter((candidate) =>
      candidate.successCriteria.every(
        (_, criterionIndex) =>
          checked[criterionKey(candidate, criterionIndex)],
      ),
    ).length;
  }, [checked, guide]);

  const flowNodes = useMemo<BuildStepNode[]>(() => {
    if (!guide) return [];
    return guide.steps.map((candidate, index) => {
      const complete = candidate.successCriteria.every(
        (_, criterionIndex) =>
          checked[criterionKey(candidate, criterionIndex)],
      );
      return {
        id: candidate.id,
        type: "build-step",
        position: { x: index * 86, y: 0 },
        selected: index === stepIndex,
        data: {
          stepId: candidate.id,
          index: index + 1,
          title: candidate.title,
          phase: candidate.phase,
          duration: candidate.duration,
          complete,
          current: index === stepIndex,
          linked: Math.abs(index - stepIndex) === 1,
        },
      };
    });
  }, [checked, guide, stepIndex]);

  const flowEdges = useMemo<Edge[]>(() => {
    if (!guide) return [];
    return guide.steps.slice(0, -1).map((candidate, index) => {
      const next = guide.steps[index + 1];
      const complete = candidate.successCriteria.every(
        (_, criterionIndex) =>
          checked[criterionKey(candidate, criterionIndex)],
      );
      const active = index === stepIndex || index + 1 === stepIndex;
      return {
        id: `build:${candidate.id}:${next.id}`,
        source: candidate.id,
        target: next.id,
        type: "straight",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: complete ? "#1f8a58" : active ? "#0071e3" : "#c7c7cc",
          width: 6,
          height: 6,
        },
        style: {
          stroke: complete ? "#1f8a58" : active ? "#0071e3" : "#d2d2d7",
          strokeWidth: active ? 1.6 : 1.1,
          opacity: active || complete ? 0.95 : 0.9,
        },
      };
    });
  }, [checked, guide, stepIndex]);

  const goToStep = (nextIndex: number) => {
    if (!guide) return;
    const bounded = Math.min(
      guide.steps.length - 1,
      Math.max(0, nextIndex),
    );
    const next = new URLSearchParams(searchParams);
    next.set("step", String(bounded + 1));
    setSearchParams(next);
    inspectorBodyRef.current?.scrollTo?.({
      top: 0,
      behavior: "smooth",
    });
  };

  if (guide === undefined) {
    return <PageLoader label="正在准备可执行教程…" />;
  }

  if (!guide || !worldCase || !step) {
    return (
      <main className="runbook-error">
        <Wrench size={30} />
        <h1>这个对象还没有可跑通的打造教程</h1>
        <p>当前 Demo 只开放已经逐步验证过的项目。</p>
        <button type="button" onClick={() => navigate("/")}>
          返回重新选择
        </button>
      </main>
    );
  }

  const stepComplete = step.successCriteria.every(
    (_, criterionIndex) => checked[criterionKey(step, criterionIndex)],
  );
  const serializedStep = JSON.stringify(step);
  const needsIp = serializedStep.includes("{{IP}}");
  const needsUsername = serializedStep.includes("{{USER}}");
  const progress = (completedSteps / guide.steps.length) * 100;

  const selectStep: NodeMouseHandler<BuildStepNode> = (_, node) => {
    const nextIndex = guide.steps.findIndex(
      (candidate) => candidate.id === node.id,
    );
    if (nextIndex >= 0) goToStep(nextIndex);
  };

  return (
    <main className="explorer-page build-flow-page">
      <header className="explorer-header">
        <Link className="explorer-wordmark" to="/">
          8bit
        </Link>
        <div className="case-switcher case-switcher--single">
          <span
            className="case-switcher__dot"
            style={{ backgroundColor: worldCase.accent }}
          />
          <strong>{worldCase.shortTitle}</strong>
        </div>
        <span className="build-flow-header__mode">打造</span>
        <Link
          className="build-flow-header__switch"
          to={`/explore/${worldCase.id}/${worldCase.rootNodeId}?view=structure&goal=learn`}
        >
          <ArrowLeft size={14} />
          拆开看关系
        </Link>
      </header>

      <section className="explorer-toolbar">
        <div className="build-flow-toolbar__title">
          <strong>从零到一</strong>
          <span>{guide.totalTime}</span>
        </div>
        <div
          className="build-flow-progress"
          role="progressbar"
          aria-label="打造完成进度"
          aria-valuemin={0}
          aria-valuemax={guide.steps.length}
          aria-valuenow={completedSteps}
        >
          <span>
            已完成 {completedSteps}/{guide.steps.length}
          </span>
          <i>
            <span style={{ width: `${progress}%` }} />
          </i>
        </div>
      </section>

      <div className="explorer-workspace build-flow-workspace">
        <section className="graph-stage">
          <div className="graph-canvas">
            <div className="graph-context">
              <span className="eyebrow">打造链路</span>
              <h1>{guide.title}</h1>
              <p>点击任一步，右侧会给出能直接执行的操作与验收结果。</p>
            </div>

            <div className="workflow-direction" aria-hidden="true">
              <span>准备</span>
              <i />
              <span>网页上线</span>
            </div>

            <ReactFlow<BuildStepNode, Edge>
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={buildNodeTypes}
              onNodeClick={selectStep}
              fitView
              fitViewOptions={{ padding: 0.03, maxZoom: 1.12 }}
              minZoom={0.55}
              maxZoom={1.4}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable
              aria-label="打造步骤链路"
              proOptions={{ hideAttribution: true }}
            />
          </div>
        </section>

        <aside className="build-inspector">
          <div className="build-inspector__body" ref={inspectorBodyRef}>
            <header className="build-inspector__header">
              <div className="build-inspector__meta">
                <span>
                  第 {stepIndex + 1} / {guide.steps.length} 步
                </span>
                <span>
                  <Clock3 size={13} />
                  {step.duration}
                </span>
              </div>
              <h2>{step.title}</h2>
              <p>{step.purpose}</p>
            </header>

            {step.id === "flash-card" && (
              <div className="runbook-stop-rule">
                <CircleAlert size={17} />
                <span>
                  这里只允许清空已确认容量的 TF 卡。目标设备有一点不确定，就停止写入。
                </span>
              </div>
            )}

            {(needsIp || needsUsername) && (
              <section className="runbook-device" aria-label="本次设备信息">
                <div>
                  <strong>本次设备</strong>
                  <span>填一次，后面的命令会自动带入。</span>
                </div>
                {needsIp && (
                  <label>
                    <span>Orange Pi IP</span>
                    <input
                      aria-label="Orange Pi IP"
                      value={deviceInfo.ip}
                      onChange={(event) =>
                        setDeviceInfo((current) => ({
                          ...current,
                          ip: event.target.value.trim(),
                        }))
                      }
                      placeholder="例如 192.168.1.123"
                      spellCheck={false}
                    />
                  </label>
                )}
                {needsUsername && (
                  <label>
                    <span>你的普通用户名</span>
                    <input
                      aria-label="你的普通用户名"
                      value={deviceInfo.username}
                      onChange={(event) =>
                        setDeviceInfo((current) => ({
                          ...current,
                          username: event.target.value
                            .trim()
                            .toLowerCase(),
                        }))
                      }
                      placeholder="例如 jie"
                      spellCheck={false}
                    />
                  </label>
                )}
              </section>
            )}

            <section className="runbook-section">
              <div className="runbook-section__title">
                <span>01</span>
                <div>
                  <h3>开始前确认</h3>
                  <p>这些条件不满足，就先不要继续。</p>
                </div>
              </div>
              <ul className="runbook-prerequisites">
                {step.prerequisites.map((item) => (
                  <li key={item}>
                    <Circle size={9} />
                    <InstructionText text={item} values={deviceInfo} />
                  </li>
                ))}
              </ul>
            </section>

            <section className="runbook-section">
              <div className="runbook-section__title">
                <span>02</span>
                <div>
                  <h3>照着做</h3>
                  <p>一次只完成一条，看到对应结果再继续。</p>
                </div>
              </div>
              <ol className="runbook-actions">
                {step.instructions.map((instruction, index) => (
                  <li key={instruction}>
                    <span>{index + 1}</span>
                    <p>
                      <InstructionText
                        text={instruction}
                        copyable
                        values={deviceInfo}
                      />
                    </p>
                  </li>
                ))}
              </ol>
            </section>

            <section className="runbook-section">
              <div className="runbook-section__title">
                <span>03</span>
                <div>
                  <h3>做到这些才算完成</h3>
                  <p>逐项勾选，完成状态会显示在左侧链路。</p>
                </div>
              </div>
              <div className="runbook-criteria">
                {step.successCriteria.map((criterion, criterionIndex) => {
                  const key = criterionKey(step, criterionIndex);
                  return (
                    <label key={criterion}>
                      <input
                        type="checkbox"
                        checked={Boolean(checked[key])}
                        onChange={() =>
                          setChecked((current) => ({
                            ...current,
                            [key]: !current[key],
                          }))
                        }
                      />
                      <span>
                        <Check size={13} />
                      </span>
                      <InstructionText
                        text={criterion}
                        values={deviceInfo}
                      />
                    </label>
                  );
                })}
              </div>
            </section>

            <details className="runbook-troubleshooting">
              <summary>
                <CircleAlert size={16} />
                卡住了，先检查这里
                <ChevronRight size={15} />
              </summary>
              <ul>
                {step.troubleshooting.map((item) => (
                  <li key={item}>
                    <InstructionText
                      text={item}
                      copyable
                      values={deviceInfo}
                    />
                  </li>
                ))}
              </ul>
            </details>
          </div>

          <footer className="build-inspector__navigation">
            <button
              type="button"
              className="runbook-navigation__secondary"
              onClick={() => goToStep(stepIndex - 1)}
              disabled={stepIndex === 0}
            >
              <ArrowLeft size={15} />
              上一步
            </button>
            {stepIndex < guide.steps.length - 1 ? (
              <button
                type="button"
                className="runbook-navigation__primary"
                onClick={() => goToStep(stepIndex + 1)}
              >
                {stepComplete ? "已完成，继续" : "下一步"}
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="runbook-navigation__primary"
                onClick={() =>
                  navigate(
                    `/explore/${worldCase.id}/${worldCase.rootNodeId}?view=structure&goal=learn`,
                  )
                }
              >
                完成，回看关系
                <ArrowRight size={16} />
              </button>
            )}
          </footer>
        </aside>
      </div>
    </main>
  );
}

function criterionKey(step: BuildStep, criterionIndex: number) {
  return `${step.id}:${criterionIndex}`;
}

function InstructionText({
  text,
  copyable = false,
  values,
}: {
  text: string;
  copyable?: boolean;
  values: DeviceInfo;
}) {
  const hasUnresolvedIp = text.includes("{{IP}}") && !values.ip;
  const hasUnresolvedUsername =
    text.includes("{{USER}}") && !values.username;
  const resolvedText = text
    .replaceAll("{{IP}}", values.ip || "IP待填写")
    .replaceAll("{{USER}}", values.username || "用户名待填写");
  const pieces = resolvedText
    .split(/(`[^`]+`|https?:\/\/[^\s，。]+)/g)
    .filter(Boolean);

  return (
    <>
      {pieces.map((piece, index) => {
        if (/^https?:\/\//.test(piece)) {
          if (hasUnresolvedIp) {
            return (
              <span className="runbook-unresolved" key={`${piece}-${index}`}>
                {piece}
              </span>
            );
          }
          return (
            <a
              className="runbook-inline-link"
              href={piece}
              target="_blank"
              rel="noreferrer"
              key={`${piece}-${index}`}
            >
              打开链接 ↗
            </a>
          );
        }
        if (!piece.startsWith("`") || !piece.endsWith("`")) {
          return <span key={`${piece}-${index}`}>{piece}</span>;
        }
        const command = piece.slice(1, -1);
        return copyable ? (
          <CopyCommand
            command={command}
            disabled={hasUnresolvedIp || hasUnresolvedUsername}
            key={`${command}-${index}`}
          />
        ) : (
          <code key={`${command}-${index}`}>{command}</code>
        );
      })}
    </>
  );
}

function CopyCommand({
  command,
  disabled = false,
}: {
  command: string;
  disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      className="runbook-command"
      onClick={copy}
      title={disabled ? "先填写上方设备信息" : "复制命令"}
      disabled={disabled}
    >
      <code>{command}</code>
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}
