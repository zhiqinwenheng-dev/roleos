export interface Kit {
  id: string;
  name: string;
  name_zh?: string;
  description: string;
  description_zh?: string;
  usage: string;
  usage_zh?: string;
  status: 'Preview' | 'Ready' | 'Coming Soon';
  githubUrl?: string;
  docsUrl?: string;
}

export interface Team {
  id: string;
  name: string;
  name_zh?: string;
  description: string;
  description_zh?: string;
  members: string[];
  members_zh?: string[];
  status: 'Preview' | 'Ready' | 'Coming Soon';
}

export const KITS: Kit[] = [
  {
    id: 'content-research',
    name: 'Content Research Kit',
    name_zh: 'Content Research Kit',
    description: 'Topic discovery, source gathering, outline building, and first drafts.',
    description_zh: '用于选题发现、资料整理、大纲构建和初稿输出。',
    usage: 'Start from idea to first draft with a single ready workflow.',
    usage_zh: '从选题到初稿，一套流程直接起步。',
    status: 'Ready',
    githubUrl: 'https://github.com/roleos/content-research-kit'
  },
  {
    id: 'inbox-assistant',
    name: 'Inbox Assistant Kit',
    name_zh: 'Inbox Assistant Kit',
    description: 'Email sorting, task extraction, draft replies, and schedule help.',
    description_zh: '用于邮件分类、待办提取、回复草稿和日程辅助。',
    usage: 'Keep incoming messages organized and actionable.',
    usage_zh: '把高频消息流变成可执行清单。',
    status: 'Preview',
    githubUrl: 'https://github.com/roleos/inbox-assistant-kit'
  },
  {
    id: 'support-assistant',
    name: 'Support Assistant Kit',
    name_zh: 'Support Assistant Kit',
    description: 'FAQ handling, first-pass replies, escalation suggestions, and support triage.',
    description_zh: '用于 FAQ 回复、初步应答、升级建议和客服分流。',
    usage: 'Scale first-line support while keeping human escalation clear.',
    usage_zh: '在放大客服效率的同时保留清晰的人工升级路径。',
    status: 'Coming Soon'
  }
];

export const TEAMS: Team[] = [
  {
    id: 'content-team',
    name: 'Content Team',
    name_zh: 'Content Team',
    description: 'A complete content workflow from topic selection to publishing handoff.',
    description_zh: '覆盖从选题到发布交接的完整内容流程。',
    members: ['Topic Collector', 'Content Researcher', 'Reviewer', 'Publisher'],
    members_zh: ['Topic Collector', 'Content Researcher', 'Reviewer', 'Publisher'],
    status: 'Preview'
  },
  {
    id: 'admin-team',
    name: 'Admin Team',
    name_zh: 'Admin Team',
    description: 'A practical back-office team for inbox, scheduling, drafting, and approvals.',
    description_zh: '聚焦收件整理、日程安排、草稿协助与人工审批的实用行政团队。',
    members: ['Inbox Organizer', 'Schedule Assistant', 'Drafting Assistant', 'Human Approver'],
    members_zh: ['Inbox Organizer', 'Schedule Assistant', 'Drafting Assistant', 'Human Approver'],
    status: 'Coming Soon'
  }
];

export interface Feature {
  id: string;
  title: string;
  title_zh: string;
  description: string;
  description_zh: string;
  icon: string;
}

export const FEATURES: Feature[] = [
  {
    id: 'multi-agent',
    title: 'Multi-Agent Orchestration',
    title_zh: '多智能体编排',
    description: 'Seamlessly coordinate multiple specialized AI agents to complete complex, multi-step workflows.',
    description_zh: '无缝协调多个专业 AI 智能体，完成复杂的、多步骤的工作流。',
    icon: 'Users'
  },
  {
    id: 'role-based',
    title: 'Role-Based Architecture',
    title_zh: '基于角色的架构',
    description: 'Define specific roles with unique skills, tools, and memory, mirroring real-world team structures.',
    description_zh: '定义具有独特技能、工具和记忆的特定角色，镜像现实世界的团队结构。',
    icon: 'UserCheck'
  },
  {
    id: 'tool-integration',
    title: 'Native Tool Integration',
    title_zh: '原生工具集成',
    description: 'Agents can interact with external APIs, databases, and software tools to perform real actions.',
    description_zh: '智能体可以与外部 API、数据库和软件工具交互，执行真实操作。',
    icon: 'Wrench'
  },
  {
    id: 'memory-sync',
    title: 'Shared Memory Sync',
    title_zh: '共享记忆同步',
    description: 'Maintain context across different agents and sessions with persistent, shared knowledge bases.',
    description_zh: '通过持久的、共享的知识库，在不同的智能体和会话之间保持上下文。',
    icon: 'Database'
  }
];

export interface Testimonial {
  id: string;
  quote: string;
  quote_zh: string;
  author: string;
  role: string;
  role_zh: string;
  avatar: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    id: '1',
    quote: "RoleOS has completely transformed how our content team operates. The multi-agent workflow is a game-changer.",
    quote_zh: "RoleOS 彻底改变了我们内容团队的运作方式。多智能体工作流是一个颠覆性的创新。",
    author: "Sarah Chen",
    role: "Head of Content @ TechFlow",
    role_zh: "内容主管 @ TechFlow",
    avatar: "https://i.pravatar.cc/150?u=sarah"
  },
  {
    id: '2',
    quote: "The ability to define specific roles for AI agents makes the output much more consistent and professional.",
    quote_zh: "为 AI 智能体定义特定角色的能力使输出更加一致和专业。",
    author: "Marcus Thorne",
    role: "Founder @ AI Labs",
    role_zh: "创始人 @ AI Labs",
    avatar: "https://i.pravatar.cc/150?u=marcus"
  }
];

export interface PricingPlan {
  id: string;
  name: string;
  name_zh: string;
  price: string;
  features: string[];
  features_zh: string[];
  isPopular?: boolean;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Community',
    name_zh: '社区版',
    price: '$0',
    features: ['Up to 3 Agents', 'Standard Tools', 'Community Support', 'Open Source Kits'],
    features_zh: ['最多 3 个智能体', '标准工具', '社区支持', '开源套件']
  },
  {
    id: 'pro',
    name: 'Professional',
    name_zh: '专业版',
    price: '$49',
    features: ['Unlimited Agents', 'Advanced Tools', 'Priority Support', 'Custom Kits', 'Shared Memory'],
    features_zh: ['无限智能体', '高级工具', '优先支持', '自定义套件', '共享记忆'],
    isPopular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    name_zh: '企业版',
    price: 'Custom',
    features: ['SLA Guarantee', 'On-premise Hosting', 'Dedicated Support', 'Custom Integrations'],
    features_zh: ['SLA 保证', '本地部署', '专属支持', '自定义集成']
  }
];
