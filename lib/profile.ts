export type PortfolioProject = {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  evidenceLabel: string;
  evidenceUrl: string;
};

export type PortfolioMilestone = {
  id: string;
  period: string;
  title: string;
  organization: string;
  summary: string;
};

export type PortfolioProfile = {
  displayName: string;
  title: string;
  headline: string;
  introduction: string;
  location: string;
  email: string;
  githubUrl: string;
  resumeUrl: string;
  skills: string[];
  projects: PortfolioProject[];
  milestones: PortfolioMilestone[];
};

export const DEFAULT_PROFILE: PortfolioProfile = {
  displayName: "你的姓名",
  title: "求职方向 / 专业领域",
  headline: "把真实能力，放进一扇清晰的求职橱窗。",
  introduction:
    "用简洁的故事介绍你正在解决的问题、擅长的事，以及你做过的作品。这里的演示内容可以在后台替换成自己的经历。",
  location: "中国 · 可远程",
  email: "",
  githubUrl: "",
  resumeUrl: "",
  skills: ["TypeScript", "React", "Next.js", "产品思维", "持续交付"],
  projects: [
    {
      id: "project-evidence",
      title: "把项目讲清楚",
      summary: "描述真实问题、你的判断与实现过程，再附上可以验证的结果。",
      tags: ["问题拆解", "方案设计", "可验证证据"],
      evidenceLabel: "添加项目证据",
      evidenceUrl: "#contact",
    },
    {
      id: "project-workflow",
      title: "从经历到作品",
      summary: "用清晰的结构呈现职责、协作方式和你亲自完成的部分。",
      tags: ["个人贡献", "协作", "复盘"],
      evidenceLabel: "添加项目链接",
      evidenceUrl: "#contact",
    },
  ],
  milestones: [
    {
      id: "milestone-one",
      period: "时间段",
      title: "职位 / 角色",
      organization: "公司或项目名称",
      summary: "用一两句话说明负责内容、影响范围与可复核的成果。",
    },
    {
      id: "milestone-two",
      period: "时间段",
      title: "教育 / 专业经历",
      organization: "学校或组织",
      summary: "补充与目标岗位相关的方向、项目或阶段性成果。",
    },
  ],
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, fallback: string, maxLength = 500): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : fallback;
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

export function normalizeProfile(value: unknown): PortfolioProfile {
  const input = asRecord(value);
  const projects = Array.isArray(input.projects)
    ? input.projects.slice(0, 12).map((item, index) => {
        const project = asRecord(item);
        const fallback = DEFAULT_PROFILE.projects[index % DEFAULT_PROFILE.projects.length];
        return {
          id: text(project.id, fallback.id, 80) || fallback.id,
          title: text(project.title, fallback.title, 100),
          summary: text(project.summary, fallback.summary, 500),
          tags: textList(project.tags, fallback.tags, 8),
          evidenceLabel: text(project.evidenceLabel, fallback.evidenceLabel, 80),
          evidenceUrl: safeUrl(project.evidenceUrl, fallback.evidenceUrl),
        };
      })
    : DEFAULT_PROFILE.projects;
  const milestones = Array.isArray(input.milestones)
    ? input.milestones.slice(0, 12).map((item, index) => {
        const milestone = asRecord(item);
        const fallback = DEFAULT_PROFILE.milestones[index % DEFAULT_PROFILE.milestones.length];
        return {
          id: text(milestone.id, fallback.id, 80) || fallback.id,
          period: text(milestone.period, fallback.period, 80),
          title: text(milestone.title, fallback.title, 100),
          organization: text(milestone.organization, fallback.organization, 120),
          summary: text(milestone.summary, fallback.summary, 500),
        };
      })
    : DEFAULT_PROFILE.milestones;

  return {
    displayName: text(input.displayName, DEFAULT_PROFILE.displayName, 80),
    title: text(input.title, DEFAULT_PROFILE.title, 120),
    headline: text(input.headline, DEFAULT_PROFILE.headline, 180),
    introduction: text(input.introduction, DEFAULT_PROFILE.introduction, 1200),
    location: text(input.location, DEFAULT_PROFILE.location, 120),
    email: text(input.email, DEFAULT_PROFILE.email, 200),
    githubUrl: safeUrl(input.githubUrl, DEFAULT_PROFILE.githubUrl),
    resumeUrl: safeUrl(input.resumeUrl, DEFAULT_PROFILE.resumeUrl),
    skills: textList(input.skills, DEFAULT_PROFILE.skills, 40),
    projects,
    milestones,
  };
}
