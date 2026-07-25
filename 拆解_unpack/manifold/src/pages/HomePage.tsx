import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowUp,
  AudioLines,
  Image as ImageIcon,
  LoaderCircle,
  Square,
  X,
} from "lucide-react";

type Attachment = {
  file: File;
  url: string;
};

type UserIntent = "learn" | "build";

type RecognitionResultLike = {
  0: { transcript: string };
};

type RecognitionEventLike = {
  results: ArrayLike<RecognitionResultLike>;
  resultIndex?: number;
};

type RecognitionErrorLike = {
  error: string;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: RecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function HomePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const attachmentRef = useRef<Attachment | null>(null);
  const [prompt, setPrompt] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [listening, setListening] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hint, setHint] = useState("");
  const [intent, setIntent] = useState<UserIntent>("learn");

  useEffect(() => {
    attachmentRef.current = attachment;
  }, [attachment]);

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
      if (attachmentRef.current) {
        URL.revokeObjectURL(attachmentRef.current.url);
      }
    },
    [],
  );

  const attachFile = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) {
      setHint("请选择 JPG、PNG 或 WebP 图片");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setHint("图片请控制在 10 MB 以内");
      return;
    }

    if (attachmentRef.current) {
      URL.revokeObjectURL(attachmentRef.current.url);
    }

    const nextAttachment = {
      file,
      url: URL.createObjectURL(file),
    };
    attachmentRef.current = nextAttachment;
    setAttachment(nextAttachment);
    setHint("图片已添加，补充一句描述会更准确");
  };

  const removeAttachment = () => {
    if (attachmentRef.current) {
      URL.revokeObjectURL(attachmentRef.current.url);
    }
    attachmentRef.current = null;
    setAttachment(null);
    setHint("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleVoiceInput = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      setHint("语音输入已结束");
      return;
    }

    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setHint("当前浏览器不支持语音转文字，请直接输入文字");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      let transcript = "";
      for (
        let index = event.resultIndex ?? 0;
        index < event.results.length;
        index += 1
      ) {
        transcript += event.results[index][0]?.transcript ?? "";
      }
      setPrompt((current) =>
        [current.trim(), transcript.trim()].filter(Boolean).join(" "),
      );
      setHint("语音已转换为文字");
    };
    recognition.onerror = (event) => {
      setListening(false);
      setHint(
        event.error === "not-allowed"
          ? "需要麦克风权限才能使用语音输入"
          : "没有听清，请再试一次",
      );
    };
    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
      setHint("正在聆听…");
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setHint("语音输入暂时不可用，请直接输入文字");
    }
  };

  const generateGraph = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if ((!prompt.trim() && !attachment) || submitting) return;

    recognitionRef.current?.stop();
    setListening(false);
    setSubmitting(true);
    setHint(
      intent === "build"
        ? "正在准备从零到一的执行教程…"
        : "正在整理主要部分与关系…",
    );

    const caseId = "orange-pi-first-boot";
    const params = new URLSearchParams({ from: "conversation" });
    if (prompt.trim()) params.set("q", prompt.trim().slice(0, 120));

    window.setTimeout(() => {
      if (intent === "build") {
        navigate(`/rebuild/${caseId}?${params.toString()}`);
        return;
      }
      params.set("view", "structure");
      params.set("goal", "learn");
      navigate(`/explore/${caseId}?${params.toString()}`);
    }, 520);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const image = Array.from(event.clipboardData.files).find((file) =>
      file.type.startsWith("image/"),
    );
    if (image) attachFile(image);
  };

  const handleDrop = (event: DragEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDragging(false);
    if (submitting) return;
    const image = Array.from(event.dataTransfer.files).find((file) =>
      file.type.startsWith("image/"),
    );
    if (image) attachFile(image);
  };

  const canSubmit = Boolean(prompt.trim() || attachment);

  return (
    <main className="chat-home">
      <header className="chat-home__header">
        <Link
          className="chat-home__wordmark"
          to="/"
          aria-label="manifold 首页"
        >
          manifold
        </Link>
      </header>

      <section className="chat-home__stage">
        <motion.div
          className="chat-home__intro"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1>你要做些什么</h1>
          <p>描述你的目标，从理解到亲手实现。</p>
        </motion.div>

        <motion.div
          className="intent-picker"
          role="group"
          aria-label="选择目标"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.04 }}
        >
          <button
            type="button"
            className={intent === "learn" ? "is-active" : ""}
            aria-pressed={intent === "learn"}
            onClick={() => setIntent("learn")}
            disabled={submitting}
          >
            <strong>拆开</strong>
            <span>看主要部分与关系</span>
          </button>
          <button
            type="button"
            className={intent === "build" ? "is-active" : ""}
            aria-pressed={intent === "build"}
            onClick={() => setIntent("build")}
            disabled={submitting}
          >
            <strong>打造</strong>
            <span>跟着教程从零做到一</span>
          </button>
        </motion.div>

        <motion.form
          className={`conversation-composer ${dragging ? "is-dragging" : ""} ${submitting ? "is-submitting" : ""}`}
          onSubmit={generateGraph}
          aria-busy={submitting}
          onDragEnter={(event) => {
            event.preventDefault();
            if (!submitting) setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setDragging(false);
            }
          }}
          onDrop={handleDrop}
          initial={{ opacity: 0, y: 18, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.46,
            delay: 0.06,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {dragging && (
            <div className="conversation-composer__drop">
              <ImageIcon size={20} />
              松开以添加图片
            </div>
          )}

          {attachment && (
            <figure className="chat-attachment" title={attachment.file.name}>
              <img src={attachment.url} alt="已添加图片的本地预览" />
              <button
                type="button"
                onClick={removeAttachment}
                disabled={submitting}
                aria-label="移除图片"
              >
                <X size={14} />
              </button>
            </figure>
          )}

          <textarea
            disabled={submitting}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onInput={(event) => {
              event.currentTarget.style.height = "auto";
              event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 180)}px`;
            }}
            placeholder={
              attachment
                ? "你想从这张图片里弄懂什么？"
                : intent === "build"
                  ? "描述你想亲手做出来的东西…"
                  : "描述你想拆开理解的东西…"
            }
            rows={1}
            maxLength={500}
            aria-label={
              intent === "build"
                ? "描述想要打造的对象"
                : "描述想要拆解的对象"
            }
            aria-describedby={hint ? "composer-status" : undefined}
          />

          <div className="conversation-composer__actions">
            <div>
              <button
                className="composer-tool"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting}
                aria-label="上传图片"
                title="上传图片"
              >
                <ImageIcon size={18} />
              </button>
              <button
                className={`composer-tool composer-tool--voice ${listening ? "is-listening" : ""}`}
                type="button"
                onClick={toggleVoiceInput}
                disabled={submitting}
                aria-label={listening ? "停止语音输入" : "开始语音输入"}
                title={listening ? "停止语音输入" : "语音输入"}
                aria-pressed={listening}
              >
                {listening ? <Square size={14} /> : <AudioLines size={18} />}
                {listening && (
                  <span className="voice-waves" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                )}
              </button>
            </div>

            <button
              className="composer-submit"
              type="submit"
              disabled={!canSubmit || submitting}
              aria-label={
                intent === "build"
                  ? "确认并开始打造"
                  : "确认并生成关系图"
              }
              title={intent === "build" ? "开始打造" : "生成关系图"}
            >
              {submitting ? (
                <LoaderCircle className="is-spinning" size={18} />
              ) : (
                <ArrowUp size={19} />
              )}
            </button>
          </div>

          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            disabled={submitting}
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => attachFile(event.target.files?.[0])}
          />
        </motion.form>

        {hint && (
          <motion.p
            id="composer-status"
            className="conversation-hint"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            aria-live="polite"
          >
            {hint}
          </motion.p>
        )}
      </section>
    </main>
  );
}
