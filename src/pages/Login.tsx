import { type FormEvent, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { login, register, saveSession } from "../lib/roleosApi";
import { useTranslation } from "../context/LanguageContext";

type AuthMode = "login" | "register";
type StartIntent = "trial-rc" | "buy-rs";

interface LoginPageProps {
  defaultMode?: AuthMode;
}

export default function Login({ defaultMode = "login" }: LoginPageProps) {
  const navigate = useNavigate();
  const { language } = useTranslation();
  const isZh = language === "zh";

  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("RoleOS Workspace");
  const [intent, setIntent] = useState<StartIntent>("trial-rc");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const isRegister = mode === "register";

  const modeTitle = useMemo(() => {
    if (isRegister) {
      return isZh ? "创建 RoleOS 账号" : "Create your RoleOS account";
    }
    return isZh ? "欢迎回来" : "Welcome back";
  }, [isRegister, isZh]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      if (isRegister) {
        const data = await register({
          email: email.trim(),
          password,
          workspaceName: workspaceName.trim() || "RoleOS Workspace"
        });
        saveSession(data.token, [data.workspace]);
        navigate(intent === "buy-rs" ? "/app/self-hosted" : "/app/cloud", { replace: true });
      } else {
        const data = await login({
          email: email.trim(),
          password
        });
        saveSession(data.token, data.workspaces || []);
        navigate("/app", { replace: true });
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : isZh ? "请求失败，请重试。" : "Request failed, please retry.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white p-10 rounded-[2rem] shadow-xl border border-black/5"
      >
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center space-x-2 mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium text-black/40 group-hover:text-black">
              {isZh ? "返回首页" : "Back to homepage"}
            </span>
          </Link>
          <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mx-auto mb-6">
            <span className="text-white font-bold text-2xl">R</span>
          </div>
          <h1 className="text-3xl font-bold">{modeTitle}</h1>
          <p className="text-black/45 mt-2">
            {isRegister
              ? isZh
                ? "一个账号统一使用 RS 与 RC。"
                : "One account for both RS and RC."
              : isZh
              ? "登录 RoleOS 应用中心。"
              : "Login to RoleOS app center."}
          </p>
        </div>

        <div className="mb-6 p-1 bg-zinc-100 rounded-xl grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`py-2 rounded-lg text-sm font-bold transition-colors ${
              mode === "login" ? "bg-white shadow text-black" : "text-black/50"
            }`}
          >
            {isZh ? "登录" : "Login"}
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`py-2 rounded-lg text-sm font-bold transition-colors ${
              mode === "register" ? "bg-white shadow text-black" : "text-black/50"
            }`}
          >
            {isZh ? "注册" : "Signup"}
          </button>
        </div>

        <form className="space-y-5" onSubmit={onSubmit}>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
              className="w-full px-4 py-3 bg-zinc-50 border border-black/5 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">
              {isZh ? "密码（至少 8 位）" : "Password (min 8)"}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              minLength={8}
              required
              className="w-full px-4 py-3 bg-zinc-50 border border-black/5 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
            />
          </div>

          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">
                  {isZh ? "工作空间名称" : "Workspace Name"}
                </label>
                <input
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="RoleOS Workspace"
                  className="w-full px-4 py-3 bg-zinc-50 border border-black/5 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-black/40 mb-2">
                  {isZh ? "开始方式" : "Start With"}
                </label>
                <select
                  value={intent}
                  onChange={(e) => setIntent(e.target.value as StartIntent)}
                  className="w-full px-4 py-3 bg-zinc-50 border border-black/5 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                >
                  <option value="trial-rc">{isZh ? "RC Cloud 试用" : "RC Cloud Trial"}</option>
                  <option value="buy-rs">{isZh ? "购买 RS Self-Hosted" : "RS Self-Hosted"}</option>
                </select>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-black text-white rounded-xl font-bold hover:bg-black/85 transition-all shadow-lg shadow-black/10 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading && <LoaderCircle className="w-4 h-4 animate-spin" />}
            <span>{isRegister ? (isZh ? "创建账号并继续" : "Create account and continue") : isZh ? "登录并继续" : "Login and continue"}</span>
          </button>
        </form>

        {message && (
          <div className="mt-6 p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">{message}</div>
        )}

        <div className="mt-8 pt-8 border-t border-black/5 text-center">
          {isRegister ? (
            <p className="text-sm text-black/40">
              {isZh ? "已有账号？" : "Already have an account?"}
              <button
                type="button"
                className="text-black font-bold hover:underline ml-1"
                onClick={() => setMode("login")}
              >
                {isZh ? "登录" : "Login"}
              </button>
            </p>
          ) : (
            <p className="text-sm text-black/40">
              {isZh ? "还没有账号？" : "No account yet?"}
              <button
                type="button"
                className="text-black font-bold hover:underline ml-1"
                onClick={() => setMode("register")}
              >
                {isZh ? "注册" : "Signup"}
              </button>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
