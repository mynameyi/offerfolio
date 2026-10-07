export const PROFILE_MODULES = [
  { key: "intro", label: "简介", description: "个人介绍、职业身份与简历入口" },
  { key: "highlights", label: "高光时刻", description: "重要成果与关键节点" },
  { key: "showcase", label: "作品展示", description: "作品卡片、简介与相关链接" },
  { key: "skills", label: "技能", description: "技能标签与技术栈" },
  { key: "strengths", label: "擅长", description: "擅长的技术方向及熟练度" },
  { key: "education", label: "学习经历", description: "学校、专业与学习经历" },
  { key: "career", label: "职业经历", description: "职位、公司与工作成果" },
  { key: "featuredProjects", label: "代表项目", description: "重点项目、图片与项目链接" },
  { key: "awards", label: "成就与证书", description: "奖项、证书与荣誉成果" },
  { key: "blogs", label: "博客", description: "文章标题、摘要与原文链接" },
  { key: "talks", label: "演讲", description: "演讲、活动信息与演示材料" },
  { key: "podcasts", label: "播客", description: "播客节目与收听链接" },
  { key: "reviews", label: "推荐语 & 评价", description: "推荐人评价与身份链接" },
  { key: "contact", label: "联系我", description: "邮箱、电话、所在地与社交链接" },
] as const;

export type PortfolioModuleKey = (typeof PROFILE_MODULES)[number]["key"];
export type PortfolioModules = Record<PortfolioModuleKey, boolean>;
export type PortfolioModuleLabels = Record<PortfolioModuleKey, string>;
export const DEFAULT_MODULE_ORDER: PortfolioModuleKey[] = PROFILE_MODULES.map(({ key }) => key);
export const DEFAULT_MODULE_LABELS: PortfolioModuleLabels = Object.fromEntries(
  PROFILE_MODULES.map(({ key, label }) => [key, label]),
) as PortfolioModuleLabels;
const PREVIOUS_SECTION_LABELS: PortfolioModuleLabels = {
  intro: "简介",
  highlights: "高光时刻",
  showcase: "作品一览",
  skills: "我能做什么",
  strengths: "专业能力",
  education: "学习经历",
  career: "职业经历",
  featuredProjects: "代表项目",
  awards: "荣誉与认证",
  blogs: "近期文章",
  talks: "演讲活动",
  podcasts: "播客与访谈",
  reviews: "来自合作伙伴的评价",
  contact: "联系我",
};

export type PortfolioMediaItem = {
  id: string;
  url: string;
  kind: "image" | "video";
};

export type PortfolioContentItem = {
  id: string;
  showcaseType?: "open-source" | "company-project";
  mediaItems?: PortfolioMediaItem[];
  showcaseCoverUrl?: string;
  title: string;
  subtitle: string;
  summary: string;
  organization: string;
  period: string;
  url: string;
  urlLabel: string;
  secondaryUrl: string;
  secondaryLabel: string;
  imageUrl: string;
  embedUrl: string;
  language: string;
  tags: string[];
  value: string;
  level: number;
  stars: number;
  forks: number;
};

export type PortfolioMilestone = {
  id: string;
  kind: "experience" | "education" | "growth";
  period: string;
  title: string;
  organization: string;
  summary: string;
};

export type PortfolioProfile = {
  displayName: string;
  avatarUrl: string;
  avatarPositionX: number;
  avatarPositionY: number;
  headline: string;
  introduction: string;
  location: string;
  phone: string;
  email: string;
  githubUrl: string;
  giteeUrl: string;
  linkedinUrl: string;
  twitterHandle: string;
  resumeUrl: string;
  skills: string[];
  socialLinks: PortfolioContentItem[];
  strengths: PortfolioContentItem[];
  showcaseItems: PortfolioContentItem[];
  projects: PortfolioContentItem[];
  achievements: PortfolioContentItem[];
  blogs: PortfolioContentItem[];
  talks: PortfolioContentItem[];
  podcasts: PortfolioContentItem[];
  metrics: PortfolioContentItem[];
  recommendations: PortfolioContentItem[];
  milestones: PortfolioMilestone[];
  modules: PortfolioModules;
  moduleOrder: PortfolioModuleKey[];
  moduleNavigation: PortfolioModules;
  moduleLabels: PortfolioModuleLabels;
};

export const DEFAULT_MODULES: PortfolioModules = {
  intro: true,
  highlights: true,
  showcase: true,
  skills: true,
  strengths: true,
  education: true,
  career: true,
  featuredProjects: true,
  awards: true,
  blogs: true,
  talks: true,
  podcasts: true,
  reviews: true,
  contact: true,
};

const LEGACY_MODULE_KEYS: Record<PortfolioModuleKey, string> = {
  intro: "greeting",
  highlights: "metrics",
  showcase: "openSource",
  skills: "skills",
  strengths: "skillProgress",
  education: "education",
  career: "workExperience",
  featuredProjects: "bigProjects",
  awards: "achievements",
  blogs: "blogs",
  talks: "talks",
  podcasts: "podcast",
  reviews: "recommendations",
  contact: "contact",
};

const emptyContentItem = (id: string, title = ""): PortfolioContentItem => ({
  id,
  title,
  subtitle: "",
  summary: "",
  organization: "",
  period: "",
  url: "",
  urlLabel: "查看详情",
  secondaryUrl: "",
  secondaryLabel: "",
  imageUrl: "",
  embedUrl: "",
  language: "",
  tags: [],
  value: "",
  level: 0,
  stars: 0,
  forks: 0,
});

export const DEFAULT_PROFILE: PortfolioProfile = {
  displayName: "你的姓名",
  avatarUrl: "",
  avatarPositionX: 50,
  avatarPositionY: 0,
  headline: "你好，我是你的姓名 👋",
  introduction: "专注于构建清晰、可靠、好用的数字产品。欢迎浏览我的项目、经历与技术实践。",
  location: "",
  phone: "",
  email: "",
  githubUrl: "",
  giteeUrl: "",
  linkedinUrl: "",
  twitterHandle: "",
  resumeUrl: "",
  skills: ["前端开发", "React", "TypeScript", "Next.js", "Node.js", "产品协作"],
  socialLinks: [],
  strengths: [
    { ...emptyContentItem("skill-frontend", "前端开发"), level: 85 },
    { ...emptyContentItem("skill-backend", "后端开发"), level: 70 },
    { ...emptyContentItem("skill-product", "产品与协作"), level: 75 },
  ],
  showcaseItems: [],
  projects: [
    {
      ...emptyContentItem("project-evidence", "把项目讲清楚"),
      summary: "从真实问题出发，介绍方案、个人贡献和可以复核的成果。",
      tags: ["问题拆解", "方案设计", "项目交付"],
    },
    {
      ...emptyContentItem("project-workflow", "从经历到作品"),
      summary: "用完整案例展示技术实践、协作方式和持续改进过程。",
      tags: ["个人贡献", "协作", "复盘"],
    },
  ],
  achievements: [],
  blogs: [],
  talks: [],
  podcasts: [],
  metrics: [],
  recommendations: [],
  milestones: [
    {
      id: "milestone-one",
      kind: "experience",
      period: "时间段",
      title: "职位 / 角色",
      organization: "公司或项目名称",
      summary: "介绍负责内容、协作范围与可复核的工作成果。",
    },
    {
      id: "milestone-two",
      kind: "education",
      period: "时间段",
      title: "专业 / 学位",
      organization: "学校或组织",
      summary: "补充与目标方向相关的专业背景、项目和阶段成果。",
    },
  ],
  modules: { ...DEFAULT_MODULES },
  moduleOrder: [...DEFAULT_MODULE_ORDER],
  moduleNavigation: { ...DEFAULT_MODULES },
  moduleLabels: { ...DEFAULT_MODULE_LABELS },
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, fallback: string, maxLength = 500): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : fallback;
}

function numberValue(value: unknown, fallback = 0, max = 100): number {
  if (typeof value !== "number" && typeof value !== "string") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(max, Math.round(parsed))) : fallback;
}

function textList(value: unknown, fallback: string[], limit = 30): string[] {
  if (!Array.isArray(value)) return fallback;
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, limit);
}

function safeUrl(value: unknown, fallback: string): string {
  const candidate = text(value, fallback, 2048);
  if (!candidate) return "";
  if (candidate.startsWith("/") && !candidate.startsWith("//")) return candidate;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

function normalizeContentItems(
  value: unknown,
  fallback: PortfolioContentItem[],
  limit = 30,
  showcase = false,
): PortfolioContentItem[] {
  if (!Array.isArray(value)) return fallback.map((item) => ({ ...item, tags: [...item.tags] }));
  return value.slice(0, limit).map((item, index) => {
    const record = asRecord(item);
    const base = fallback[index] ?? emptyContentItem(`item-${index + 1}`);
    const legacyImageUrl = safeUrl(record.imageUrl ?? record.image, "");
    const legacyVideoUrl = safeUrl(record.embedUrl, "");
    const legacyMediaItems: PortfolioMediaItem[] = [
      ...(legacyImageUrl ? [{ id: `${text(record.id, base.id, 80)}-image`, url: legacyImageUrl, kind: "image" as const }] : []),
      ...(legacyVideoUrl ? [{ id: `${text(record.id, base.id, 80)}-video`, url: legacyVideoUrl, kind: "video" as const }] : []),
    ];
    const mediaItems: PortfolioMediaItem[] = Array.isArray(record.mediaItems)
      ? record.mediaItems.map((value, mediaIndex): PortfolioMediaItem => {
          const media = asRecord(value);
          const url = safeUrl(media.url, "");
          const videoByExtension = /\.(mp4|webm|ogg|ogv|mov|m4v)(?:\?.*)?$/i.test(url);
          const kind: PortfolioMediaItem["kind"] = media.kind === "video" || (media.kind !== "image" && videoByExtension) ? "video" : "image";
          return {
            id: text(media.id, `${text(record.id, base.id, 80)}-media-${mediaIndex + 1}`, 100),
            url,
            kind,
          };
        }).filter((media) => Boolean(media.url))
      : legacyMediaItems;
    const showcaseType = showcase
      ? record.showcaseType === "open-source"
        ? "open-source"
        : record.showcaseType === "company-project" || record.showcaseType === "confidential"
          ? "company-project"
          : mediaItems.length
            ? "company-project"
            : record.url || record.evidenceUrl
              ? "open-source"
              : undefined
      : undefined;
    return {
      id: text(record.id, base.id, 80) || base.id,
      ...(showcase ? { showcaseType, mediaItems, showcaseCoverUrl: safeUrl(record.showcaseCoverUrl, "") } : {}),
      title: text(record.title ?? record.projectName ?? record.Stack, base.title, 140),
      subtitle: text(record.subtitle, base.subtitle, 240),
      summary: text(record.summary ?? record.description ?? record.projectDesc ?? record.desc ?? record.subtitle, base.summary, 1200),
      organization: text(record.organization ?? record.company, base.organization, 160),
      period: text(record.period ?? record.date ?? record.duration, base.period, 100),
      url: safeUrl(record.url ?? record.evidenceUrl, base.url),
      urlLabel: text(record.urlLabel ?? record.evidenceLabel, base.urlLabel, 100),
      secondaryUrl: safeUrl(record.secondaryUrl, base.secondaryUrl),
      secondaryLabel: text(record.secondaryLabel, base.secondaryLabel, 100),
      imageUrl: safeUrl(record.imageUrl ?? record.image, base.imageUrl),
      embedUrl: safeUrl(record.embedUrl, base.embedUrl),
      language: text(record.language, base.language, 80),
      tags: textList(record.tags, base.tags, 12),
      value: text(record.value, base.value, 100),
      level: numberValue(record.level ?? record.percentage ?? record.progressPercentage, base.level),
      stars: numberValue(record.stars, base.stars, 100000000),
      forks: numberValue(record.forks, base.forks, 100000000),
    };
  });
}

export function showcaseMediaItems(item: PortfolioContentItem): PortfolioMediaItem[] {
  if (item.mediaItems?.length) return item.mediaItems;
  return [
    ...(item.imageUrl ? [{ id: `${item.id}-image`, url: item.imageUrl, kind: "image" as const }] : []),
    ...(item.embedUrl ? [{ id: `${item.id}-video`, url: item.embedUrl, kind: "video" as const }] : []),
  ];
}

export function formatHighlightTag(value: string): string {
  const tag = value.trim();
  const legacyMonth = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(tag);
  return legacyMonth ? `${legacyMonth[1]}.${legacyMonth[2]}` : tag;
}

export function normalizeProfile(value: unknown): PortfolioProfile {
  const input = asRecord(value);
  const fallbackMilestones = DEFAULT_PROFILE.milestones;
  const milestones = Array.isArray(input.milestones)
    ? input.milestones.slice(0, 30).map((item, index) => {
        const milestone = asRecord(item);
        const fallback = fallbackMilestones[index % fallbackMilestones.length];
        const kind = milestone.kind === "education" || milestone.kind === "growth" || milestone.kind === "experience"
          ? milestone.kind
          : fallback.kind;
        return {
          id: text(milestone.id, `milestone-${index + 1}`, 80),
          kind,
          period: text(milestone.period, "时间段", 100),
          title: text(milestone.title, "经历标题", 140),
          organization: text(milestone.organization, "组织名称", 160),
          summary: text(milestone.summary, "", 1200),
        };
      })
    : DEFAULT_PROFILE.milestones;
  const projectsFallback = DEFAULT_PROFILE.projects;

  const location = text(input.location, DEFAULT_PROFILE.location, 160);
  const modulesInput = asRecord(input.modules);
  const modules = Object.fromEntries(
    PROFILE_MODULES.map(({ key }) => {
      const currentValue = modulesInput[key];
      const legacyValue = modulesInput[LEGACY_MODULE_KEYS[key]];
      const visible = key === "intro"
        ? true
        : typeof currentValue === "boolean"
          ? currentValue
          : typeof legacyValue === "boolean"
            ? legacyValue
            : DEFAULT_MODULES[key];
      return [key, visible];
    }),
  ) as PortfolioModules;
  const allowedOrder = new Set<PortfolioModuleKey>(DEFAULT_MODULE_ORDER);
  const requestedOrder = Array.isArray(input.moduleOrder)
    ? input.moduleOrder.filter((key): key is PortfolioModuleKey => typeof key === "string" && allowedOrder.has(key as PortfolioModuleKey) && key !== "intro")
    : [];
  const moduleOrder = ["intro", ...new Set([...requestedOrder, ...DEFAULT_MODULE_ORDER.filter((key) => key !== "intro")])] as PortfolioModuleKey[];
  const moduleNavigationInput = asRecord(input.moduleNavigation);
  const moduleNavigation = Object.fromEntries(
    PROFILE_MODULES.map(({ key }) => [
      key,
      typeof moduleNavigationInput[key] === "boolean" ? moduleNavigationInput[key] : DEFAULT_MODULES[key],
    ]),
  ) as PortfolioModules;
  const moduleLabelsInput = asRecord(input.moduleLabels);
  const moduleLabels = Object.fromEntries(
    PROFILE_MODULES.map(({ key, label }) => {
      const savedLabel = text(moduleLabelsInput[key], DEFAULT_MODULE_LABELS[key], 30);
      const isDefaultLabel = savedLabel === label || savedLabel === PREVIOUS_SECTION_LABELS[key];
      const displayLabel = isDefaultLabel ? DEFAULT_MODULE_LABELS[key] : savedLabel;
      return [key, displayLabel || DEFAULT_MODULE_LABELS[key]];
    }),
  ) as PortfolioModuleLabels;

  return {
    displayName: text(input.displayName, DEFAULT_PROFILE.displayName, 80),
    avatarUrl: safeUrl(input.avatarUrl, DEFAULT_PROFILE.avatarUrl),
    avatarPositionX: numberValue(input.avatarPositionX, DEFAULT_PROFILE.avatarPositionX),
    avatarPositionY: numberValue(input.avatarPositionY, DEFAULT_PROFILE.avatarPositionY),
    headline: text(input.headline, DEFAULT_PROFILE.headline, 240),
    introduction: text(input.introduction, DEFAULT_PROFILE.introduction, 1600),
    location: location === "中国 · 可远程" ? "" : location,
    phone: text(input.phone, DEFAULT_PROFILE.phone, 100),
    email: text(input.email, DEFAULT_PROFILE.email, 200),
    githubUrl: safeUrl(input.githubUrl, DEFAULT_PROFILE.githubUrl),
    giteeUrl: safeUrl(input.giteeUrl, DEFAULT_PROFILE.giteeUrl),
    linkedinUrl: safeUrl(input.linkedinUrl, DEFAULT_PROFILE.linkedinUrl),
    twitterHandle: text(input.twitterHandle, DEFAULT_PROFILE.twitterHandle, 80).replace(/^@/, ""),
    resumeUrl: safeUrl(input.resumeUrl, DEFAULT_PROFILE.resumeUrl),
    skills: textList(input.skills, DEFAULT_PROFILE.skills, 50),
    socialLinks: normalizeContentItems(input.socialLinks, DEFAULT_PROFILE.socialLinks, 16),
    strengths: normalizeContentItems(input.strengths ?? input.skillProgress, DEFAULT_PROFILE.strengths, 20),
    showcaseItems: normalizeContentItems(input.showcaseItems ?? input.openSourceProjects, DEFAULT_PROFILE.showcaseItems, 30, true),
    projects: normalizeContentItems(input.projects, projectsFallback, 30),
    achievements: normalizeContentItems(input.achievements, DEFAULT_PROFILE.achievements, 30),
    blogs: normalizeContentItems(input.blogs, DEFAULT_PROFILE.blogs, 30),
    talks: normalizeContentItems(input.talks, DEFAULT_PROFILE.talks, 30),
    podcasts: normalizeContentItems(input.podcasts, DEFAULT_PROFILE.podcasts, 20),
    metrics: normalizeContentItems(input.metrics, DEFAULT_PROFILE.metrics, 20),
    recommendations: normalizeContentItems(input.recommendations, DEFAULT_PROFILE.recommendations, 20),
    milestones,
    modules,
    moduleOrder,
    moduleNavigation,
    moduleLabels,
  };
}
