import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Github, 
  BookOpen, 
  LifeBuoy, 
  Package, 
  Users, 
  ChevronRight, 
  ExternalLink, 
  Mail, 
  Twitter, 
  Send,
  Heart,
  Menu,
  X,
  ArrowRight,
  Globe,
  Download,
  UserCheck,
  Cpu,
  Copy,
  Check
} from 'lucide-react';
import { useState, useEffect, createContext, useContext } from 'react';
import { KITS, TEAMS } from './constants';
import { Language, TRANSLATIONS, getKitTranslation, getTeamTranslation } from './i18n';
import { Features } from './components/Features';
import Community from './pages/Community';
import AdminPage from './pages/Admin';

// --- Context ---

const LanguageContext = createContext<{
  lang: Language;
  setLang: (lang: Language) => void;
  t: any;
}>({
  lang: 'zh',
  setLang: () => {},
  t: TRANSLATIONS.zh
});

export const useTranslation = () => useContext(LanguageContext);

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

const ScrollManager = () => {
  const location = useLocation();

  useEffect(() => {
    const currentPath = `${location.pathname}${location.hash || ''}`;

    const globalWindow = window as typeof window & { __roleosLastTrackedPath?: string };
    if (globalWindow.__roleosLastTrackedPath !== currentPath) {
      globalWindow.__roleosLastTrackedPath = currentPath;
      fetch('/api/track/pageview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: currentPath }),
      }).catch(() => {});
    }

    const pageTitleMap: Record<string, string> = {
      '/': 'RoleOS | Open-source Roles, Kits, and Teams for OpenClaw',
      '/kits': 'RoleOS | Role Kits',
      '/teams': 'RoleOS | Role Teams',
      '/docs': 'RoleOS | Documentation',
      '/community': 'RoleOS | Community',
      '/support': 'RoleOS | Support & Services',
      '/admin': 'RoleOS | Admin Dashboard',
    };
    document.title = pageTitleMap[location.pathname] || pageTitleMap['/'];

    if (location.hash) {
      const targetId = decodeURIComponent(location.hash.slice(1));
      requestAnimationFrame(() => {
        const target = document.getElementById(targetId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname, location.hash]);

  return null;
};

// --- Components ---

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { lang, setLang, t } = useTranslation();

  const navLinks = [
    { name: t.nav.home, path: '/' },
    { name: t.nav.kits, path: '/kits' },
    { name: t.nav.teams, path: '/teams' },
    { name: t.nav.docs, path: '/docs' },
    { name: t.nav.community, path: '/community' },
    { name: t.nav.support, path: '/support' },
  ];

  const handleNavJump = (path: string) => {
    if (location.pathname === path && !location.hash) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setIsOpen(false);
  };

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-7xl">
      <div className="glass rounded-2xl px-4 sm:px-6">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-105 transition-transform">
              <span className="text-white font-bold text-xl">R</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">RoleOS<span className="text-blue-600">.ai</span></span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => handleNavJump(link.path)}
                className={`text-sm font-semibold transition-all hover:text-blue-600 relative py-1 ${
                  location.pathname === link.path ? 'text-blue-600' : 'text-slate-600'
                }`}
              >
                {link.name}
                {location.pathname === link.path && (
                  <motion.div 
                    layoutId="nav-underline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"
                  />
                )}
              </Link>
            ))}
            
            <div className="h-4 w-px bg-slate-200 mx-2" />

            <a 
              href="https://github.com/roleos" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
            
            <button 
              onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
            >
              <Globe className="w-3.5 h-3.5" />
              {lang === 'en' ? '中文' : 'EN'}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button 
              onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Globe className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden mt-2 glass rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="px-4 pt-2 pb-6 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => handleNavJump(link.path)}
                  className={`block px-4 py-3 text-base font-bold rounded-xl transition-colors ${
                    location.pathname === link.path 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              <div className="h-px bg-slate-100 my-2" />
              <a
                href="https://github.com/roleos"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 text-base font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors"
              >
                <Github className="w-5 h-5" />
                GitHub
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer className="bg-slate-900 text-white pt-24 pb-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-white opacity-[0.02] pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">R</span>
              </div>
              <span className="text-xl font-bold tracking-tight">RoleOS<span className="text-blue-600">.ai</span></span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              {t.hero.description}
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-blue-600 hover:border-blue-500 transition-all">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="https://github.com/roleos" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-blue-600 hover:border-blue-500 transition-all">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-blue-600 hover:border-blue-500 transition-all">
                <Send className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold mb-6 text-white uppercase tracking-widest text-xs">{t.footer.resources}</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><Link to="/kits" className="hover:text-blue-400 transition-colors">{t.nav.kits}</Link></li>
              <li><Link to="/teams" className="hover:text-blue-400 transition-colors">{t.nav.teams}</Link></li>
              <li><Link to="/community" className="hover:text-blue-400 transition-colors">{t.nav.community}</Link></li>
              <li><Link to="/docs" className="hover:text-blue-400 transition-colors">{t.nav.docs}</Link></li>
              <li><a href="https://github.com/roleos/registry" className="hover:text-blue-400 transition-colors">Registry</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold mb-6 text-white uppercase tracking-widest text-xs">{t.footer.support}</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><Link to="/support" className="hover:text-blue-400 transition-colors">{t.nav.support}</Link></li>
              <li><a href="mailto:support@roleos.ai" className="hover:text-blue-400 transition-colors">Email Support</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Community</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Donation</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold mb-6 text-white uppercase tracking-widest text-xs">Legal</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><a href="#" className="hover:text-blue-400 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">MIT License</a></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-slate-500 text-xs font-bold">
          <p>{t.footer.copyright} {t.footer.builtFor} OpenClaw.</p>
          <div className="flex gap-8">
            <span className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              System Operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

// --- Pages ---

const HomePage = () => {
  const { t, lang } = useTranslation();
  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden hero-mesh py-24 sm:py-40">
        <div className="absolute inset-0 bg-grid opacity-[0.03] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-bold mb-8 animate-float"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              {t.hero.badge}
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-6xl sm:text-8xl font-bold tracking-tight mb-8 text-gradient"
            >
              RoleOS
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl sm:text-3xl text-slate-700 mb-6 font-semibold leading-tight"
            >
              {t.hero.subtitle}
            </motion.p>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg sm:text-xl text-slate-500 mb-12 leading-relaxed max-w-3xl mx-auto"
            >
              {t.hero.description}
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap justify-center gap-4"
            >
              <Link to="/docs#quick-start" className="px-10 py-5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-2xl shadow-blue-500/20 flex items-center gap-2 active:scale-95">
                {t.hero.getStarted} <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/kits" className="px-10 py-5 glass text-slate-900 font-bold rounded-2xl border border-slate-200 hover:border-slate-300 transition-all flex items-center gap-2 active:scale-95">
                {t.hero.browseKits}
              </Link>
              <a
                href="https://openclaw.io"
                target="_blank"
                rel="noopener noreferrer"
                className="px-10 py-5 bg-white text-slate-900 font-bold rounded-2xl border border-slate-200 hover:border-slate-300 transition-all flex items-center gap-2 active:scale-95"
              >
                {t.hero.installOpenClaw} <ExternalLink className="w-4 h-4" />
              </a>
              <Link to="/support" className="px-10 py-5 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all flex items-center gap-2 active:scale-95">
                {t.hero.supportRoleOS}
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Core Definitions */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div 
              whileHover={{ y: -8 }}
              className="p-10 rounded-[2.5rem] bg-white border border-slate-100 hover:border-blue-200 transition-all group shadow-xl shadow-slate-200/20"
            >
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
                <Package className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4">{t.definitions.role.title}</h3>
              <p className="text-slate-600 leading-relaxed text-lg">
                {t.definitions.role.desc}
              </p>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -8 }}
              className="p-10 rounded-[2.5rem] bg-white border border-slate-100 hover:border-emerald-200 transition-all group shadow-xl shadow-slate-200/20"
            >
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-sm">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4">{t.definitions.kit.title}</h3>
              <p className="text-slate-600 leading-relaxed text-lg">
                {t.definitions.kit.desc}
              </p>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -8 }}
              className="p-10 rounded-[2.5rem] bg-white border border-slate-100 hover:border-purple-200 transition-all group shadow-xl shadow-slate-200/20"
            >
              <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 shadow-sm">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4">{t.definitions.team.title}</h3>
              <p className="text-slate-600 leading-relaxed text-lg">
                {t.definitions.team.desc}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why RoleOS */}
      <section className="py-24 bg-slate-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-[0.03] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 tracking-tight text-slate-900">{t.why.title}</h2>
            <p className="text-xl text-slate-500 leading-relaxed">{t.why.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: t.why.item1Title, desc: t.why.item1Desc, color: 'text-blue-600', bg: 'bg-blue-50' },
              { title: t.why.item2Title, desc: t.why.item2Desc, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { title: t.why.item3Title, desc: t.why.item3Desc, color: 'text-purple-600', bg: 'bg-purple-50' }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className="p-8 rounded-[2.5rem] bg-white border border-slate-100 hover:border-blue-200 transition-all shadow-sm"
              >
                <div className={`w-12 h-12 rounded-xl ${item.bg} ${item.color} flex items-center justify-center mb-6`}>
                  <ChevronRight className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-slate-900">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Content */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
            <div>
              <h2 className="text-4xl font-bold mb-4 tracking-tight">{t.featured.kitsTitle}</h2>
              <p className="text-xl text-slate-500">{t.featured.kitsSubtitle}</p>
            </div>
            <Link to="/kits" className="group px-6 py-3 rounded-xl bg-slate-50 text-blue-600 font-bold hover:bg-blue-50 transition-all flex items-center gap-2">
              {t.featured.viewAll} <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {KITS.map((kit, idx) => {
              const kitT = getKitTranslation(kit, lang);
              return (
                <motion.div 
                  key={kit.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="group p-8 rounded-3xl border border-slate-200 hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-500/10 transition-all bg-white relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4">
                    <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-widest ${
                      kit.status === 'Ready' ? 'bg-emerald-100 text-emerald-700' : 
                      kit.status === 'Preview' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {kit.status}
                    </span>
                  </div>
                  
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-50 transition-colors">
                    <Package className="w-6 h-6 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-3 group-hover:text-blue-600 transition-colors">{kitT.name}</h3>
                  <p className="text-slate-500 text-base mb-8 line-clamp-3 leading-relaxed">{kitT.description}</p>
                  
                  <Link to="/kits" className="inline-flex items-center gap-2 text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors">
                    {t.featured.learnMore} <ArrowRight className="w-4 h-4" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <Features />

      {/* Products & Services */}
      <section className="py-32 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-[0.02] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl sm:text-6xl font-bold mb-6 tracking-tight text-gradient">{t.servicesHome.title}</h2>
            <p className="text-xl text-slate-500 leading-relaxed">{t.servicesHome.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-10 rounded-[3rem] bg-white border border-slate-100 hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-500/10 transition-all group shadow-sm"
            >
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
                <LifeBuoy className="w-8 h-8" />
              </div>
              <h3 className="text-3xl font-bold mb-4 group-hover:text-blue-600 transition-colors">{t.servicesHome.product1Title}</h3>
              <p className="text-slate-600 mb-8 leading-relaxed">{t.servicesHome.product1Desc}</p>
              <ul className="space-y-3 mb-10 text-slate-600">
                {[t.servicesHome.product1Item1, t.servicesHome.product1Item2, t.servicesHome.product1Item3, t.servicesHome.product1Item4].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 font-semibold text-sm">
                    <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <ChevronRight className="w-2.5 h-2.5" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 mb-6">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">{t.servicesHome.contactTitle}</p>
                <p className="text-sm font-semibold text-slate-700 mb-2">{t.servicesHome.emailLabel}: expert@roleos.ai</p>
                <p className="text-sm font-semibold text-slate-700">{t.servicesHome.wechatLabel}: {t.servicesHome.wechatValue}</p>
              </div>
              <a
                href="mailto:expert@roleos.ai"
                className="block w-full py-4 bg-blue-600 text-white text-center font-bold rounded-2xl hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100"
              >
                {t.servicesHome.buyNow}
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08 }}
              className="p-10 rounded-[3rem] bg-white border border-slate-100 hover:border-orange-400 hover:shadow-2xl hover:shadow-orange-500/10 transition-all group shadow-sm"
            >
              <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-orange-600 group-hover:text-white transition-all duration-300 shadow-sm">
                <Cpu className="w-8 h-8" />
              </div>
              <h3 className="text-3xl font-bold mb-4 group-hover:text-orange-600 transition-colors">{t.servicesHome.product2Title}</h3>
              <p className="text-slate-600 mb-8 leading-relaxed">{t.servicesHome.product2Desc}</p>
              <ul className="space-y-3 mb-10 text-slate-600">
                {[t.servicesHome.product2Item1, t.servicesHome.product2Item2, t.servicesHome.product2Item3, t.servicesHome.product2Item4].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 font-semibold text-sm">
                    <div className="w-4 h-4 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                      <ChevronRight className="w-2.5 h-2.5" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 mb-6">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">{t.servicesHome.contactTitle}</p>
                <p className="text-sm font-semibold text-slate-700 mb-2">{t.servicesHome.emailLabel}: expert@roleos.ai</p>
                <p className="text-sm font-semibold text-slate-700">{t.servicesHome.wechatLabel}: {t.servicesHome.wechatValue}</p>
              </div>
              <a
                href="mailto:expert@roleos.ai"
                className="block w-full py-4 bg-slate-900 text-white text-center font-bold rounded-2xl hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-100"
              >
                {t.servicesHome.buyNow}
              </a>
            </motion.div>
          </div>
        </div>
      </section>


      {/* Conversion Section */}
      <section className="py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="relative rounded-[3rem] bg-blue-600 overflow-hidden p-12 sm:p-24 text-center">
            <div className="absolute inset-0 bg-grid-white opacity-10 pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/50 to-transparent pointer-events-none" />
            
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-4xl sm:text-6xl font-bold text-white mb-8 tracking-tight">{t.cta.title}</h2>
              <p className="text-xl sm:text-2xl text-blue-100 mb-12 leading-relaxed">
                {t.cta.subtitle}
              </p>
              <div className="flex flex-wrap justify-center gap-6">
                <Link to="/docs#quick-start" className="px-12 py-5 bg-white text-blue-600 font-black rounded-2xl hover:bg-blue-50 transition-all shadow-2xl shadow-black/10 active:scale-95">
                  {t.cta.getStarted}
                </Link>
                <Link to="/kits" className="px-12 py-5 bg-blue-700 text-white font-black rounded-2xl hover:bg-blue-800 transition-all flex items-center gap-3 border border-white/10 active:scale-95">
                  {t.cta.browseKits}
                </Link>
                <a
                  href="https://github.com/roleos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-12 py-5 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all flex items-center gap-3 border border-white/10 active:scale-95"
                >
                  <Github className="w-5 h-5" /> {t.cta.joinGithub}
                </a>
                <Link to="/support" className="px-12 py-5 bg-blue-600/20 text-white font-black rounded-2xl hover:bg-blue-600/30 transition-all border border-white/20 active:scale-95">
                  {t.cta.supportRoleOS}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const KitsPage = () => {
  const { t, lang } = useTranslation();
  const location = useLocation();

  const trackDownload = (itemId: string) => {
    fetch('/api/track/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'kit',
        itemId,
        sourcePath: location.pathname,
      }),
    }).catch(() => {});
  };

  return (
    <div className="pt-32 pb-24 bg-white min-h-screen relative">
      <div className="absolute inset-0 bg-grid opacity-[0.02] pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl font-bold mb-6 tracking-tight text-gradient"
          >
            {t.kitsPage.title}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium"
          >
            {t.kitsPage.subtitle}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {KITS.map((kit, idx) => {
            const kitT = getKitTranslation(kit, lang);
            return (
              <motion.div 
                key={kit.id}
                initial={{ opacity: 0, scale: 0.98 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="p-10 rounded-[3rem] bg-white border border-slate-100 hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-500/10 transition-all group shadow-sm"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-10">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                      <Package className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold group-hover:text-blue-600 transition-colors">{kitT.name}</h3>
                      <span className={`inline-block mt-1 px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-widest ${
                        kit.status === 'Ready' ? 'bg-emerald-100 text-emerald-700' : 
                        kit.status === 'Preview' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {kit.status}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => trackDownload(kit.id)}
                    className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2 active:scale-95 shadow-lg shadow-blue-200"
                  >
                    <Download className="w-4 h-4" /> {t.kitsPage.install}
                  </button>
                </div>
                
                <p className="text-slate-600 text-lg mb-10 leading-relaxed">
                  {kitT.description}
                </p>
                
                <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 shadow-inner">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">{t.kitsPage.usage}</h4>
                  <code className="block font-mono text-sm text-blue-400 break-all">
                    claw kit install roleos/{kit.id}
                  </code>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const TeamsPage = () => {
  const { t, lang } = useTranslation();
  const location = useLocation();

  const trackDownload = (itemId: string) => {
    fetch('/api/track/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'team',
        itemId,
        sourcePath: location.pathname,
      }),
    }).catch(() => {});
  };

  return (
    <div className="pt-32 pb-24 bg-white min-h-screen relative">
      <div className="absolute inset-0 bg-grid opacity-[0.02] pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl font-bold mb-6 tracking-tight text-gradient"
          >
            {t.teamsPage.title}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium"
          >
            {t.teamsPage.subtitle}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 gap-12">
          {TEAMS.map((team, idx) => {
            const teamT = getTeamTranslation(team, lang);
            return (
              <motion.div 
                key={team.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="p-10 rounded-[3rem] bg-white border border-slate-100 hover:border-purple-400 hover:shadow-2xl hover:shadow-purple-500/10 transition-all group shadow-sm"
              >
                <div className="flex flex-col lg:flex-row gap-12">
                  <div className="lg:w-1/3">
                    <div className="w-20 h-20 bg-purple-50 rounded-3xl flex items-center justify-center mb-8 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                      <Users className="w-10 h-10 text-purple-600 group-hover:text-white transition-colors" />
                    </div>
                    <h3 className="text-3xl font-bold mb-4 group-hover:text-purple-600 transition-colors">{teamT.name}</h3>
                    <p className="text-slate-600 text-lg leading-relaxed mb-8">
                      {teamT.description}
                    </p>
                    <button
                      onClick={() => trackDownload(team.id)}
                      className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-purple-600 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-slate-200"
                    >
                      <Download className="w-5 h-5" /> {t.teamsPage.deploy}
                    </button>
                  </div>
                  
                  <div className="lg:w-2/3">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8">{t.teamsPage.members}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {teamT.members.map((member: string, mIdx: number) => (
                        <div key={mIdx} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4 group/member hover:bg-white hover:border-purple-200 hover:shadow-md transition-all">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover/member:scale-110 group-hover/member:bg-purple-50 transition-all">
                            <Package className="w-6 h-6 text-slate-400 group-hover/member:text-purple-600" />
                          </div>
                          <span className="font-bold text-slate-700 group-hover/member:text-purple-600 transition-colors">{member}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const DocsPage = () => {
  const { t } = useTranslation();
  return (
    <div className="pt-32 pb-24 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16">
          <aside className="md:col-span-1">
            <nav className="sticky top-32 space-y-2">
              {[
                { id: 'quick-start', name: t.docsPage.quickStart },
                { id: 'concepts', name: t.docsPage.concepts },
                { id: 'what-is-roleos', name: t.whatIs.title },
                { id: 'openclaw-relationship', name: t.relationship.title },
                { id: 'roleos-vs-ai', name: t.difference.title },
                { id: 'role-vs-agent', name: t.docsPage.roleVsAgentTitle },
                { id: 'faq', name: t.docsPage.faq }
              ].map((item) => (
                <a 
                  key={item.id}
                  href={`#${item.id}`} 
                  className="block px-4 py-3 text-sm font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                >
                  {item.name}
                </a>
              ))}
            </nav>
          </aside>
          
          <main className="md:col-span-3 prose prose-slate max-w-none">
            <section id="quick-start" className="mb-24">
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="text-5xl font-bold mb-8 tracking-tight"
              >
                {t.docsPage.quickStart}
              </motion.h1>
              <p className="text-xl text-slate-500 mb-10 leading-relaxed">
                {t.docsPage.subtitle}
              </p>
              <div className="bg-slate-900 rounded-[2rem] p-10 text-slate-300 font-mono text-sm mb-12 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-white opacity-5 pointer-events-none" />
                <div className="relative space-y-8">
                  <div>
                    <p className="text-blue-400 font-bold mb-2"># 1. {t.docsPage.step1Title}</p>
                    <p className="bg-white/5 p-4 rounded-xl border border-white/10">curl -sSL https://openclaw.io/install.sh | sh</p>
                  </div>
                  <div>
                    <p className="text-blue-400 font-bold mb-2"># 2. {t.docsPage.step2Title}</p>
                    <p className="bg-white/5 p-4 rounded-xl border border-white/10">claw repo add roleos https://github.com/roleos/registry</p>
                  </div>
                  <div>
                    <p className="text-blue-400 font-bold mb-2"># 3. {t.docsPage.step3Title}</p>
                    <p className="bg-white/5 p-4 rounded-xl border border-white/10">claw kit install roleos/content-research</p>
                  </div>
                </div>
              </div>
            </section>

            <section id="concepts" className="mb-24">
              <h2 className="text-4xl font-bold mb-12 tracking-tight">{t.docsPage.concepts}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {[
                  { title: 'RoleOS', desc: t.definitions.role.desc, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { title: t.definitions.role.title, desc: t.definitions.role.desc, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { title: t.definitions.kit.title, desc: t.definitions.kit.desc, icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-50' },
                  { title: t.definitions.team.title, desc: t.definitions.team.desc, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' }
                ].map((item, idx) => (
                  <div key={idx} className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all group">
                    <div className={`w-12 h-12 ${item.bg} ${item.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="what-is-roleos" className="mb-24">
              <h2 className="text-4xl font-bold mb-8 tracking-tight">{t.whatIs.title}</h2>
              <div className="p-10 rounded-[2.5rem] bg-slate-50 border border-slate-100">
                <p className="text-lg text-slate-600 leading-relaxed mb-6">{t.whatIs.desc1}</p>
                <p className="text-lg text-slate-600 leading-relaxed mb-8">{t.whatIs.desc2}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[t.whatIs.point1, t.whatIs.point2, t.whatIs.point3].map((item, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-white border border-slate-200 font-semibold text-slate-800">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section id="openclaw-relationship" className="mb-24">
              <h2 className="text-4xl font-bold mb-8 tracking-tight">{t.relationship.title}</h2>
              <div className="p-10 rounded-[2.5rem] bg-blue-50 border border-blue-100">
                <p className="text-lg text-blue-900/90 leading-relaxed mb-8">{t.relationship.subtitle}</p>
                <div className="space-y-4">
                  {[t.relationship.item1, t.relationship.item2, t.relationship.item3].map((item, idx) => (
                    <p key={idx} className="flex gap-3 text-blue-900/80">
                      <ChevronRight className="w-5 h-5 flex-shrink-0 text-blue-600" />
                      <span>{item}</span>
                    </p>
                  ))}
                </div>
              </div>
            </section>

            <section id="roleos-vs-ai" className="mb-24">
              <h2 className="text-4xl font-bold mb-8 tracking-tight">{t.difference.title}</h2>
              <div className="p-10 rounded-[2.5rem] bg-slate-900 text-white">
                <p className="text-lg text-slate-200 leading-relaxed mb-8">{t.difference.subtitle}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[t.difference.point1, t.difference.point2, t.difference.point3].map((item, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-white/10 border border-white/10 font-semibold">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section id="role-vs-agent" className="mb-24">
              <h2 className="text-4xl font-bold mb-8 tracking-tight">{t.docsPage.roleVsAgentTitle}</h2>
              <div className="p-10 rounded-[2.5rem] bg-blue-50 border border-blue-100">
                <p className="text-xl text-blue-900 mb-8 font-semibold leading-relaxed">
                  {t.docsPage.roleVsAgentDesc}
                </p>
                <div className="space-y-4 text-blue-800/80 text-lg">
                  <p className="flex gap-3"><ChevronRight className="w-6 h-6 flex-shrink-0 text-blue-600" /> {t.docsPage.rolePoint}</p>
                  <p className="flex gap-3"><ChevronRight className="w-6 h-6 flex-shrink-0 text-blue-600" /> {t.docsPage.agentPoint}</p>
                </div>
              </div>
            </section>

            <section id="faq" className="mb-24">
              <h2 className="text-4xl font-bold mb-12 tracking-tight">{t.docsPage.faq}</h2>
              <div className="space-y-6">
                {[
                  { q: t.docsPage.q1, a: t.docsPage.a1 },
                  { q: t.docsPage.q2, a: t.docsPage.a2 },
                  { q: t.docsPage.q3, a: t.docsPage.a3 }
                ].map((item, idx) => (
                  <details key={idx} className="group border border-slate-200 rounded-2xl overflow-hidden">
                    <summary className="p-6 font-bold cursor-pointer list-none flex justify-between items-center hover:bg-slate-50 transition-colors">
                      {item.q}
                      <ChevronRight className="w-5 h-5 group-open:rotate-90 transition-transform text-slate-400" />
                    </summary>
                    <div className="p-6 pt-0 text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                      {item.a}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};

const SupportPage = () => {
  const { t } = useTranslation();
  const [isExpertModalOpen, setIsExpertModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyEmail = () => {
    navigator.clipboard.writeText('expert@roleos.ai');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="pt-32 pb-24 bg-white min-h-screen relative">
      <div className="absolute inset-0 bg-grid opacity-[0.02] pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-24">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl font-bold mb-6 tracking-tight text-gradient"
          >
            {t.supportPage.title}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium"
          >
            {t.supportPage.subtitle}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-8 rounded-[2.5rem] bg-white border border-slate-100 hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-500/10 transition-all group shadow-sm flex flex-col"
          >
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
              <LifeBuoy className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold mb-4 group-hover:text-blue-600 transition-colors">{t.supportPage.proTitle}</h3>
            <p className="text-slate-600 mb-8 leading-relaxed flex-grow">
              {t.supportPage.proDesc}
            </p>
            <ul className="space-y-3 mb-10 text-slate-600">
              {[t.supportPage.proItem1, t.supportPage.proItem2, t.supportPage.proItem3, t.supportPage.proItem4].map((item, i) => (
                <li key={i} className="flex items-center gap-3 font-bold text-xs">
                  <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <ChevronRight className="w-2.5 h-2.5" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            <button 
              onClick={() => setIsExpertModalOpen(true)}
              className="block w-full py-4 bg-blue-600 text-white text-center font-bold rounded-2xl hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100"
            >
              {t.supportPage.contact}
            </button>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="p-8 rounded-[2.5rem] bg-white border border-slate-100 hover:border-orange-400 hover:shadow-2xl hover:shadow-orange-500/10 transition-all group shadow-sm flex flex-col"
          >
            <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-orange-600 group-hover:text-white transition-all duration-300 shadow-sm">
              <Cpu className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold mb-4 group-hover:text-orange-600 transition-colors">{t.supportPage.computeTitle}</h3>
            <p className="text-slate-600 mb-8 leading-relaxed flex-grow">
              {t.supportPage.computeDesc}
            </p>
            <ul className="space-y-3 mb-10 text-slate-600">
              {[t.supportPage.computeItem1, t.supportPage.computeItem2, t.supportPage.computeItem3, t.supportPage.computeItem4].map((item, i) => (
                <li key={i} className="flex items-center gap-3 font-bold text-xs">
                  <div className="w-4 h-4 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                    <ChevronRight className="w-2.5 h-2.5" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            <button className="block w-full py-4 bg-slate-900 text-white text-center font-bold rounded-2xl hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-100">
              {t.supportPage.buyNow}
            </button>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="p-8 rounded-[2.5rem] bg-white border border-slate-100 hover:border-emerald-400 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all group shadow-sm flex flex-col"
          >
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-sm">
              <Heart className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold mb-4 group-hover:text-emerald-600 transition-colors">{t.supportPage.donateTitle}</h3>
            <p className="text-slate-600 mb-8 leading-relaxed flex-grow">
              {t.supportPage.donateDesc}
            </p>
            <div className="space-y-4 mb-10">
              <button className="w-full py-4 border border-slate-200 rounded-2xl font-bold hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition-all flex items-center justify-center gap-3 active:scale-95">
                GitHub Sponsors
              </button>
              <button className="w-full py-4 border border-slate-200 rounded-2xl font-bold hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition-all flex items-center justify-center gap-3 active:scale-95">
                Buy Me a Coffee
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center font-black uppercase tracking-[0.2em]">{t.footer.builtFor} OpenClaw</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="p-8 rounded-[2.5rem] bg-white border border-slate-100 hover:border-purple-400 hover:shadow-2xl hover:shadow-purple-500/10 transition-all group shadow-sm flex flex-col"
          >
            <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 shadow-sm">
              <Twitter className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold mb-4 group-hover:text-purple-600 transition-colors">{t.supportPage.communityTitle}</h3>
            <p className="text-slate-600 mb-8 leading-relaxed flex-grow">
              {t.supportPage.communityDesc}
            </p>
            <div className="space-y-3">
              {[
                { icon: Twitter, name: 'Twitter / X', color: 'text-blue-400', bg: 'bg-blue-50', hoverBg: 'hover:bg-blue-50', hoverBorder: 'hover:border-blue-200' },
                { icon: Send, name: 'Telegram', color: 'text-blue-500', bg: 'bg-blue-50', hoverBg: 'hover:bg-blue-50', hoverBorder: 'hover:border-blue-200' },
                { icon: Github, name: 'GitHub', color: 'text-slate-900', bg: 'bg-slate-50', hoverBg: 'hover:bg-slate-50', hoverBorder: 'hover:border-slate-300' }
              ].map((item, i) => (
                <a key={i} href="#" className={`flex items-center justify-between p-4 bg-slate-50 rounded-2xl ${item.hoverBg} ${item.hoverBorder} border border-transparent transition-all group/item`}>
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-5 h-5 ${item.color} group-hover/item:scale-110 transition-transform`} />
                    <span className="font-bold text-sm text-slate-700">{item.name}</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover/item:text-slate-600 transition-colors" />
                </a>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Expert Contact Modal */}
      <AnimatePresence>
        {isExpertModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExpertModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative z-10 overflow-hidden text-center"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-blue-600" />
              <div className="flex justify-end mb-4">
                <button onClick={() => setIsExpertModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400">
                  <X size={20} />
                </button>
              </div>
              
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <Mail size={40} />
              </div>
              
              <h2 className="text-3xl font-bold mb-4 tracking-tight">{t.supportPage.expertContact}</h2>
              <p className="text-slate-500 mb-10 font-medium">
                {t.supportPage.proDesc}
              </p>
              
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8 group">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{t.supportPage.email}</p>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-lg font-bold text-slate-800">expert@roleos.ai</span>
                  <button 
                    onClick={copyEmail}
                    className="p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:text-blue-600 transition-all active:scale-95 shadow-sm"
                  >
                    {copied ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} />}
                  </button>
                </div>
              </div>
              
              <a 
                href="mailto:expert@roleos.ai"
                className="block w-full py-5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
              >
                {t.supportPage.contact}
              </a >
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [lang, setLang] = useState<Language>('zh');
  const [translations, setTranslations] = useState<Record<string, any>>(TRANSLATIONS as Record<string, any>);

  useEffect(() => {
    const loadContentConfig = async () => {
      try {
        const response = await fetch('/api/content');
        if (!response.ok) {
          return;
        }
        const payload = await response.json();
        const overrides = (payload && payload.overrides) || {};
        setTranslations(deepMerge(TRANSLATIONS as Record<string, any>, overrides));
      } catch {
        setTranslations(TRANSLATIONS as Record<string, any>);
      }
    };

    loadContentConfig();

    const onContentUpdated = () => {
      loadContentConfig();
    };

    window.addEventListener('roleos-content-updated', onContentUpdated);
    return () => {
      window.removeEventListener('roleos-content-updated', onContentUpdated);
    };
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] || TRANSLATIONS[lang] }}>
      <Router>
        <ScrollManager />
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/kits" element={<KitsPage />} />
              <Route path="/teams" element={<TeamsPage />} />
              <Route path="/docs" element={<DocsPage />} />
              <Route path="/community" element={<Community lang={lang} />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </LanguageContext.Provider>
  );
}
