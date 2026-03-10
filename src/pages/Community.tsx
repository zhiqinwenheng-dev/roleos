import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, Plus, X, User, Clock, Tag, Heart, Search, TrendingUp, BarChart2 } from 'lucide-react';
import { TRANSLATIONS, Language } from '../i18n';

interface Post {
  id: number;
  title: string;
  content: string;
  author: string;
  category: string;
  likes: number;
  status: string;
  comment_count: number;
  created_at: string;
}

interface Comment {
  id: number;
  post_id: number;
  content: string;
  author: string;
  created_at: string;
}

interface CommunityProps {
  lang: Language;
}

type LocalCommentsMap = Record<string, Comment[]>;

const LOCAL_POSTS_KEY = 'roleos.community.posts';
const LOCAL_COMMENTS_KEY = 'roleos.community.comments';

const safeJsonParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const readLocalPosts = (): Post[] => {
  return safeJsonParse<Post[]>(window.localStorage.getItem(LOCAL_POSTS_KEY), []);
};

const readLocalComments = (): LocalCommentsMap => {
  return safeJsonParse<LocalCommentsMap>(window.localStorage.getItem(LOCAL_COMMENTS_KEY), {});
};

const saveLocalData = (posts: Post[], commentsMap: LocalCommentsMap) => {
  window.localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts));
  window.localStorage.setItem(LOCAL_COMMENTS_KEY, JSON.stringify(commentsMap));
};

const withCommentCounts = (posts: Post[], commentsMap: LocalCommentsMap) => {
  return posts.map((post) => ({
    ...post,
    comment_count: commentsMap[String(post.id)]?.length || post.comment_count || 0,
  }));
};

const Community: React.FC<CommunityProps> = ({ lang }) => {
  const t = TRANSLATIONS[lang].community;
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', author: '', category: 'general' });
  const [newComment, setNewComment] = useState({ content: '', author: '' });
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [submittingPost, setSubmittingPost] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [communityError, setCommunityError] = useState('');
  const [communityNotice, setCommunityNotice] = useState('');
  const [localMode, setLocalMode] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  const upsertPost = (incoming: Post) => {
    setPosts((prev) => [incoming, ...prev.filter((p) => p.id !== incoming.id)]);
    setSelectedPost((prev) => (prev && prev.id === incoming.id ? incoming : prev));
  };

  const enableLocalMode = () => {
    const localPosts = readLocalPosts();
    const localComments = readLocalComments();
    setPosts(withCommentCounts(localPosts, localComments));
    setLocalMode(true);
    setCommunityNotice(
      lang === 'zh'
        ? '社区接口不可用，已切换为本地模式（数据存储在当前浏览器）。'
        : 'Community API unavailable, switched to local browser mode.',
    );
  };

  useEffect(() => {
    let active = true;
    const init = async () => {
      const apiAvailable = await fetchPosts();
      if (active && apiAvailable) {
        connectWebSocket();
      }
    };
    init();
    return () => {
      active = false;
      socketRef.current?.close();
    };
  }, []);

  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'NEW_POST' && data.post) {
        upsertPost(data.post);
      } else if (data.type === 'NEW_COMMENT') {
        if (selectedPost && selectedPost.id === Number(data.postId)) {
          setComments(data.comments || []);
        }
      } else if (data.type === 'POST_UPDATED' && data.post) {
        upsertPost(data.post);
      }
    };

    socketRef.current = socket;
  };

  const fetchPosts = async () => {
    setLoadingPosts(true);
    setCommunityError('');
    try {
      const res = await fetch('/api/posts');
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        enableLocalMode();
        return false;
      }
      const data = await res.json().catch(() => null);
      if (!data) {
        enableLocalMode();
        return false;
      }
      setPosts(data || []);
      setLocalMode(false);
      setCommunityNotice('');
      return true;
    } catch {
      enableLocalMode();
      return false;
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchComments = async (postId: number) => {
    setCommunityError('');
    if (localMode) {
      const commentsMap = readLocalComments();
      setComments(commentsMap[String(postId)] || []);
      return;
    }

    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        enableLocalMode();
        const commentsMap = readLocalComments();
        setComments(commentsMap[String(postId)] || []);
        return;
      }
      const data = await res.json().catch(() => null);
      if (!data) {
        enableLocalMode();
        const commentsMap = readLocalComments();
        setComments(commentsMap[String(postId)] || []);
        return;
      }
      setComments(data || []);
    } catch {
      enableLocalMode();
      const commentsMap = readLocalComments();
      setComments(commentsMap[String(postId)] || []);
    }
  };

  const createPostLocal = () => {
    const localPosts = readLocalPosts();
    const localComments = readLocalComments();
    const nextId = localPosts.length > 0 ? Math.max(...localPosts.map((p) => p.id)) + 1 : 1;
    const createdPost: Post = {
      id: nextId,
      title: newPost.title.trim(),
      content: newPost.content.trim(),
      author: newPost.author.trim(),
      category: newPost.category,
      likes: 0,
      status: 'open',
      comment_count: 0,
      created_at: new Date().toISOString(),
    };
    const nextPosts = [createdPost, ...localPosts];
    saveLocalData(nextPosts, localComments);
    upsertPost(createdPost);
    setNewPost({ title: '', content: '', author: '', category: 'general' });
    setIsModalOpen(false);
  };

  const createCommentLocal = () => {
    if (!selectedPost) {
      return;
    }
    const localPosts = readLocalPosts();
    const localComments = readLocalComments();
    const postId = selectedPost.id;
    const currentComments = localComments[String(postId)] || [];
    const nextCommentId = currentComments.length > 0 ? Math.max(...currentComments.map((c) => c.id)) + 1 : 1;
    const createdComment: Comment = {
      id: nextCommentId,
      post_id: postId,
      content: newComment.content.trim(),
      author: newComment.author.trim(),
      created_at: new Date().toISOString(),
    };
    const updatedComments = [...currentComments, createdComment];
    localComments[String(postId)] = updatedComments;
    const updatedPosts = localPosts.map((post) =>
      post.id === postId ? { ...post, comment_count: updatedComments.length } : post,
    );
    saveLocalData(updatedPosts, localComments);
    setComments(updatedComments);
    setPosts(withCommentCounts(updatedPosts, localComments));
    setSelectedPost((prev) => (prev ? { ...prev, comment_count: updatedComments.length } : prev));
    setNewComment({ content: '', author: '' });
  };

  const likePostLocal = (postId: number) => {
    const localPosts = readLocalPosts();
    const localComments = readLocalComments();
    const updatedPosts = localPosts.map((post) =>
      post.id === postId ? { ...post, likes: (post.likes || 0) + 1 } : post,
    );
    saveLocalData(updatedPosts, localComments);
    const target = updatedPosts.find((item) => item.id === postId);
    if (target) {
      upsertPost(target);
    }
  };

  const updateStatusLocal = (postId: number, status: string) => {
    const localPosts = readLocalPosts();
    const localComments = readLocalComments();
    const updatedPosts = localPosts.map((post) =>
      post.id === postId ? { ...post, status } : post,
    );
    saveLocalData(updatedPosts, localComments);
    const target = updatedPosts.find((item) => item.id === postId);
    if (target) {
      upsertPost(target);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.title || !newPost.content || !newPost.author) return;

    setSubmittingPost(true);
    setCommunityError('');
    if (localMode) {
      createPostLocal();
      setSubmittingPost(false);
      return;
    }

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPost),
      });
      const contentType = res.headers.get('content-type') || '';
      const payload = contentType.includes('application/json') ? await res.json().catch(() => null) : null;
      if (!res.ok || !payload) {
        enableLocalMode();
        createPostLocal();
        return;
      }

      upsertPost(payload as Post);
      const localComments = readLocalComments();
      const localPosts = [payload as Post, ...readLocalPosts().filter((p) => p.id !== (payload as Post).id)];
      saveLocalData(localPosts, localComments);
      setNewPost({ title: '', content: '', author: '', category: 'general' });
      setIsModalOpen(false);
    } catch {
      enableLocalMode();
      createPostLocal();
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !newComment.content || !newComment.author) return;

    setSubmittingComment(true);
    setCommunityError('');
    if (localMode) {
      createCommentLocal();
      setSubmittingComment(false);
      return;
    }

    try {
      const res = await fetch(`/api/posts/${selectedPost.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newComment),
      });
      const contentType = res.headers.get('content-type') || '';
      const payload = contentType.includes('application/json') ? await res.json().catch(() => null) : null;
      if (!res.ok || !payload) {
        enableLocalMode();
        createCommentLocal();
        return;
      }

      setComments(payload || []);
      setNewComment({ content: '', author: '' });
      const updatedPost = { ...selectedPost, comment_count: (payload || []).length };
      upsertPost(updatedPost);
    } catch {
      enableLocalMode();
      createCommentLocal();
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleLike = async (e: React.MouseEvent, postId: number) => {
    e.stopPropagation();
    if (localMode) {
      likePostLocal(postId);
      return;
    }

    const res = await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      enableLocalMode();
      likePostLocal(postId);
      return;
    }
    const updatedPost = await res.json().catch(() => null);
    if (!updatedPost) {
      enableLocalMode();
      likePostLocal(postId);
      return;
    }
    upsertPost(updatedPost);
  };

  const handleStatusUpdate = async (postId: number, status: string) => {
    if (localMode) {
      updateStatusLocal(postId, status);
      return;
    }

    const res = await fetch(`/api/posts/${postId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      enableLocalMode();
      updateStatusLocal(postId, status);
      return;
    }
    const updatedPost = await res.json().catch(() => null);
    if (!updatedPost) {
      enableLocalMode();
      updateStatusLocal(postId, status);
      return;
    }
    upsertPost(updatedPost);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'qa': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'custom': return 'bg-purple-50 text-purple-600 border-purple-100';
      default: return 'bg-blue-50 text-blue-600 border-blue-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-emerald-500 text-white';
      case 'in_progress': return 'bg-orange-500 text-white';
      default: return 'bg-slate-400 text-white';
    }
  };

  const filteredPosts = posts.filter((post) => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || post.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen pt-32 pb-24 bg-white relative">
      <div className="absolute inset-0 bg-grid opacity-[0.02] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {communityNotice && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
            {communityNotice}
          </div>
        )}

        {communityError && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
            {communityError}
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl sm:text-5xl font-bold tracking-tight mb-3 text-gradient"
            >
              {t.title}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-slate-500 font-medium"
            >
              {t.subtitle}
            </motion.p>
          </div>
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            whileActive={{ scale: 0.98 }}
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
          >
            <Plus size={18} />
            {t.newPost}
          </motion.button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <aside className="lg:col-span-3 space-y-8">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
              <input
                type="text"
                placeholder={t.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-11 pr-4 py-3 text-sm font-bold focus:bg-white focus:border-blue-600/20 focus:ring-0 transition-all"
              />
            </div>

            <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                <Tag size={12} /> {t.postCategory}
              </h3>
              <div className="space-y-1">
                {['all', 'general', 'qa', 'custom'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      activeCategory === cat
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                        : 'text-slate-600 hover:bg-white hover:text-blue-600'
                    }`}
                  >
                    {cat === 'all' ? (lang === 'zh' ? '全部' : 'All') : (t.categories as any)[cat]}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                <BarChart2 size={12} /> {t.stats}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.totalPosts}</p>
                  <p className="text-xl font-bold text-slate-900">{posts.length}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.activeUsers}</p>
                  <p className="text-xl font-bold text-slate-900">{new Set(posts.map((p) => p.author)).size}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                <TrendingUp size={12} /> {t.trending}
              </h3>
              <div className="space-y-4">
                {posts.slice(0, 3).map((post, i) => (
                  <div
                    key={post.id}
                    className="flex gap-3 group/trend cursor-pointer"
                    onClick={() => {
                      setSelectedPost(post);
                      fetchComments(post.id);
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-xs font-bold text-slate-400 group-hover/trend:text-blue-600 transition-colors">
                      {i + 1}
                    </div>
                    <p className="text-xs font-bold text-slate-600 group-hover/trend:text-blue-600 transition-colors line-clamp-2 leading-relaxed">
                      {post.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <div className="lg:col-span-9 space-y-4">
            {loadingPosts ? (
              <div className="text-center py-24 bg-slate-50 rounded-[2rem] border border-slate-100">
                <p className="text-lg text-slate-400 font-medium">{lang === 'zh' ? '加载中...' : 'Loading...'}</p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-24 bg-slate-50 rounded-[2rem] border border-slate-100">
                <MessageSquare className="mx-auto mb-4 text-slate-300" size={48} />
                <p className="text-lg text-slate-400 font-medium">{t.noPosts}</p>
              </div>
            ) : (
              filteredPosts.map((post, idx) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => {
                    setSelectedPost(post);
                    fetchComments(post.id);
                  }}
                  className="bg-white p-6 rounded-2xl border border-slate-100 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/5 transition-all cursor-pointer group relative"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${getCategoryColor(post.category)}`}>
                        {(t.categories as any)[post.category]}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${getStatusColor(post.status)}`}>
                        {post.status || 'open'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Clock size={12} />
                      {formatDate(post.created_at)}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold mb-2 group-hover:text-blue-600 transition-colors tracking-tight">{post.title}</h2>
                  <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 mb-6">{post.content}</p>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <User size={16} />
                      </div>
                      <span className="text-sm font-bold text-slate-700">{post.author}</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <button
                        onClick={(e) => handleLike(e, post.id)}
                        className="flex items-center gap-1.5 text-slate-400 hover:text-rose-500 transition-colors group/like"
                      >
                        <Heart size={16} className={`transition-transform group-hover/like:scale-110 ${post.likes > 0 ? 'fill-rose-500 text-rose-500' : ''}`} />
                        <span className="font-bold text-xs">{post.likes || 0}</span>
                      </button>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <MessageSquare size={16} />
                        <span className="font-bold text-xs">{post.comment_count || 0}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] p-10 shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-blue-600" />
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-bold tracking-tight">{t.newPost}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-400">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleCreatePost} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">{t.postAuthor}</label>
                    <input
                      type="text"
                      value={newPost.author}
                      onChange={(e) => setNewPost({ ...newPost, author: e.target.value })}
                      className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 focus:bg-white focus:border-blue-600/20 focus:ring-0 transition-all font-bold text-slate-700"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">{t.postCategory}</label>
                    <select
                      value={newPost.category}
                      onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                      className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 focus:bg-white focus:border-blue-600/20 focus:ring-0 transition-all font-bold text-slate-700 appearance-none"
                    >
                      <option value="general">{t.categories.general}</option>
                      <option value="qa">{t.categories.qa}</option>
                      <option value="custom">{t.categories.custom}</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">{t.postTitle}</label>
                  <input
                    type="text"
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 focus:bg-white focus:border-blue-600/20 focus:ring-0 transition-all font-bold text-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">{t.postContent}</label>
                  <textarea
                    rows={5}
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-4 focus:bg-white focus:border-blue-600/20 focus:ring-0 transition-all font-bold text-slate-700 resize-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingPost}
                  className="w-full bg-blue-600 text-white py-5 rounded-2xl hover:bg-blue-700 transition-all font-bold shadow-xl shadow-blue-500/20 active:scale-[0.99] disabled:opacity-70"
                >
                  {submittingPost ? (lang === 'zh' ? '提交中...' : 'Submitting...') : t.submit}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPost && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPost(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              className="bg-white w-full max-w-5xl h-[90vh] rounded-[3rem] shadow-2xl relative z-10 flex flex-col overflow-hidden"
            >
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getCategoryColor(selectedPost.category)}`}>
                    {(t.categories as any)[selectedPost.category]}
                  </span>
                  <div className="flex gap-2">
                    {['open', 'in_progress', 'resolved'].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusUpdate(selectedPost.id, s)}
                        className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${
                          selectedPost.status === s
                            ? getStatusColor(s)
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => setSelectedPost(null)} className="p-3 hover:bg-white rounded-xl transition-colors text-slate-400 shadow-sm">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 sm:p-16">
                <div className="max-w-3xl mx-auto">
                  <div className="mb-12">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm">
                        <User size={28} />
                      </div>
                      <div>
                        <p className="text-xl font-bold text-slate-900">{selectedPost.author}</p>
                        <p className="text-sm font-bold text-slate-400">{formatDate(selectedPost.created_at)}</p>
                      </div>
                    </div>
                    <h2 className="text-4xl sm:text-5xl font-bold mb-8 tracking-tight text-slate-900 leading-tight">{selectedPost.title}</h2>
                    <div className="text-xl text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                      {selectedPost.content}
                    </div>
                  </div>

                  <div className="pt-16 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-12">
                      <h3 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                        <MessageSquare size={24} className="text-blue-600" />
                        {t.comments} <span className="text-slate-300">({comments.length})</span>
                      </h3>
                      <button
                        onClick={(e) => handleLike(e, selectedPost.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 text-rose-600 font-bold hover:bg-rose-100 transition-all"
                      >
                        <Heart size={18} className={selectedPost.likes > 0 ? 'fill-rose-600' : ''} />
                        {selectedPost.likes || 0}
                      </button>
                    </div>

                    <div className="space-y-10 mb-16">
                      {comments.length === 0 ? (
                        <p className="text-center py-10 text-slate-400 font-bold italic">{lang === 'zh' ? '暂无评论' : 'No comments yet.'}</p>
                      ) : (
                        comments.map((comment) => (
                          <div key={comment.id} className="flex gap-6 group/comment">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover/comment:bg-blue-50 group-hover/comment:text-blue-600 transition-colors flex-shrink-0">
                              <User size={20} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-bold text-slate-900">{comment.author}</span>
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{formatDate(comment.created_at)}</span>
                              </div>
                              <p className="text-slate-600 leading-relaxed font-medium">{comment.content}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <form onSubmit={handleCreateComment} className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                      <div className="mb-6">
                        <input
                          type="text"
                          placeholder={t.postAuthor}
                          value={newComment.author}
                          onChange={(e) => setNewComment({ ...newComment, author: e.target.value })}
                          className="w-full bg-white border-2 border-transparent rounded-xl px-5 py-3 font-bold text-slate-700 focus:border-blue-600/20 focus:ring-0 transition-all"
                          required
                        />
                      </div>
                      <div className="flex gap-4">
                        <textarea
                          placeholder={t.addComment}
                          value={newComment.content}
                          onChange={(e) => setNewComment({ ...newComment, content: e.target.value })}
                          className="flex-1 bg-white border-2 border-transparent rounded-xl px-5 py-3 font-bold text-slate-700 focus:border-blue-600/20 focus:ring-0 transition-all resize-none"
                          rows={3}
                          required
                        />
                        <button
                          type="submit"
                          disabled={submittingComment}
                          className="bg-blue-600 text-white p-5 rounded-xl hover:bg-blue-700 transition-all self-end shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-70"
                        >
                          {submittingComment ? <span className="text-sm font-bold">...</span> : <Send size={24} />}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Community;
