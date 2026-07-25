import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Circle,
  CircleAlert,
  Clock3,
  Copy,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { PageLoader } from "../components/PageLoader";
import { graphRepository } from "../domain/repository";
import type { BuildGuide, BuildStep, WorldCase } from "../domain/types";

type DeviceInfo = {
  ip: string;
  username: string;
};

export function RebuildPage() {
  const { caseId = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
      // The tutorial still works when private browsing blocks local storage.
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

  const goToStep = (nextIndex: number) => {
    if (!guide) return;
    const bounded = Math.min(
      guide.steps.length - 1,
      Math.max(0, nextIndex),
    );
    const next = new URLSearchParams(searchParams);
    next.set("step", String(bounded + 1));
    setSearchParams(next);
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      // JSDOM and a few embedded browsers do not implement scrollTo.
    }
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

  return (
    <main className="runbook-page">
      <header className="runbook-header">
        <Link className="runbook-wordmark" to="/">
          8bit
        </Link>
        <div>
          <span>打造</span>
          <ChevronRight size={13} />
          <strong>{worldCase.shortTitle}</strong>
        </div>
        <Link
          className="runbook-back"
          to={`/explore/${worldCase.id}/${worldCase.rootNodeId}?view=structure&goal=learn`}
        >
          <ArrowLeft size={14} />
          拆开看关系
        </Link>
      </header>

      <div className="runbook-layout">
        <aside className="runbook-sidebar">
          <div className="runbook-sidebar__intro">
            <span>从零到一</span>
            <h1>{guide.title}</h1>
            <p>{guide.totalTime}</p>
          </div>

          <div className="runbook-progress">
            <div>
              <span>已完成</span>
              <strong>
                {completedSteps}/{guide.steps.length}
              </strong>
            </div>
            <i>
              <span
                style={{
                  width: `${(completedSteps / guide.steps.length) * 100}%`,
                }}
              />
            </i>
          </div>

          <nav className="runbook-step-nav" aria-label="打造步骤">
            {guide.steps.map((candidate, index) => {
              const complete = candidate.successCriteria.every(
                (_, criterionIndex) =>
                  checked[criterionKey(candidate, criterionIndex)],
              );
              return (
                <button
                  type="button"
                  className={`${index === stepIndex ? "is-current" : ""} ${complete ? "is-complete" : ""}`}
                  onClick={() => goToStep(index)}
                  key={candidate.id}
                >
                  <span>
                    {complete ? (
                      <Check size={13} />
                    ) : (
                      String(index + 1).padStart(2, "0")
                    )}
                  </span>
                  <strong>{candidate.title}</strong>
                </button>
              );
            })}
          </nav>

          <div className="runbook-sidebar__safety">
            <ShieldCheck size={15} />
            不确定磁盘、电源或接线时先停下，不猜、不盲试。
          </div>
        </aside>

        <section className="runbook-content">
          <article className="runbook-step">
            <header className="runbook-step__header">
              <div className="runbook-step__meta">
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
              <section
                className="runbook-device"
                aria-label="本次设备信息"
              >
                <div>
                  <strong>本次设备</strong>
                  <span>填一次，后面的命令会自动带入。</span>
                </div>
                {needsIp && (
                  <label>
                    <span>Orange Pi IP</span>
                    <input
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
                  <p>逐项勾选，进度会保存在这台电脑上。</p>
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

            <footer className="runbook-navigation">
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
                  {stepComplete ? "这一步已完成，继续" : "下一步"}
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
                  完成，回看整体关系
                  <ArrowRight size={16} />
                </button>
              )}
            </footer>
          </article>
        </section>
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
              <span
                className="runbook-unresolved"
                key={`${piece}-${index}`}
              >
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
