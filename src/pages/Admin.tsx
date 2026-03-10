import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  BarChart3,
  Download,
  Globe,
  Languages,
  LoaderCircle,
  LogOut,
  MessageSquare,
  RefreshCw,
  Save,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { TRANSLATIONS } from '../i18n';

type Overview = {
  totalVisits: number;
  uniqueIps: number;
  todayVisits: number;
  totalDownloads: number;
  kitDownloads: number;
  teamDownloads: number;
  totalPosts: number;
  totalComments: number;
  topPaths: Array<{ path: string; count: number }>;
  topDownloads: Array<{ kind: string; item_id: string; count: number }>;
};

type VisitRow = {
  id: number;
  path: string;
  ip: string;
  user_agent: string;
  referrer: string | null;
  created_at: string;
};

type DownloadRow = {
  id: number;
  kind: string;
  item_id: string;
  source_path: string;
  ip: string;
  created_at: string;
};

type CommunityRow = {
  id: number;
  title: string;
  author: string;
  category: string;
  likes: number;
  status: string;
  created_at: string;
  comment_count: number;
};

type TabKey = 'dashboard' | 'content' | 'visits' | 'downloads' | 'community';
type PageKey = 'home' | 'kits' | 'teams' | 'docs' | 'community' | 'support' | 'global';
type LangKey = 'zh' | 'en';

type PageSection = {
  key: string;
  label: string;
};

type PageConfig = {
  label: string;
  sections: PageSection[];
};

const EMPTY_OVERVIEW: Overview = {
  totalVisits: 0,
  uniqueIps: 0,
  todayVisits: 0,
  totalDownloads: 0,
  kitDownloads: 0,
  teamDownloads: 0,
  totalPosts: 0,
  totalComments: 0,
  topPaths: [],
  topDownloads: [],
};

const PAGE_CONFIG: Record<PageKey, PageConfig> = {
  home: {
    label: '首页',
    sections: [
      { key: 'hero', label: 'Hero 首屏' },
      { key: 'problem', label: '问题引导' },
      { key: 'definitions', label: '核心定义' },
      { key: 'why', label: '为什么选择 RoleOS' },
      { key: 'featured', label: '精选套件' },
      { key: 'servicesHome', label: '产品与服务（首页）' },
      { key: 'features', label: '核心能力矩阵' },
      { key: 'testimonials', label: '用户反馈' },
      { key: 'pricing', label: '服务方案' },
      { key: 'cta', label: '底部行动区' },
    ],
  },
  kits: {
    label: '套件',
    sections: [{ key: 'kitsPage', label: '套件页文案' }],
  },
  teams: {
    label: '团队',
    sections: [
      { key: 'teamsPage', label: '团队页文案' },
      { key: 'teamsHome', label: '首页团队区块' },
    ],
  },
  docs: {
    label: '文档',
    sections: [
      { key: 'docsPage', label: '文档页主体' },
      { key: 'whatIs', label: '什么是 RoleOS' },
      { key: 'relationship', label: 'RoleOS 与 OpenClaw 关系' },
      { key: 'difference', label: 'RoleOS 差异化' },
    ],
  },
  community: {
    label: '社区',
    sections: [{ key: 'community', label: '社区页文案' }],
  },
  support: {
    label: '支持',
    sections: [{ key: 'supportPage', label: '支持页文案' }],
  },
  global: {
    label: '全局',
    sections: [
      { key: 'nav', label: '导航栏' },
      { key: 'footer', label: '页脚' },
    ],
  },
};

const TAB_ITEMS: Array<{ key: TabKey; label: string; icon: any }> = [
  { key: 'dashboard', label: '总览看板', icon: BarChart3 },
  { key: 'content', label: '内容配置', icon: Save },
  { key: 'visits', label: '访问数据', icon: Globe },
  { key: 'downloads', label: '下载数据', icon: Download },
  { key: 'community', label: '社区数据', icon: MessageSquare },
];

const isObject = (value: unknown): value is Record<string, any> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const deepMerge = <T extends Record<string, any>>(base: T, override: Record<string, any>): T => {
  const output: Record<string, any> = { ...base };
  for (const key of Object.keys(override || {})) {
    const baseValue = output[key];
    const overrideValue = override[key];
    if (isObject(baseValue) && isObject(overrideValue)) {
      output[key] = deepMerge(baseValue, overrideValue);
    } else {
      output[key] = overrideValue;
    }
  }
  return output as T;
};

const toFieldPaths = (value: any, prefix = ''): string[] => {
  if (typeof value === 'string') {
    return [prefix];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => toFieldPaths(item, `${prefix}${prefix ? '.' : ''}${index}`));
  }
  if (isObject(value)) {
    return Object.entries(value).flatMap(([key, child]) =>
      toFieldPaths(child, `${prefix}${prefix ? '.' : ''}${key}`),
    );
  }
  return [];
};

const getByPath = (obj: any, path: string) => {
  return path.split('.').reduce((acc, key) => {
    if (acc === undefined || acc === null) {
      return undefined;
    }
    const index = Number(key);
    if (Array.isArray(acc) && Number.isInteger(index)) {
      return acc[index];
    }
    return (acc as Record<string, any>)[key];
  }, obj);
};

const setByPath = (obj: any, path: string, value: string) => {
  const keys = path.split('.');
  let cursor = obj;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i];
    const index = Number(key);
    if (Array.isArray(cursor) && Number.isInteger(index)) {
      if (cursor[index] === undefined) {
        cursor[index] = {};
      }
      cursor = cursor[index];
    } else {
      if (!cursor[key]) {
        cursor[key] = {};
      }
      cursor = cursor[key];
    }
  }

  const last = keys[keys.length - 1];
  const lastIndex = Number(last);
  if (Array.isArray(cursor) && Number.isInteger(lastIndex)) {
    cursor[lastIndex] = value;
  } else {
    cursor[last] = value;
  }
};

const prettyLabel = (path: string) => {
  const key = path.split('.').pop() || path;
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^\w/, (s) => s.toUpperCase());
};

const formatTime = (value: string) => {
  if (!value) {
    return '-';
  }
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

export default function AdminPage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [activePage, setActivePage] = useState<PageKey>('home');
  const [activeLanguage, setActiveLanguage] = useState<LangKey>('zh');
  const [fieldSearch, setFieldSearch] = useState('');
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [translatingFields, setTranslatingFields] = useState<Record<string, boolean>>({});
  const [translateError, setTranslateError] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const [overview, setOverview] = useState<Overview>(EMPTY_OVERVIEW);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [downloads, setDownloads] = useState<DownloadRow[]>([]);
  const [community, setCommunity] = useState<CommunityRow[]>([]);
  const [draftContent, setDraftContent] = useState<Record<string, any>>(TRANSLATIONS as Record<string, any>);

  const dashboardCards = useMemo(
    () => [
      { label: '总访问量', value: overview.totalVisits, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: '独立 IP', value: overview.uniqueIps, icon: Globe, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { label: '今日访问', value: overview.todayVisits, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
      { label: '总下载量', value: overview.totalDownloads, icon: Download, color: 'text-orange-600', bg: 'bg-orange-50' },
      { label: '套件下载', value: overview.kitDownloads, icon: Download, color: 'text-cyan-600', bg: 'bg-cyan-50' },
      { label: '团队下载', value: overview.teamDownloads, icon: Download, color: 'text-amber-600', bg: 'bg-amber-50' },
      { label: '社区帖子', value: overview.totalPosts, icon: MessageSquare, color: 'text-rose-600', bg: 'bg-rose-50' },
      { label: '社区评论', value: overview.totalComments, icon: MessageSquare, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    ],
    [overview],
  );

  const sectionItems = useMemo(() => {
    const languageContent = draftContent?.[activeLanguage] || {};
    const pageSections = PAGE_CONFIG[activePage].sections;

    return pageSections
      .map((section) => {
        const sectionValue = languageContent[section.key];
        const paths = toFieldPaths(sectionValue).filter((path) => {
          const query = fieldSearch.trim().toLowerCase();
          if (!query) {
            return true;
          }
          const text = `${section.key}.${path}`.toLowerCase();
          return text.includes(query);
        });
        return { ...section, paths };
      })
      .filter((section) => section.paths.length > 0 || !fieldSearch.trim());
  }, [activeLanguage, activePage, draftContent, fieldSearch]);

  const request = async (url: string, options?: RequestInit) => {
    const response = await fetch(url, { credentials: 'include', ...options });
    if (response.status === 401) {
      setAuthenticated(false);
      throw new Error('UNAUTHORIZED');
    }
    return response;
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [overviewRes, visitsRes, downloadsRes, communityRes, contentRes] = await Promise.all([
        request('/api/admin/overview'),
        request('/api/admin/visits?limit=150'),
        request('/api/admin/downloads?limit=150'),
        request('/api/admin/community?limit=150'),
        request('/api/admin/content'),
      ]);

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setOverview({ ...EMPTY_OVERVIEW, ...(data.overview || {}) });
      }
      if (visitsRes.ok) {
        const data = await visitsRes.json();
        setVisits(data.visits || []);
      }
      if (downloadsRes.ok) {
        const data = await downloadsRes.json();
        setDownloads(data.downloads || []);
      }
      if (communityRes.ok) {
        const data = await communityRes.json();
        setCommunity(data.posts || []);
      }
      if (contentRes.ok) {
        const data = await contentRes.json();
        const merged = deepMerge(TRANSLATIONS as Record<string, any>, data.overrides || {});
        setDraftContent(merged);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/admin/session', { credentials: 'include' });
        if (!response.ok) {
          setAuthenticated(false);
          return;
        }
        const data = await response.json();
        setAuthenticated(Boolean(data.authenticated));
      } finally {
        setCheckingSession(false);
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    if (authenticated) {
      loadAll();
    }
  }, [authenticated]);

  const login = async () => {
    setLoginError('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        setLoginError('密码错误，请重试。');
        return;
      }
      setPassword('');
      setAuthenticated(true);
    } catch {
      setLoginError('登录失败，请稍后重试。');
    }
  };

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    setAuthenticated(false);
  };

  const updateField = (lang: LangKey, sectionKey: string, fieldPath: string, value: string) => {
    setDraftContent((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      setByPath(next, `${lang}.${sectionKey}.${fieldPath}`, value);
      return next;
    });
  };

  const runAutoTranslate = async (sectionKey: string, fieldPath: string, text: string) => {
    const fullKey = `${sectionKey}.${fieldPath}`;
    const normalized = text.trim();
    if (!normalized) {
      updateField('en', sectionKey, fieldPath, '');
      return;
    }

    setTranslatingFields((prev) => ({ ...prev, [fullKey]: true }));
    setTranslateError('');
    try {
      const response = await request('/api/admin/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: normalized,
          sourceLang: 'zh',
          targetLang: 'en',
          context: `${activePage}.${sectionKey}.${fieldPath}`,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setTranslateError(payload?.error || '自动翻译失败，请稍后重试。');
        return;
      }

      updateField('en', sectionKey, fieldPath, String(payload.translatedText || normalized));
    } catch {
      setTranslateError('自动翻译失败，请检查翻译服务配置（DEEPSEEK_API_KEY）。');
    } finally {
      setTranslatingFields((prev) => ({ ...prev, [fullKey]: false }));
    }
  };

  const handleFieldBlur = (sectionKey: string, fieldPath: string, value: string) => {
    if (activeLanguage !== 'zh' || !autoTranslate) {
      return;
    }
    runAutoTranslate(sectionKey, fieldPath, value);
  };

  const saveContent = async () => {
    setSaving(true);
    setSaveMessage('');
    try {
      const response = await request('/api/admin/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides: draftContent }),
      });
      if (!response.ok) {
        setSaveMessage('保存失败，请稍后重试。');
        return;
      }
      setSaveMessage('保存成功，前台内容已同步。');
      window.dispatchEvent(new Event('roleos-content-updated'));
    } finally {
      setSaving(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="pt-32 min-h-screen bg-slate-50 flex items-start justify-center">
        <div className="text-slate-500">正在检查后台会话...</div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="pt-20 min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md p-10 rounded-[2.5rem] bg-white border border-slate-100 shadow-2xl shadow-slate-200/40"
        >
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-8">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-3">后台登录</h1>
          <p className="text-slate-500 mb-8">访问 `/admin` 后输入管理员密码。</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                login();
              }
            }}
            placeholder="管理员密码"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          />
          {loginError && <p className="text-sm text-red-500 mb-4">{loginError}</p>}
          <button
            onClick={login}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all"
          >
            登录
          </button>
          <p className="text-xs text-slate-400 mt-4">可通过环境变量 `ADMIN_PASSWORD` 设置后台密码。</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-24 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
          <div>
            <h1 className="text-5xl font-bold tracking-tight text-gradient mb-3">RoleOS 管理后台</h1>
            <p className="text-slate-500 text-lg">统一管理内容、访问、下载与社区数据。</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadAll}
              className="inline-flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 px-5 py-3 border border-slate-200 bg-white rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all"
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {dashboardCards.map((card, idx) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm"
                >
                  <div className={`w-11 h-11 rounded-xl ${card.bg} ${card.color} flex items-center justify-center mb-4`}>
                    <card.icon className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-500">{card.label}</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">{card.value}</p>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="p-8 rounded-[2rem] bg-white border border-slate-100 shadow-sm">
                <h2 className="text-2xl font-bold mb-6">热门访问页面</h2>
                <div className="space-y-3">
                  {overview.topPaths.map((item, idx) => (
                    <div key={`${item.path}-${idx}`} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="font-semibold text-slate-700">{item.path}</span>
                      <span className="font-bold text-blue-600">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-8 rounded-[2rem] bg-white border border-slate-100 shadow-sm">
                <h2 className="text-2xl font-bold mb-6">下载排行</h2>
                <div className="space-y-3">
                  {overview.topDownloads.map((item, idx) => (
                    <div key={`${item.kind}-${item.item_id}-${idx}`} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="font-semibold text-slate-700">{item.kind} / {item.item_id}</span>
                      <span className="font-bold text-orange-600">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-5">
              <div className="flex flex-wrap gap-3">
                {(Object.keys(PAGE_CONFIG) as PageKey[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setActivePage(key)}
                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                      activePage === key
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {PAGE_CONFIG[key].label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <button
                  onClick={() => setActiveLanguage('zh')}
                  className={`px-4 py-2 rounded-xl font-bold transition-all ${
                    activeLanguage === 'zh' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  中文
                </button>
                <button
                  onClick={() => setActiveLanguage('en')}
                  className={`px-4 py-2 rounded-xl font-bold transition-all ${
                    activeLanguage === 'en' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  English
                </button>

                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={autoTranslate}
                    onChange={(e) => setAutoTranslate(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <Languages className="w-4 h-4" />
                  中文改动自动翻译英文
                </label>

                <input
                  value={fieldSearch}
                  onChange={(e) => setFieldSearch(e.target.value)}
                  placeholder="搜索字段，如 title / subtitle / cta"
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 min-w-[280px]"
                />

                <button
                  onClick={saveContent}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-70"
                >
                  <Save className="w-4 h-4" />
                  {saving ? '保存中...' : '保存配置'}
                </button>
              </div>

              <div className="text-xs text-slate-500">
                当前页面: <span className="font-bold text-slate-700">{PAGE_CONFIG[activePage].label}</span>
                {' · '}
                当前语言: <span className="font-bold text-slate-700">{activeLanguage === 'zh' ? '中文' : 'English'}</span>
              </div>
            </div>

            {saveMessage && <p className="text-sm font-semibold text-slate-700">{saveMessage}</p>}
            {translateError && <p className="text-sm font-semibold text-amber-600">{translateError}</p>}

            {sectionItems.length === 0 && (
              <div className="p-8 rounded-2xl bg-white border border-slate-100 text-slate-500">
                未找到匹配字段，请调整搜索关键词。
              </div>
            )}

            <div className="space-y-6">
              {sectionItems.map((section) => {
                const sectionValue = draftContent?.[activeLanguage]?.[section.key];
                const paths = toFieldPaths(sectionValue).filter((path) => {
                  const query = fieldSearch.trim().toLowerCase();
                  if (!query) {
                    return true;
                  }
                  return `${section.key}.${path}`.toLowerCase().includes(query);
                });

                if (paths.length === 0) {
                  return (
                    <div key={section.key} className="p-8 rounded-[2rem] bg-white border border-slate-100 shadow-sm">
                      <h3 className="text-2xl font-bold mb-3">{section.label}</h3>
                      <p className="text-slate-500 text-sm">该区块暂未找到可编辑文本字段。</p>
                    </div>
                  );
                }

                return (
                  <div key={section.key} className="p-8 rounded-[2rem] bg-white border border-slate-100 shadow-sm">
                    <h3 className="text-2xl font-bold mb-2">{section.label}</h3>
                    <p className="text-xs text-slate-400 mb-6">section key: {section.key}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {paths.map((path) => {
                        const fullPath = `${activeLanguage}.${section.key}.${path}`;
                        const value = String(getByPath(draftContent, fullPath) ?? '');
                        const fieldKey = `${section.key}.${path}`;
                        const isTranslating = Boolean(translatingFields[fieldKey]);
                        return (
                          <div key={fieldKey} className="space-y-2">
                            <label className="text-sm font-semibold text-slate-600">{prettyLabel(path)}</label>
                            {value.length > 90 ? (
                              <textarea
                                value={value}
                                onChange={(e) => updateField(activeLanguage, section.key, path, e.target.value)}
                                onBlur={(e) => handleFieldBlur(section.key, path, e.target.value)}
                                className="w-full min-h-[96px] px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            ) : (
                              <input
                                value={value}
                                onChange={(e) => updateField(activeLanguage, section.key, path, e.target.value)}
                                onBlur={(e) => handleFieldBlur(section.key, path, e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            )}
                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                              <span>{section.key}.{path}</span>
                              {isTranslating && (
                                <span className="inline-flex items-center gap-1 text-blue-600">
                                  <LoaderCircle className="w-3 h-3 animate-spin" />
                                  翻译中
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'visits' && (
          <div className="p-8 rounded-[2rem] bg-white border border-slate-100 shadow-sm overflow-x-auto">
            <h2 className="text-2xl font-bold mb-6">访问记录（含 IP）</h2>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="py-3 pr-4">时间</th>
                  <th className="py-3 pr-4">路径</th>
                  <th className="py-3 pr-4">IP</th>
                  <th className="py-3 pr-4">来源</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50">
                    <td className="py-3 pr-4 text-slate-600">{formatTime(row.created_at)}</td>
                    <td className="py-3 pr-4 font-semibold text-slate-800">{row.path}</td>
                    <td className="py-3 pr-4 text-slate-600">{row.ip || '-'}</td>
                    <td className="py-3 pr-4 text-slate-600">{row.referrer || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'downloads' && (
          <div className="p-8 rounded-[2rem] bg-white border border-slate-100 shadow-sm overflow-x-auto">
            <h2 className="text-2xl font-bold mb-6">下载记录（Kit / Team）</h2>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="py-3 pr-4">时间</th>
                  <th className="py-3 pr-4">类型</th>
                  <th className="py-3 pr-4">ID</th>
                  <th className="py-3 pr-4">IP</th>
                  <th className="py-3 pr-4">来源页面</th>
                </tr>
              </thead>
              <tbody>
                {downloads.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50">
                    <td className="py-3 pr-4 text-slate-600">{formatTime(row.created_at)}</td>
                    <td className="py-3 pr-4 font-semibold text-slate-800">{row.kind}</td>
                    <td className="py-3 pr-4 text-slate-600">{row.item_id}</td>
                    <td className="py-3 pr-4 text-slate-600">{row.ip || '-'}</td>
                    <td className="py-3 pr-4 text-slate-600">{row.source_path || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'community' && (
          <div className="p-8 rounded-[2rem] bg-white border border-slate-100 shadow-sm overflow-x-auto">
            <h2 className="text-2xl font-bold mb-6">社区数据（帖子 / 留言）</h2>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="py-3 pr-4">标题</th>
                  <th className="py-3 pr-4">作者</th>
                  <th className="py-3 pr-4">分类</th>
                  <th className="py-3 pr-4">状态</th>
                  <th className="py-3 pr-4">点赞</th>
                  <th className="py-3 pr-4">评论数</th>
                  <th className="py-3 pr-4">创建时间</th>
                </tr>
              </thead>
              <tbody>
                {community.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50">
                    <td className="py-3 pr-4 font-semibold text-slate-800">{row.title}</td>
                    <td className="py-3 pr-4 text-slate-600">{row.author}</td>
                    <td className="py-3 pr-4 text-slate-600">{row.category}</td>
                    <td className="py-3 pr-4 text-slate-600">{row.status}</td>
                    <td className="py-3 pr-4 text-slate-600">{row.likes}</td>
                    <td className="py-3 pr-4 text-slate-600">{row.comment_count}</td>
                    <td className="py-3 pr-4 text-slate-600">{formatTime(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
