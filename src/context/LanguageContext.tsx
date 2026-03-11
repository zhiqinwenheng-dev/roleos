import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Language = "zh" | "en";

interface Translations {
  [key: string]: {
    zh: string;
    en: string;
  };
}

const translations: Translations = {
  nav_home: { zh: "首页", en: "Home" },
  nav_product: { zh: "产品", en: "Products" },
  nav_pricing: { zh: "定价", en: "Pricing" },
  nav_download: { zh: "RS 下载", en: "RS Download" },
  nav_cloud: { zh: "Rc 平台", en: "Rc Platform" },
  nav_docs: { zh: "文档", en: "Docs" },
  nav_login: { zh: "登录", en: "Login" },
  nav_app: { zh: "控制台", en: "Console" },
  hero_title_1: { zh: "把 OpenClaw 变成", en: "Turn OpenClaw into a" },
  hero_title_2: { zh: "可交付的工作系统", en: "Deliverable Work System" },
  hero_subtitle: {
    zh: "RoleOS 通过 Role / Kit / Team，把复杂能力变成可部署、可运营、可计费的产品路径。",
    en: "RoleOS turns complex capability into deployable, operational, and billable products with Role / Kit / Team."
  },
  hero_cta_b: { zh: "下载 RS 自托管", en: "Download RS Self-Hosted" },
  hero_cta_c: { zh: "进入 Rc Cloud", en: "Open Rc Cloud" },
  val_1_title: { zh: "同核双形态", en: "One Core, Two Forms" },
  val_1_desc: {
    zh: "RS 与 Rc 共享同一套 Role / Kit / Team 标准，语义一致，不分叉。",
    en: "RS and Rc share the same Role / Kit / Team standard without semantic drift."
  },
  val_2_title: { zh: "快速部署", en: "Fast Deployment" },
  val_2_desc: {
    zh: "RS 支持本地与云主机部署；Rc 注册即用，几分钟内进入可执行状态。",
    en: "RS supports local/server deployment; Rc is ready after signup in minutes."
  },
  val_3_title: { zh: "可运营可计费", en: "Operational & Billable" },
  val_3_desc: {
    zh: "统一账号、订阅、运行记录与审计，支持从试用到付费的完整转化。",
    en: "Unified account, billing, run logs, and audit path from trial to paid usage."
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("zh");

  useEffect(() => {
    const saved = localStorage.getItem("roleos-language");
    if (saved === "zh" || saved === "en") {
      setLanguage(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("roleos-language", language);
  }, [language]);

  const t = (key: string) => translations[key]?.[language] || key;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
}
