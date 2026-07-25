import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Blocks,
  Box,
  Cable,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Code2,
  ExternalLink,
  Gauge,
  Lightbulb,
  ListChecks,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";
import { Brand } from "../components/Brand";
import { PageLoader } from "../components/PageLoader";
import { graphRepository } from "../domain/repository";
import type {
  BuildGuide,
  BuildStep,
  WorldCase,
} from "../domain/types";

export function RebuildPage() {
  const { caseId = "" } = useParams();
  const navigate = useNavigate();
  const [guide, setGuide] = useState<BuildGuide | null | undefined>(undefined);
  const [worldCase, setWorldCase] = useState<WorldCase | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    Promise.all([
      graphRepository.getCase(caseId),
      graphRepository.getBuildGuide(caseId),
    ])
      .then(([loadedCase, loadedGuide]) => {
        setWorldCase(loadedCase);
        setGuide(loadedGuide);
      })
      .catch(() => {
        setGuide(null);
      });
  }, [caseId]);

  const completedCriteria = useMemo(
    () => Object.values(checked).filter(Boolean).length,
    [checked],
  );
  const totalCriteria =
    guide?.steps.reduce(
      (total, step) => total + step.successCriteria.length,
      0,
    ) ?? 0;

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  if (guide === undefined) {
    return <PageLoader label="正在展开重建路径…" />;
  }

  if (!guide || !worldCase) {
    return (
      <div className="error-page">
        <Wrench size={34} />
        <h1>这个案例暂不提供重建</h1>
        <p>生命案例只提供教学观察与结构探索，不生成真实生命制作方案。</p>
        <button
          className="button button--dark"
          onClick={() => navigate(`/explore/${caseId}?view=structure`)}
        >
          返回关系图
        </button>
      </div>
    );
  }

  return (
    <main
      className="rebuild-page"
      style={
        {
          "--case-accent": worldCase.accent,
          "--case-soft": worldCase.accentSoft,
        } as React.CSSProperties
      }
    >
      <header className="rebuild-header">
        <Brand compact />
        <nav>
          <button type="button" onClick={() => navigate("/")}>
            首页
          </button>
          <ChevronRight size={13} />
          <button
            type="button"
            onClick={() =>
              navigate(
                `/explore/${worldCase.id}/${worldCase.rootNodeId}?view=structure`,
              )
            }
          >
            {worldCase.shortTitle}
          </button>
          <ChevronRight size={13} />
          <span>重建路径</span>
        </nav>
        <button
          className="button button--ghost"
          type="button"
          onClick={() =>
            navigate(
              `/explore/${worldCase.id}/${worldCase.rootNodeId}?view=signal`,
            )
          }
        >
          <ArrowLeft size={15} />
          返回关系图
        </button>
      </header>

      <section className="rebuild-hero">
        <div className="container rebuild-hero__grid">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="hero-kicker">
              <Wrench size={14} />
              REBUILD / 分阶段安全执行
            </span>
            <h1>{guide.title}</h1>
            <p>{guide.summary}</p>
            <div className="rebuild-hero__actions">
              <button
                className="button button--dark"
                type="button"
                onClick={() => scrollTo("steps")}
              >
                开始第 1 阶段
                <ArrowRight size={16} />
              </button>
              <button
                className="text-button"
                type="button"
                onClick={() => scrollTo("parts")}
              >
                先检查零件
                <ChevronRight size={14} />
              </button>
            </div>
          </motion.div>

          <div className="build-metrics">
            <article>
              <Gauge size={18} />
              <span>难度</span>
              <strong>{guide.difficulty}</strong>
            </article>
            <article>
              <Clock3 size={18} />
              <span>预计耗时</span>
              <strong>{guide.totalTime}</strong>
            </article>
            <article>
              <CircleDollarSign size={18} />
              <span>材料预算</span>
              <strong>{guide.budget}</strong>
            </article>
            <article>
              <ShieldCheck size={18} />
              <span>安全边界</span>
              <strong>5V 低压</strong>
            </article>
          </div>
        </div>

        <div className="container system-chain">
          <span className="system-chain__label">最小可用链路</span>
          <div className="system-chain__flow">
            {guide.programFlow.map((item, index) => (
              <div key={`${item}-${index}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{item}</strong>
                {index < guide.programFlow.length - 1 && (
                  <ArrowRight size={16} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container build-layout">
        <aside className="build-nav">
          <span className="eyebrow">重建地图</span>
          <nav>
            <button type="button" onClick={() => scrollTo("parts")}>
              <PackageCheck size={16} />
              零件清单
              <span>{guide.parts.length}</span>
            </button>
            <button type="button" onClick={() => scrollTo("connections")}>
              <Cable size={16} />
              连接关系
              <span>{guide.connections.length}</span>
            </button>
            <button type="button" onClick={() => scrollTo("steps")}>
              <ListChecks size={16} />
              制作阶段
              <span>{guide.steps.length}</span>
            </button>
            <button type="button" onClick={() => scrollTo("safety")}>
              <ShieldCheck size={16} />
              安全提示
              <span>{guide.safety.length}</span>
            </button>
          </nav>
          <div className="build-progress">
            <div>
              <span>验收进度</span>
              <strong>
                {completedCriteria}/{totalCriteria}
              </strong>
            </div>
            <div className="build-progress__bar">
              <i
                style={{
                  width:
                    totalCriteria > 0
                      ? `${(completedCriteria / totalCriteria) * 100}%`
                      : "0%",
                }}
              />
            </div>
            <small>勾选每一步的完成标准，进度只保存在当前页面。</small>
          </div>
        </aside>

        <div className="build-content">
          <section className="build-section" id="parts">
            <div className="build-section__head">
              <div>
                <span className="eyebrow">01 / 准备</span>
                <h2>先认识每个零件的任务。</h2>
              </div>
              <div className="tools-popover">
                <Wrench size={15} />
                工具：{guide.tools.join(" · ")}
              </div>
            </div>

            <div className="parts-grid">
              {guide.parts.map((part, index) => (
                <article className="part-card" key={part.id}>
                  <div className="part-card__top">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <span
                      className={`part-card__type part-card__type--${part.status}`}
                    >
                      {part.status === "core" ? "核心" : "辅助"}
                    </span>
                  </div>
                  <div className="part-card__icon">
                    {part.status === "core" ? (
                      <Zap size={19} />
                    ) : (
                      <Box size={19} />
                    )}
                  </div>
                  <h3>{part.name}</h3>
                  <p>{part.purpose}</p>
                  <footer>
                    <span>{part.quantity}</span>
                    <strong>{part.estimate}</strong>
                  </footer>
                </article>
              ))}
            </div>
          </section>

          <section className="build-section" id="connections">
            <div className="build-section__head">
              <div>
                <span className="eyebrow">02 / 连接</span>
                <h2>知道接哪里，也知道为什么。</h2>
              </div>
            </div>

            <div className="connection-board">
              {guide.connections.map((connection, index) => (
                <article className="connection-row" key={`${connection.from}-${index}`}>
                  <span className="connection-row__number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <strong>{connection.from}</strong>
                  <div className="connection-row__line">
                    <span>{connection.via}</span>
                    <i />
                    <ArrowRight size={15} />
                  </div>
                  <strong>{connection.to}</strong>
                  <p>{connection.reason}</p>
                </article>
              ))}
            </div>

            <div className="program-card">
              <div className="program-card__icon">
                <Code2 size={22} />
              </div>
              <div>
                <span className="eyebrow">系统路径 / FLOW</span>
                <h3>把首次启动拆成可以逐项验收的阶段。</h3>
              </div>
              <div className="program-flow">
                {guide.programFlow.map((item, index) => (
                  <span key={item}>
                    {item}
                    {index < guide.programFlow.length - 1 && (
                      <ChevronRight size={13} />
                    )}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="build-section" id="steps">
            <div className="build-section__head">
              <div>
                <span className="eyebrow">03 / 制作与验证</span>
                <h2>一次只完成一个最小模块。</h2>
              </div>
              <p>每步都有前置条件、验收标准和失败后的第一检查点。</p>
            </div>

            <div className="step-list">
              {guide.steps.map((step, index) => (
                <BuildStepCard
                  step={step}
                  index={index}
                  checked={checked}
                  onToggle={(criterionId) =>
                    setChecked((current) => ({
                      ...current,
                      [criterionId]: !current[criterionId],
                    }))
                  }
                  key={step.id}
                />
              ))}
            </div>
          </section>

          <section className="safety-section" id="safety">
            <div className="safety-section__title">
              <span>
                <ShieldCheck size={22} />
              </span>
              <div>
                <span className="eyebrow">04 / 安全边界</span>
                <h2>先保护人和设备，再验证功能。</h2>
              </div>
            </div>
            <div className="safety-list">
              {guide.safety.map((item, index) => (
                <div key={item}>
                  <CheckCircle2 size={16} />
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="build-complete">
            <Sparkles size={22} />
            <div>
              <span className="eyebrow">这不是终点</span>
              <h2>回到关系图，看看你刚刚重建了什么。</h2>
              <p>
                这些步骤对应着文件、写盘、启动、网络、SSH 与服务之间的关系。完成验收后，再回到信号视图会更容易理解整条链路。
              </p>
            </div>
            <button
              className="button button--dark"
              type="button"
              onClick={() =>
                navigate(
                  `/explore/${worldCase.id}/${worldCase.rootNodeId}?view=signal`,
                )
              }
            >
              回看信号关系
              <ExternalLink size={15} />
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}

function BuildStepCard({
  step,
  index,
  checked,
  onToggle,
}: {
  step: BuildStep;
  index: number;
  checked: Record<string, boolean>;
  onToggle: (criterionId: string) => void;
}) {
  const [open, setOpen] = useState(index === 0);
  const criterionIds = step.successCriteria.map(
    (_, criterionIndex) => `${step.id}-${criterionIndex}`,
  );
  const complete = criterionIds.every((id) => checked[id]);

  return (
    <article className={`build-step ${open ? "is-open" : ""}`}>
      <button
        className="build-step__header"
        type="button"
        onClick={() => setOpen(!open)}
      >
        <span className={`build-step__number ${complete ? "is-complete" : ""}`}>
          {complete ? <Check size={17} /> : String(index + 1).padStart(2, "0")}
        </span>
        <span>
          <small>
            {step.phase} · {step.duration}
          </small>
          <strong>{step.title}</strong>
        </span>
        <p>{step.purpose}</p>
        <ChevronRight size={18} />
      </button>

      {open && (
        <motion.div
          className="build-step__body"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <div className="step-prerequisites">
            <span>
              <TimerReset size={14} />
              开始前确认
            </span>
            <p>{step.prerequisites.join("；")}</p>
          </div>

          <div className="step-columns">
            <section>
              <h4>
                <Blocks size={15} />
                操作
              </h4>
              <ol>
                {step.instructions.map((instruction) => (
                  <li key={instruction}>{instruction}</li>
                ))}
              </ol>
            </section>

            <section>
              <h4>
                <CheckCircle2 size={15} />
                完成标准
              </h4>
              <div className="criteria-list">
                {step.successCriteria.map((criterion, criterionIndex) => {
                  const criterionId = `${step.id}-${criterionIndex}`;
                  return (
                    <label key={criterion}>
                      <input
                        type="checkbox"
                        checked={Boolean(checked[criterionId])}
                        onChange={() => onToggle(criterionId)}
                      />
                      <span>
                        <Check size={12} />
                      </span>
                      {criterion}
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="troubleshooting">
              <h4>
                <AlertTriangle size={15} />
                出错先查
              </h4>
              <ul>
                {step.troubleshooting.map((item) => (
                  <li key={item}>
                    <XCircle size={13} />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </motion.div>
      )}
    </article>
  );
}
