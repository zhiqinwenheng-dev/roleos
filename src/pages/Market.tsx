import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { DatabaseZap, Layers, Package, RefreshCw } from 'lucide-react';
import { fetchMarketCatalog, type MarketCatalog } from '../lib/roleosApi';

export default function Market() {
  const [catalog, setCatalog] = useState<MarketCatalog | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  const totalEntries = useMemo(() => {
    if (!catalog) {
      return 0;
    }
    return (catalog.bPackages?.length ?? 0) + (catalog.cPlans?.length ?? 0) + (catalog.billingModes?.length ?? 0);
  }, [catalog]);

  async function loadCatalog() {
    setLoading(true);
    setErrorText('');
    try {
      const result = await fetchMarketCatalog();
      setCatalog(result.catalog);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : '获取目录失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCatalog();
  }, []);

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <h1 className="text-5xl font-bold text-black mb-4">Market Catalog</h1>
          <p className="text-xl text-black/50">
            RS 与 Rc 共用同一份目录。当前条目数：{totalEntries}
          </p>
        </div>
        <button
          onClick={loadCatalog}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-black text-white text-sm font-bold hover:bg-black/85 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>刷新目录</span>
        </button>
      </div>

      {errorText && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorText}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl border border-black/5 bg-white shadow-sm"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="font-bold">RS 商品包</h3>
          </div>
          <ul className="space-y-2 text-sm text-black/70">
            {(catalog?.bPackages ?? []).map((item) => (
              <li key={item.code} className="p-2 rounded-lg bg-zinc-50 border border-black/5">
                <div className="font-bold">{item.name}</div>
                <div className="text-xs text-black/40 mt-1">{item.code}</div>
              </li>
            ))}
            {!catalog?.bPackages?.length && <li className="text-black/40">暂无数据</li>}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-6 rounded-2xl border border-black/5 bg-white shadow-sm"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold">Rc 订阅计划</h3>
          </div>
          <ul className="space-y-2 text-sm text-black/70">
            {(catalog?.cPlans ?? []).map((item) => (
              <li key={item.planCode} className="p-2 rounded-lg bg-zinc-50 border border-black/5">
                <div className="font-bold">{item.title}</div>
                <div className="text-xs text-black/40 mt-1">{item.planCode}</div>
              </li>
            ))}
            {!catalog?.cPlans?.length && <li className="text-black/40">暂无数据</li>}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl border border-black/5 bg-white shadow-sm"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
              <DatabaseZap className="w-5 h-5" />
            </div>
            <h3 className="font-bold">Billing Modes</h3>
          </div>
          <ul className="space-y-2 text-sm text-black/70">
            {(catalog?.billingModes ?? []).map((item) => (
              <li key={item.id} className="p-2 rounded-lg bg-zinc-50 border border-black/5">
                <div className="font-bold">{item.title}</div>
                <div className="text-xs text-black/40 mt-1">{item.id}</div>
              </li>
            ))}
            {!catalog?.billingModes?.length && <li className="text-black/40">暂无数据</li>}
          </ul>
        </motion.div>
      </div>

      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <h3 className="font-bold text-lg mb-4">Raw JSON</h3>
        <pre className="p-4 bg-zinc-950 text-zinc-100 rounded-xl text-xs overflow-auto min-h-[220px]">
          {catalog ? JSON.stringify(catalog, null, 2) : '等待加载...'}
        </pre>
      </div>
    </div>
  );
}
