import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, Cloud, Download, Github, Languages, LogIn, Menu, X } from "lucide-react";
import { useTranslation } from "../context/LanguageContext";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { t, language, setLanguage } = useTranslation();
  const isZh = language === "zh";

  const navItems = [
    { name: t("nav_home"), path: "/" },
    { name: t("nav_product"), path: "/products" },
    { name: t("nav_pricing"), path: "/pricing" },
    { name: t("nav_download"), path: "/app/self-hosted", icon: <Download className="w-4 h-4" /> },
    { name: t("nav_cloud"), path: "/app/cloud", icon: <Cloud className="w-4 h-4" /> },
    { name: t("nav_docs"), path: "/docs", icon: <BookOpen className="w-4 h-4" /> },
    {
      name: "GitHub",
      path: "https://github.com/zhiqinwenheng-dev/roleos",
      isExternal: true,
      icon: <Github className="w-4 h-4" />
    }
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-black/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">R</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-black">RoleOS</span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            {navItems.map((item) =>
              item.isExternal ? (
                <a
                  key={item.name}
                  href={item.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-black/60 hover:text-black flex items-center space-x-1 transition-colors"
                >
                  {item.icon}
                  <span>{item.name}</span>
                </a>
              ) : (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`text-sm font-medium flex items-center space-x-1 transition-colors ${
                    location.pathname === item.path ? "text-black" : "text-black/60 hover:text-black"
                  }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              )
            )}

            <button
              onClick={() => setLanguage(isZh ? "en" : "zh")}
              className="p-2 text-black/60 hover:text-black transition-colors flex items-center space-x-1"
              title={isZh ? "切换英文" : "Switch to Chinese"}
            >
              <Languages className="w-4 h-4" />
              <span className="text-xs font-bold uppercase">{isZh ? "EN" : "中文"}</span>
            </button>

            <Link
              to="/app"
              className="px-4 py-2 border border-black/10 rounded-full text-sm font-medium hover:bg-black/5"
            >
              {t("nav_app")}
            </Link>

            <Link
              to="/login"
              className="px-4 py-2 bg-black text-white text-sm font-medium rounded-full hover:bg-black/85 transition-colors flex items-center space-x-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{t("nav_login")}</span>
            </Link>
          </div>

          <div className="md:hidden flex items-center space-x-4">
            <button
              onClick={() => setLanguage(isZh ? "en" : "zh")}
              className="p-2 text-black/60 hover:text-black"
            >
              <Languages className="w-5 h-5" />
            </button>
            <button onClick={() => setIsOpen(!isOpen)} className="text-black/60 hover:text-black p-2">
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-black/5 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              {navItems.map((item) =>
                item.isExternal ? (
                  <a
                    key={item.name}
                    href={item.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-3 py-2 text-base font-medium text-black/60 hover:text-black hover:bg-black/5 rounded-md"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="flex items-center space-x-2">
                      {item.icon}
                      <span>{item.name}</span>
                    </div>
                  </a>
                ) : (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`block px-3 py-2 text-base font-medium rounded-md ${
                      location.pathname === item.path
                        ? "text-black bg-black/5"
                        : "text-black/60 hover:text-black hover:bg-black/5"
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="flex items-center space-x-2">
                      {item.icon}
                      <span>{item.name}</span>
                    </div>
                  </Link>
                )
              )}
              <Link
                to="/app"
                className="block px-3 py-2 text-base font-medium text-black border border-black/10 rounded-md text-center"
                onClick={() => setIsOpen(false)}
              >
                {t("nav_app")}
              </Link>
              <Link
                to="/login"
                className="block px-3 py-2 text-base font-medium text-white bg-black rounded-md text-center"
                onClick={() => setIsOpen(false)}
              >
                {t("nav_login")}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

export function Footer() {
  const { language } = useTranslation();
  const isZh = language === "zh";

  return (
    <footer className="bg-white border-t border-black/5 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">R</span>
              </div>
              <span className="text-lg font-bold tracking-tight text-black">RoleOS</span>
            </Link>
            <p className="text-sm text-black/50 max-w-xs">
              {isZh
                ? "同一套标准，两种交付模式：RS（Self-Hosted）与 RC（Cloud）。"
                : "One standard, two delivery modes: RS (Self-Hosted) and RC (Cloud)."}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-black mb-4 uppercase tracking-wider">
              {isZh ? "产品" : "Product"}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/products" className="text-sm text-black/50 hover:text-black">
                  {isZh ? "产品总览" : "Overview"}
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-sm text-black/50 hover:text-black">
                  {isZh ? "定价方案" : "Pricing"}
                </Link>
              </li>
              <li>
                <Link to="/app/cloud" className="text-sm text-black/50 hover:text-black">
                  RC Cloud
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-black mb-4 uppercase tracking-wider">
              {isZh ? "资源" : "Resources"}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/docs" className="text-sm text-black/50 hover:text-black">
                  {isZh ? "文档中心" : "Docs"}
                </Link>
              </li>
              <li>
                <Link to="/app/self-hosted" className="text-sm text-black/50 hover:text-black">
                  RS Console
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/zhiqinwenheng-dev/roleos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-black/50 hover:text-black"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-black mb-4 uppercase tracking-wider">
              {isZh ? "平台" : "Platform"}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/app" className="text-sm text-black/50 hover:text-black">
                  {isZh ? "应用中心" : "App Center"}
                </Link>
              </li>
              <li>
                <Link to="/app/admin" className="text-sm text-black/50 hover:text-black">
                  Admin
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-black/5 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-xs text-black/40">© 2026 RoleOS. All rights reserved.</p>
          <div className="flex space-x-6">
            <a href="#" className="text-xs text-black/40 hover:text-black">
              {isZh ? "隐私政策" : "Privacy"}
            </a>
            <a href="#" className="text-xs text-black/40 hover:text-black">
              {isZh ? "服务条款" : "Terms"}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function MainContainer({ children }: { children: ReactNode }) {
  return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>;
}
