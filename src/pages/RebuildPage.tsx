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
import { LanguageSwitch } from "../components/LanguageSwitch";
import { PageLoader } from "../components/PageLoader";
import { TutorialVisualGallery } from "../components/TutorialVisualGallery";
import { getBuildStepVisuals } from "../domain/orangePiVisuals";
import { getGraphRepository } from "../domain/repository";
import type { BuildGuide, BuildStep, WorldCase } from "../domain/types";
import { useLanguage } from "../i18n/LanguageProvider";

type DeviceInfo = {
  ip: string;
  username: string;
};

const buildNodeTypes = { "build-step": BuildStepFlowNode };
type Translator = (
  chinese: string,
  english: string,
  mongolian: string,
) => string;

export function RebuildPage() {
  const { caseId = "" } = useParams();
  const navigate = useNavigate();
  const { locale, text } = useLanguage();
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
    const repository = getGraphRepository(locale);
    Promise.all([
      repository.getCase(caseId),
      repository.getBuildGuide(caseId),
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
  }, [caseId, locale]);

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
    return (
      <PageLoader
        label={text(
          "正在准备可执行教程…",
          "Preparing the hands-on guide…",
          "Дагаж хийх зааврыг бэлдэж байна…",
        )}
      />
    );
  }

  if (!guide || !worldCase || !step) {
    return (
      <main className="runbook-error">
        <Wrench size={30} />
        <h1>
          {text(
            "这个对象还没有可跑通的打造教程",
            "There is no tested build guide for this object yet",
            "Энэ зүйлд туршиж баталсан бүтээх заавар хараахан алга",
          )}
        </h1>
        <p>
          {text(
            "当前 Demo 只开放已经逐步验证过的项目。",
            "This demo only includes projects checked step by step.",
            "Энэ демод зөвхөн алхам бүрээр шалгасан төслүүд багтсан.",
          )}
        </p>
        <button type="button" onClick={() => navigate("/")}>
          {text(
            "返回重新选择",
            "Go back and choose again",
            "Буцаж дахин сонгох",
          )}
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
  const stepVisuals = getBuildStepVisuals(step.id, locale);

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
        <span className="build-flow-header__mode">
          {text("打造", "Build", "Бүтээх")}
        </span>
        <Link
          className="build-flow-header__switch"
          to={`/explore/${worldCase.id}/${worldCase.rootNodeId}?view=structure&goal=learn`}
        >
          <ArrowLeft size={14} />
          {text(
            "拆开看关系",
            "Explore the relationships",
            "Холбоосыг задлан харах",
          )}
        </Link>
        <LanguageSwitch />
      </header>

      <section className="explorer-toolbar">
        <div className="build-flow-toolbar__title">
          <strong>
            {text("从零到一", "Start to finish", "Эхнээс нь дуустал")}
          </strong>
          <span>{guide.totalTime}</span>
        </div>
        <div
          className="build-flow-progress"
          role="progressbar"
          aria-label={text(
            "打造完成进度",
            "Build progress",
            "Бүтээх явц",
          )}
          aria-valuemin={0}
          aria-valuemax={guide.steps.length}
          aria-valuenow={completedSteps}
        >
          <span>
            {text(
              `已完成 ${completedSteps}/${guide.steps.length}`,
              `${completedSteps}/${guide.steps.length} complete`,
              `${completedSteps}/${guide.steps.length} дууссан`,
            )}
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
              <span className="eyebrow">
                {text("打造链路", "Build path", "Бүтээх зам")}
              </span>
              <h1>{guide.title}</h1>
              <p>
                {text(
                  "点击任一步，右侧会给出能直接执行的操作与验收结果。",
                  "Select any step to see exact actions and a clear success check.",
                  "Аль ч алхмыг сонгож, яг хийх үйлдэл ба амжилтын шалгуурыг баруун талд харна уу.",
                )}
              </p>
            </div>

            <div className="workflow-direction" aria-hidden="true">
              <span>{text("准备", "Prepare", "Бэлтгэл")}</span>
              <i />
              <span>{text("网页上线", "Site online", "Вэб ажиллана")}</span>
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
              aria-label={text(
                "打造步骤链路",
                "Build steps",
                "Бүтээх алхмууд",
              )}
              proOptions={{ hideAttribution: true }}
            />
          </div>
        </section>

        <aside className="build-inspector">
          <div className="build-inspector__body" ref={inspectorBodyRef}>
            <header className="build-inspector__header">
              <div className="build-inspector__meta">
                <span>
                  {text(
                    `第 ${stepIndex + 1} / ${guide.steps.length} 步`,
                    `Step ${stepIndex + 1} of ${guide.steps.length}`,
                    `${guide.steps.length}-аас ${stepIndex + 1}-р алхам`,
                  )}
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
              <NetworkConnectionMap mode={step.id} translate={text} />
            )}

            {step.deviceState && (
              <div
                className="build-device-state"
                aria-label={text(
                  "开始这一步时的设备状态",
                  "Device state at the start of this step",
                  "Энэ алхмын эхэн дэх төхөөрөмжийн төлөв",
                )}
              >
                <span>
                  {text(
                    "当前连接状态",
                    "Current connection state",
                    "Одоогийн холболтын төлөв",
                  )}
                </span>
                <strong>{step.deviceState}</strong>
              </div>
            )}

            {step.mentalModel && (
              <div className="runbook-mental-model">
                <strong>
                  {text(
                    "先理解这一步",
                    "Understand this step first",
                    "Эхлээд энэ алхмыг ойлгоорой",
                  )}
                </strong>
                <p>{step.mentalModel}</p>
              </div>
            )}

            {["choose-image", "identify-card", "flash-card"].includes(
              step.id,
            ) && (
              <div className="runbook-definition">
                <strong>
                  {text(
                    "烧录，不是复制文件",
                    "Flash the card—do not copy files",
                    "Карт руу бичихээс, файл хуулахаас өөр",
                  )}
                </strong>
                <p>
                  {text(
                    "烧录工具会把整个 Linux 系统按启动格式写进 TF 卡。不要把下载文件直接拖进卡里。",
                    "The flashing tool writes the complete Linux system in a bootable format. Do not drag the downloaded file onto the card.",
                    "Бичих хэрэгсэл Linux системийг бүхэлд нь ачаалах хэлбэрээр TF карт руу бичнэ. Татсан файлыг карт руу зүгээр хуулж болохгүй.",
                  )}
                </p>
              </div>
            )}

            {["identify-card", "flash-card"].includes(step.id) && (
              <div className="runbook-stop-rule">
                <CircleAlert size={17} />
                <span>
                  {step.id === "identify-card"
                    ? text(
                        "这里只确认哪一个设备是 TF 卡，先不写入。出现两个候选设备，就停止。",
                        "Only identify the TF card here—do not write anything yet. Stop if two devices could be the card.",
                        "Энд зөвхөн аль нь TF карт болохыг тогтооно — одоохондоо бүү бич. Хоёр боломжит төхөөрөмж байвал зогсоно уу.",
                      )
                    : text(
                        "这里只允许清空已经确认容量的 TF 卡。目标设备有一点不确定，就停止写入。",
                        "Only erase the TF card whose capacity you already confirmed. Stop if there is any doubt about the target.",
                        "Зөвхөн багтаамжийг нь баталсан TF картыг устгана. Зорилтот төхөөрөмжид эргэлзээ байвал бичихээ зогсооно уу.",
                      )}
                </span>
              </div>
            )}

            {(needsIp || needsUsername) && (
              <section
                className="runbook-device"
                aria-label={text(
                  "本次设备信息",
                  "Device information",
                  "Төхөөрөмжийн мэдээлэл",
                )}
              >
                <div>
                  <strong>
                    {text("本次设备", "Your device", "Таны төхөөрөмж")}
                  </strong>
                  <span>
                    {text(
                      "填一次，后面的命令会自动带入。",
                      "Enter this once and later commands will fill it in automatically.",
                      "Нэг удаа оруулахад дараагийн командуудад автоматаар орно.",
                    )}
                  </span>
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
                      placeholder={text(
                        "例如 192.168.1.123",
                        "For example, 192.168.1.123",
                        "Жишээ нь 192.168.1.123",
                      )}
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
                        ? text(
                            "格式不对：只填局域网 IPv4，例如 192.168.1.123。",
                            "Invalid format: enter only a local IPv4 address, such as 192.168.1.123.",
                            "Буруу хэлбэр: зөвхөн дотоод сүлжээний IPv4 хаяг оруулна уу, жишээ нь 192.168.1.123.",
                          )
                        : text(
                            "只填四组数字和点，不要带 http://、端口或空格。",
                            "Enter four groups of numbers and dots only—no http://, port, or spaces.",
                            "Зөвхөн дөрвөн бүлэг тоо ба цэг оруулна — http://, порт, зай бүү нэм.",
                          )}
                    </small>
                  </label>
                )}
                {needsUsername && (
                  <label>
                    <span>
                      {text(
                        "你的普通用户名",
                        "Your regular username",
                        "Таны энгийн хэрэглэгчийн нэр",
                      )}
                    </span>
                    <input
                      aria-label={text(
                        "你的普通用户名",
                        "Your regular username",
                        "Таны энгийн хэрэглэгчийн нэр",
                      )}
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
                      placeholder={text(
                        "例如 jie1",
                        "For example, jie1",
                        "Жишээ нь jie1",
                      )}
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
                        ? text(
                            "用户名需以小写字母开头，后面只用小写字母和数字。",
                            "The username must start with a lowercase letter and contain only lowercase letters and numbers.",
                            "Хэрэглэгчийн нэр жижиг латин үсгээр эхэлж, зөвхөн жижиг үсэг ба тоо агуулна.",
                          )
                        : text(
                            "建议使用容易输入的名称，例如 jie1。",
                            "Use a name that is easy to type, such as jie1.",
                            "jie1 гэх мэт бичихэд амархан нэр сонгоно уу.",
                          )}
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
                  <span>
                    {text(
                      "看到相似内容就说明方向正确",
                      "Similar output means you are on the right track",
                      "Үүнтэй төстэй үр дүн гарвал зөв явж байна",
                    )}
                  </span>
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
                  <h3>
                    {text(
                      "开始前确认",
                      "Check before you start",
                      "Эхлэхийн өмнө шалгах",
                    )}
                  </h3>
                  <p>
                    {text(
                      "这些条件不满足，就先不要继续。",
                      "Do not continue until these conditions are met.",
                      "Эдгээр нөхцөл биелтэл цааш бүү үргэлжлүүл.",
                    )}
                  </p>
                </div>
              </div>
              <ul className="runbook-prerequisites">
                {step.prerequisites.map((item) => (
                  <li key={item}>
                    <Circle size={9} />
                    <InstructionText
                      text={item}
                      values={deviceInfo}
                      translate={text}
                    />
                  </li>
                ))}
              </ul>
            </section>

            <section className="runbook-section">
              <div className="runbook-section__title">
                <span>02</span>
                <div>
                  <h3>
                    {text(
                      "照着做",
                      "Follow these actions",
                      "Эдгээр үйлдлийг дагах",
                    )}
                  </h3>
                  <p>
                    {text(
                      "一次只完成一条，看到对应结果再继续。",
                      "Do one action at a time and wait for its expected result.",
                      "Нэг удаад нэг үйлдэл хийгээд, хүлээгдсэн үр дүнг харсны дараа үргэлжлүүл.",
                    )}
                  </p>
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
                        translate={text}
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
                  <h3>
                    {text(
                      "做到这些才算完成",
                      "Success checklist",
                      "Амжилтын шалгах жагсаалт",
                    )}
                  </h3>
                  <p>
                    {text(
                      "逐项勾选，完成状态会显示在左侧链路。",
                      "Check each item. Completed steps appear on the path to the left.",
                      "Зүйл бүрийг тэмдэглэнэ үү. Дууссан алхам зүүн талын замд харагдана.",
                    )}
                  </p>
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
                        translate={text}
                      />
                    </label>
                  );
                })}
              </div>
            </section>

            <details className="runbook-troubleshooting">
              <summary>
                <CircleAlert size={16} />
                {text(
                  "卡住了，先检查这里",
                  "Stuck? Check here first",
                  "Гацсан уу? Эхлээд энд шалга",
                )}
                <ChevronRight size={15} />
              </summary>
              <ul>
                {step.troubleshooting.map((item) => (
                  <li key={item}>
                    <InstructionText
                      text={item}
                      copyable
                      values={deviceInfo}
                      translate={text}
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
              {text("上一步", "Previous", "Өмнөх")}
            </button>
            {stepIndex < guide.steps.length - 1 ? (
              <button
                type="button"
                className="runbook-navigation__primary"
                onClick={() => goToStep(stepIndex + 1)}
              >
                {stepComplete
                  ? text("继续", "Continue", "Үргэлжлүүлэх")
                  : text("下一步", "Next", "Дараах")}{" "}
                · {nextStep?.title}
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
                {text(
                  "完成，回看关系",
                  "Finish and review the relationships",
                  "Дуусгаад холбоосыг дахин харах",
                )}
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
  translate,
}: {
  mode: string;
  translate: Translator;
}) {
  const isSsh = mode === "first-ssh";

  return (
    <section
      className="runbook-network-map"
      aria-label={translate(
        "局域网真实连接关系",
        "Actual local network connection",
        "Дотоод сүлжээний бодит холболт",
      )}
    >
      <header>
        <strong>
          {isSsh
            ? translate(
                "SSH 命令实际走这条路",
                "This is the path taken by SSH",
                "SSH команд энэ замаар явна",
              )
            : translate(
                "三台设备的真实连接",
                "How the three devices really connect",
                "Гурван төхөөрөмжийн бодит холболт",
              )}
        </strong>
        <span>
          {translate(
            "电脑不需要直接连接 Orange Pi",
            "The computer does not connect directly to the Orange Pi",
            "Компьютер Orange Pi-д шууд холбогдох шаардлагагүй",
          )}
        </span>
      </header>
      <div>
        <article>
          <span>01</span>
          <strong>
            {translate(
              "Windows 电脑",
              "Windows computer",
              "Windows компьютер",
            )}
          </strong>
          <small>
            {isSsh
              ? translate(
                  "PowerShell 发出 SSH",
                  "PowerShell sends SSH",
                  "PowerShell SSH хүсэлт илгээнэ",
                )
              : translate(
                  "连接普通 Wi-Fi 或 LAN",
                  "Connected to normal Wi-Fi or LAN",
                  "Энгийн Wi-Fi эсвэл LAN-д холбогдоно",
                )}
          </small>
        </article>
        <i>
          <span>
            {isSsh
              ? translate("SSH 请求", "SSH request", "SSH хүсэлт")
              : translate(
                  "同一局域网",
                  "Same local network",
                  "Нэг дотоод сүлжээ",
                )}
          </span>
        </i>
        <article className="is-router">
          <span>02</span>
          <strong>
            {translate(
              "家用路由器",
              "Home router",
              "Гэрийн чиглүүлэгч",
            )}
          </strong>
          <small>
            {isSsh
              ? translate(
                  "按 IP 转发到板卡",
                  "Forwards by IP to the board",
                  "IP-аар хавтан руу дамжуулна",
                )
              : translate(
                  "给板卡分配 IPv4",
                  "Assigns an IPv4 address to the board",
                  "Хавтанд IPv4 хаяг өгнө",
                )}
          </small>
        </article>
        <i>
          <span>
            {isSsh
              ? "TCP 22"
              : translate("LAN 网线", "LAN cable", "LAN кабель")}
          </span>
        </i>
        <article>
          <span>03</span>
          <strong>Orange Pi</strong>
          <small>
            {isSsh
              ? translate(
                  "返回远程命令行",
                  "Returns the remote terminal",
                  "Алсын терминалыг буцаана",
                )
              : translate(
                  "保持通电并接 LAN 口",
                  "Powered on and connected to a LAN port",
                  "Тэжээлтэй, LAN портод холбогдсон",
                )}
          </small>
        </article>
      </div>
      <p>
        {isSsh
          ? translate(
              "成功后，PowerShell 会从 Windows 提示符切换成 Orange Pi 的 $ 或 # 提示符。",
              "After a successful login, PowerShell changes from the Windows prompt to the Orange Pi $ or # prompt.",
              "Амжилттай нэвтэрсний дараа PowerShell-ийн Windows сануулга Orange Pi-ийн $ эсвэл # сануулга болно.",
            )
          : translate(
              "路由器地址是“前台地址”，Orange Pi IP 是“房间号”；后面真正要填写的是 Orange Pi IP。",
              "Think of the router address as the front desk and the Orange Pi IP as the room number. You need the Orange Pi IP.",
              "Чиглүүлэгчийн хаягийг үүдний ширээ, Orange Pi-ийн IP-г өрөөний дугаар гэж бодоорой. Танд Orange Pi-ийн IP хэрэгтэй.",
            )}
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
  translate,
}: {
  text: string;
  copyable?: boolean;
  values: DeviceInfo;
  translate: Translator;
}) {
  const validIp = isValidPrivateIpv4(values.ip);
  const validUsername = isValidUsername(values.username);
  const hasUnresolvedIp = text.includes("{{IP}}") && !validIp;
  const hasUnresolvedUsername =
    text.includes("{{USER}}") && !validUsername;
  const resolvedText = text
    .replaceAll(
      "{{IP}}",
      validIp
        ? values.ip
        : translate("IP待填写", "IP required", "IP оруулах шаардлагатай"),
    )
    .replaceAll(
      "{{USER}}",
      validUsername
        ? values.username
        : translate(
            "用户名待填写",
            "username required",
            "хэрэглэгчийн нэр шаардлагатай",
          ),
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
              {translate(
                "打开链接 ↗",
                "Open link ↗",
                "Холбоос нээх ↗",
              )}
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
            translate={translate}
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
  translate,
}: {
  command: string;
  disabled?: boolean;
  translate: Translator;
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
      title={
        disabled
          ? translate(
              "先填写上方设备信息",
              "Enter the device details above first",
              "Эхлээд дээрх төхөөрөмжийн мэдээллийг оруулна уу",
            )
          : translate(
              "复制命令",
              "Copy command",
              "Командыг хуулах",
            )
      }
      disabled={disabled}
    >
      <code>{command}</code>
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}
