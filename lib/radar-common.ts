export type VisitorAttribution = {
  token: string | null;
  linkLabel: string;
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
};

export type VisitorSource = { category: string; label: string };
export type VisitorSourceCount = VisitorSource & { count: number };

export const VISITOR_RETENTION_OPTIONS = [0, 30, 90, 180, 365] as const;

function referrerHost(referrer: string): string {
  try {
    return new URL(referrer).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

export function visitorSource(attribution: VisitorAttribution): VisitorSource {
  if (attribution.token || attribution.linkLabel) {
    return { category: "专属投递", label: attribution.linkLabel || "未命名专属链接" };
  }

  const utmSource = attribution.utmSource.trim();
  if (utmSource || attribution.utmMedium || attribution.utmCampaign) {
    return {
      category: "推广链接",
      label: utmSource || attribution.utmCampaign || attribution.utmMedium || "UTM 活动",
    };
  }

  const host = referrerHost(attribution.referrer);
  if (!host) return { category: "直接访问 / 来源不可见", label: "直接访问 / 来源不可见" };

  if (/baidu\.|bing\.|google\.|sogou\.|so\.com$|yandex\./i.test(host)) {
    const name = /baidu\./i.test(host) ? "百度" : /bing\./i.test(host) ? "Bing" : /google\./i.test(host) ? "Google" : /sogou\./i.test(host) ? "搜狗" : /yandex\./i.test(host) ? "Yandex" : "360 搜索";
    return { category: "搜索引擎", label: name };
  }
  if (/weixin\.|wechat\.|weibo\.|zhihu\.|xiaohongshu\.|douyin\.|tiktok\.|linkedin\.|facebook\.|instagram\./i.test(host)) {
    const name = /weixin\.|wechat\./i.test(host) ? "微信" : /weibo\./i.test(host) ? "微博" : /zhihu\./i.test(host) ? "知乎" : /xiaohongshu\./i.test(host) ? "小红书" : /douyin\./i.test(host) ? "抖音" : /tiktok\./i.test(host) ? "TikTok" : /linkedin\./i.test(host) ? "LinkedIn" : /instagram\./i.test(host) ? "Instagram" : "Facebook";
    return { category: "社交平台", label: name };
  }
  if (/zhipin\.|liepin\.|lagou\.|51job\.|yingjiesheng\.|job51\.|chinahr\./i.test(host)) {
    const name = /zhipin\./i.test(host) ? "BOSS直聘" : /liepin\./i.test(host) ? "猎聘" : /lagou\./i.test(host) ? "拉勾" : /51job\.|job51\./i.test(host) ? "前程无忧" : /yingjiesheng\./i.test(host) ? "应届生求职网" : "中华英才网";
    return { category: "招聘平台", label: name };
  }
  return { category: "外部网站", label: host };
}

export const visitorActionLabels: Record<string, string> = {
  contact: "联系我",
  resume: "下载简历",
  github: "GitHub",
  gitee: "Gitee",
};
