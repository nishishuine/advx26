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
import { TutorialVisualGallery } from "../components/TutorialVisualGallery";
import { getBuildStepVisuals } from "../domain/orangePiVisuals";
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
      const saved = window.localStorage.getItem(
        `manifold-runbook:v3:${caseId}`,
      );
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
        `manifold-runbook:v3:${caseId}`,
        JSON.stringify(checked),
      );
    } catch {
      // The tutorial remains usable when storage is unavailable.
    }
  }, [caseId, checked, progressLoaded]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(
        `manifold-device:${caseId}`,
      );
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
        `manifold-device:${caseId}`,
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
    const laneSize = Math.max(1, Math.ceil(guide.steps.length / 3));

    return guide.steps.map((candidate, index) => {
      const complete = candidate.successCriteria.every(
        (_, criterionIndex) =>
          checked[criterionKey(candidate, criterionIndex)],
      );
      return {
        id: candidate.id,
        type: "build-step",
        position: {
          x: index * 88,
          y: Math.floor(index / laneSize) * 210,
        },
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
        type: "default",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: complete ? "#708f68" : active ? "#2f7f88" : "#cfd8d8",
          width: 7,
          height: 7,
        },
        style: {
          stroke: complete ? "#708f68" : active ? "#2f7f88" : "#cfd8d8",
          strokeWidth: active ? 1.8 : complete ? 1.5 : 1.2,
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
  const ipIsValid = isValidPrivateIpv4(deviceInfo.ip);
  const usernameIsValid = isValidUsername(deviceInfo.username);
  const progress = (completedSteps / guide.steps.length) * 100;
  const nextStep = guide.steps[stepIndex + 1];
  const stepVisuals = getBuildStepVisuals(step.id);

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
          manifold
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
              fitViewOptions={{ padding: 0.08, maxZoom: 1.12 }}
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

            {stepVisuals.length > 0 && (
              <TutorialVisualGallery visuals={stepVisuals} />
            )}

            {["find-ip", "first-ssh"].includes(step.id) && (
              <NetworkConnectionMap mode={step.id} />
            )}

            {step.deviceState && (
              <div
                className="build-device-state"
                aria-label="开始这一步时的设备状态"
              >
                <span>当前连接状态</span>
                <strong>{step.deviceState}</strong>
              </div>
            )}

            {step.mentalModel && (
              <div className="runbook-mental-model">
                <strong>先理解这一步</strong>
                <p>{step.mentalModel}</p>
              </div>
            )}

            {["choose-image", "identify-card", "flash-card"].includes(
              step.id,
            ) && (
              <div className="runbook-definition">
                <strong>烧录，不是复制文件</strong>
                <p>
                  烧录工具会把整个 Linux 系统按启动格式写进 TF
                  卡。不要把下载文件直接拖进卡里。
                </p>
              </div>
            )}

            {["identify-card", "flash-card"].includes(step.id) && (
              <div className="runbook-stop-rule">
                <CircleAlert size={17} />
                <span>
                  {step.id === "identify-card"
                    ? "这里只确认哪一个设备是 TF 卡，先不写入。出现两个候选设备，就停止。"
                    : "这里只允许清空已经确认容量的 TF 卡。目标设备有一点不确定，就停止写入。"}
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
                      aria-invalid={
                        deviceInfo.ip.length > 0 && !ipIsValid
                          ? "true"
                          : "false"
                      }
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
                    <small
                      className={
                        deviceInfo.ip.length > 0 && !ipIsValid
                          ? "is-error"
                          : undefined
                      }
                    >
                      {deviceInfo.ip.length > 0 && !ipIsValid
                        ? "格式不对：只填局域网 IPv4，例如 192.168.1.123。"
                        : "只填四组数字和点，不要带 http://、端口或空格。"}
                    </small>
                  </label>
                )}
                {needsUsername && (
                  <label>
                    <span>你的普通用户名</span>
                    <input
                      aria-label="你的普通用户名"
                      aria-invalid={
                        deviceInfo.username.length > 0 && !usernameIsValid
                          ? "true"
                          : "false"
                      }
                      value={deviceInfo.username}
                      onChange={(event) =>
                        setDeviceInfo((current) => ({
                          ...current,
                          username: event.target.value
                            .trim()
                            .toLowerCase(),
                        }))
                      }
                      placeholder="例如 jie1"
                      spellCheck={false}
                    />
                    <small
                      className={
                        deviceInfo.username.length > 0 && !usernameIsValid
                          ? "is-error"
                          : undefined
                      }
                    >
                      {deviceInfo.username.length > 0 && !usernameIsValid
                        ? "用户名需以小写字母开头，后面只用小写字母和数字。"
                        : "建议使用容易输入的名称，例如 jie1。"}
                    </small>
                  </label>
                )}
              </section>
            )}

            {step.terminalExample && (
              <section
                className="runbook-terminal-guide"
                aria-label={step.terminalExample.title}
              >
                <header>
                  <strong>{step.terminalExample.title}</strong>
                  <span>看到相似内容就说明方向正确</span>
                </header>
                <pre>
                  {step.terminalExample.lines.map((line) => (
                    <code
                      className={
                        /True|OpenSSH|yes|root@|PS C:|whoami|jie1/.test(
                          line,
                        )
                          ? "is-key"
                          : undefined
                      }
                      key={line}
                    >
                      {resolveExampleLine(line, deviceInfo)}
                    </code>
                  ))}
                </pre>
                {step.terminalExample.note && (
                  <p>{step.terminalExample.note}</p>
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
                {stepComplete ? "继续" : "下一步"} · {nextStep?.title}
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

function NetworkConnectionMap({
  mode,
}: {
  mode: string;
}) {
  const isSsh = mode === "first-ssh";

  return (
    <section className="runbook-network-map" aria-label="局域网真实连接关系">
      <header>
        <strong>{isSsh ? "SSH 命令实际走这条路" : "三台设备的真实连接"}</strong>
        <span>电脑不需要直接连接 Orange Pi</span>
      </header>
      <div>
        <article>
          <span>01</span>
          <strong>Windows 电脑</strong>
          <small>{isSsh ? "PowerShell 发出 SSH" : "连接普通 Wi-Fi 或 LAN"}</small>
        </article>
        <i>
          <span>{isSsh ? "SSH 请求" : "同一局域网"}</span>
        </i>
        <article className="is-router">
          <span>02</span>
          <strong>家用路由器</strong>
          <small>{isSsh ? "按 IP 转发到板卡" : "给板卡分配 IPv4"}</small>
        </article>
        <i>
          <span>{isSsh ? "TCP 22" : "LAN 网线"}</span>
        </i>
        <article>
          <span>03</span>
          <strong>Orange Pi</strong>
          <small>{isSsh ? "返回远程命令行" : "保持通电并接 LAN 口"}</small>
        </article>
      </div>
      <p>
        {isSsh
          ? "成功后，PowerShell 会从 Windows 提示符切换成 Orange Pi 的 $ 或 # 提示符。"
          : "路由器地址是“前台地址”，Orange Pi IP 是“房间号”；后面真正要填写的是 Orange Pi IP。"}
      </p>
    </section>
  );
}

function isValidPrivateIpv4(value: string) {
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  if (
    parts.some(
      (part) =>
        !/^\d{1,3}$/.test(part) ||
        Number(part) < 0 ||
        Number(part) > 255,
    )
  ) {
    return false;
  }
  const [first, second] = parts.map(Number);
  return (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isValidUsername(value: string) {
  return /^[a-z][a-z0-9]*$/.test(value);
}

function resolveExampleLine(line: string, values: DeviceInfo) {
  return line
    .replaceAll(
      "{{IP}}",
      isValidPrivateIpv4(values.ip) ? values.ip : "192.168.1.123",
    )
    .replaceAll(
      "{{USER}}",
      isValidUsername(values.username) ? values.username : "jie1",
    );
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
  const validIp = isValidPrivateIpv4(values.ip);
  const validUsername = isValidUsername(values.username);
  const hasUnresolvedIp = text.includes("{{IP}}") && !validIp;
  const hasUnresolvedUsername =
    text.includes("{{USER}}") && !validUsername;
  const resolvedText = text
    .replaceAll("{{IP}}", validIp ? values.ip : "IP待填写")
    .replaceAll(
      "{{USER}}",
      validUsername ? values.username : "用户名待填写",
    );
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
