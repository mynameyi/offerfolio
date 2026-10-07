import Link from "next/link";
import { readProfile } from "@/lib/db";
import { Glyph } from "@/components/glyph";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

function externalLinkProps(url: string) {
  return url.startsWith("http") ? { target: "_blank" as const, rel: "noreferrer" } : {};
}

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return <div className="df-section-heading"><p className="df-eyebrow">{eyebrow}</p><h2>{title}</h2>{subtitle ? <p className="df-subtitle">{subtitle}</p> : null}</div>;
}

function DeveloperIllustration({ variant = "greeting" }: { variant?: "greeting" | "skills" | "progress" }) {
  if (variant === "progress") {
    return (
      <svg className="df-illustration" viewBox="0 0 460 350" role="img" aria-label="技能数据插画">
        <ellipse cx="230" cy="313" rx="177" ry="17" fill="#f2eef6" />
        <rect x="118" y="46" width="219" height="217" rx="10" fill="#fff" stroke="#e1d8eb" strokeWidth="2" />
        <path d="M118 72h219" stroke="#e5ddec" strokeWidth="2" />
        <circle cx="135" cy="60" r="4" fill="#ef8b91" /><circle cx="150" cy="60" r="4" fill="#efca77" /><circle cx="165" cy="60" r="4" fill="#91caa3" />
        <rect x="146" y="98" width="162" height="14" rx="7" fill="#f1edf4" /><rect x="146" y="98" width="132" height="14" rx="7" fill="#55198b" />
        <rect x="146" y="137" width="162" height="14" rx="7" fill="#f1edf4" /><rect x="146" y="137" width="105" height="14" rx="7" fill="#9b76b8" />
        <rect x="146" y="176" width="162" height="14" rx="7" fill="#f1edf4" /><rect x="146" y="176" width="119" height="14" rx="7" fill="#c4acd7" />
        <path d="M93 276h270l-22 25H115l-22-25Z" fill="#c8b2d9" /><path d="M174 301h107" stroke="#9474aa" strokeWidth="3" strokeLinecap="round" />
        <circle cx="365" cy="104" r="27" fill="#eee7f4" /><path d="m354 105 8 8 15-18" fill="none" stroke="#55198b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m83 140 11-19 11 19h-8v20h-7v-20h-7Z" fill="#b69bc9" />
      </svg>
    );
  }

  if (variant === "skills") {
    return (
      <svg className="df-illustration" viewBox="0 0 480 390" role="img" aria-label="开发者编程插画">
        <ellipse cx="240" cy="349" rx="190" ry="20" fill="#f2eef6" />
        <rect x="75" y="42" width="280" height="204" rx="11" fill="#fff" stroke="#dfd6e8" strokeWidth="2" />
        <path d="M75 72h280" stroke="#e6e0ec" strokeWidth="2" /><circle cx="94" cy="57" r="4" fill="#f19395" /><circle cx="109" cy="57" r="4" fill="#efca77" /><circle cx="124" cy="57" r="4" fill="#8bc59b" />
        <path d="m121 115-20 18 20 18m49-36 20 18-20 18m38 9 24-60" fill="none" stroke="#8855ad" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="100" y="192" width="111" height="8" rx="4" fill="#ece6f1" /><rect x="100" y="210" width="179" height="8" rx="4" fill="#f1edf4" />
        <path d="M55 246h320l-29 38H84l-29-38Z" fill="#c8b5d9" /><path d="M192 266h47" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        <path d="M293 139c0-31 24-56 55-56 22 0 41 13 50 32l25-4-8 25 16 24-25 2c-5 27-29 47-58 47-31 0-55-25-55-56v-14Z" fill="#f0e7f6" />
        <circle cx="348" cy="133" r="5" fill="#55198b" /><circle cx="375" cy="133" r="5" fill="#55198b" /><path d="M348 158c8 9 19 9 27 0" fill="none" stroke="#55198b" strokeWidth="3" strokeLinecap="round" />
        <path d="m82 101-8-13m229 171 11-8M395 70l5-17M407 218l17 2" stroke="#b798cc" strokeWidth="3" strokeLinecap="round" />
        <circle cx="69" cy="77" r="7" fill="#f4cf80" /><circle cx="416" cy="90" r="6" fill="#9bcba9" /><path d="M124 284h55" stroke="#8f70a5" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg className="df-illustration" viewBox="0 0 520 430" role="img" aria-label="个人作品集插画">
      <ellipse cx="257" cy="390" rx="210" ry="20" fill="#f2eef6" />
      <circle cx="275" cy="206" r="166" fill="#f5f2f7" />
      <path d="M83 286c-17-27-14-61 13-78 19-12 43-10 59 6l-7 71H83Z" fill="#d9c7e7" />
      <rect x="107" y="69" width="280" height="265" rx="11" fill="#fff" stroke="#dfd6e8" strokeWidth="2" />
      <path d="M107 100h280" stroke="#e9e3ed" strokeWidth="2" /><circle cx="126" cy="84" r="4" fill="#ef8b91" /><circle cx="141" cy="84" r="4" fill="#efca77" /><circle cx="156" cy="84" r="4" fill="#91caa3" />
      <rect x="136" y="123" width="83" height="83" rx="42" fill="#eee6f4" /><circle cx="178" cy="153" r="17" fill="#cbb3dd" /><path d="M148 194c3-20 14-30 30-30s27 10 30 30" fill="#9b76b8" />
      <rect x="239" y="132" width="111" height="12" rx="6" fill="#55198b" /><rect x="239" y="155" width="78" height="9" rx="4" fill="#d4c5df" />
      <rect x="136" y="231" width="214" height="8" rx="4" fill="#e9e3ed" /><rect x="136" y="250" width="190" height="8" rx="4" fill="#eeeaf1" /><rect x="136" y="269" width="204" height="8" rx="4" fill="#eeeaf1" />
      <rect x="137" y="297" width="65" height="22" rx="11" fill="#55198b" /><rect x="210" y="297" width="49" height="22" rx="11" fill="#eee6f4" />
      <path d="M388 185c21 0 38 17 38 38v63c0 21-17 38-38 38h-13l-24 19 5-27c-8-7-13-18-13-30v-63c0-21 17-38 38-38h7Z" fill="#d8c5e6" />
      <path d="m381 237 10 10 20-23" fill="none" stroke="#55198b" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m400 110 8-16 8 16h-6v15h-5v-15h-5Z" fill="#9e7cba" /><circle cx="86" cy="147" r="8" fill="#f3ce7c" /><path d="M440 151h24m-12-12v24" stroke="#9e7cba" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function HomePage() {
  const profile = readProfile();
  const { modules } = profile;
  const experience = profile.milestones.filter((item) => item.kind === "experience");
  const education = profile.milestones.filter((item) => item.kind === "education");
  const growth = profile.milestones.filter((item) => item.kind === "growth");
  const navItems = [
    { key: "skills", label: "技能专长", href: "#skills", visible: modules.skills },
    { key: "education", label: "教育背景", href: "#education", visible: modules.education && education.length > 0 },
    { key: "workExperience", label: "工作经历", href: "#experience", visible: modules.workExperience && experience.length > 0 },
    { key: "openSource", label: "开源项目", href: "#opensource", visible: modules.openSource },
    { key: "bigProjects", label: "精选项目", href: "#projects", visible: modules.bigProjects },
    { key: "achievements", label: "成就证书", href: "#achievements", visible: modules.achievements },
    { key: "blogs", label: "文章博客", href: "#blogs", visible: modules.blogs },
    { key: "talks", label: "演讲分享", href: "#talks", visible: modules.talks },
    { key: "resume", label: "简历", href: "#resume", visible: modules.resume },
    { key: "contact", label: "联系我", href: "#contact", visible: modules.contact },
  ].filter((item) => item.visible);
  const socialItems = [
    ...profile.socialLinks,
    ...(profile.githubUrl ? [{ id: "profile-github", title: "GitHub", url: profile.githubUrl }] : []),
    ...(profile.linkedinUrl ? [{ id: "profile-linkedin", title: "LinkedIn", url: profile.linkedinUrl }] : []),
    ...(profile.twitterHandle ? [{ id: "profile-twitter", title: "X", url: `https://x.com/${profile.twitterHandle}` }] : []),
  ].filter((item, index, items) => item.url && items.findIndex((other) => other.url === item.url) === index);

  return (
    <main className="developerfolio-site" data-theme="light">
      <header className="df-header" id="top">
        <Link href="/" className="df-logo" aria-label="OfferFolio 首页"><span className="df-logo-muted">&lt;</span><span>{profile.displayName}</span><span className="df-logo-muted">/&gt;</span></Link>
        <details className="df-mobile-menu"><summary aria-label="打开导航"><span /><span /><span /></summary><nav aria-label="移动导航">{navItems.map((item) => <a key={item.key} href={item.href}>{item.label}</a>)}<ThemeToggle /></nav></details>
        <nav className="df-nav" aria-label="主导航">{navItems.map((item) => <a key={item.key} href={item.href}>{item.label}</a>)}<ThemeToggle /></nav>
      </header>

      {modules.greeting ? (
        <section className="df-main df-greeting" id="greeting">
          <div className="df-greeting-copy">
            <p className="df-greeting-title">{profile.headline || `你好，我是${profile.displayName}`} <span className="df-wave" aria-hidden="true">👋</span></p>
            <p className="df-greeting-subtitle">{profile.introduction}</p>
            <p className="df-greeting-role">{profile.title}</p>
            <div className="df-greeting-buttons">
              {modules.resume && profile.resumeUrl ? <a className="df-button" href={profile.resumeUrl} {...externalLinkProps(profile.resumeUrl)}>下载简历 <Glyph name="arrow" /></a> : null}
              {modules.contact ? <a className="df-button df-button-outline" href="#contact">联系我 <Glyph name="arrow" /></a> : null}
            </div>
            {modules.social && socialItems.length ? <div className="df-social-row" aria-label="社交链接">{socialItems.map((item) => <a key={item.id} href={item.url} aria-label={item.title} title={item.title} {...externalLinkProps(item.url)}><span>{item.title === "GitHub" ? "GH" : item.title.slice(0, 2).toUpperCase()}</span></a>)}</div> : null}
          </div>
          <div className="df-greeting-image"><DeveloperIllustration /></div>
        </section>
      ) : null}

      {modules.metrics && profile.metrics.length ? <section className="df-metrics-strip" aria-label="数据亮点"><div className="df-metrics-grid">{profile.metrics.map((metric) => <article key={metric.id}><strong>{metric.value}</strong><span>{metric.title}</span>{metric.summary ? <small>{metric.summary}</small> : null}</article>)}</div></section> : null}

      {modules.skills ? (
        <section className="df-main df-skills" id="skills">
          <div className="df-illustration-side"><DeveloperIllustration variant="skills" /></div>
          <div className="df-section-content">
            <SectionHeading eyebrow="技能专长" title="我能做什么" subtitle="持续探索技术边界，将想法变成可靠、好用的产品体验。" />
            {profile.skills.length ? <div className="df-tech-icons" aria-label="技能矩阵">{profile.skills.map((skill, index) => <span key={`${skill}-${index}`} title={skill}><i>{skill.slice(0, 2).toUpperCase()}</i><small>{skill}</small></span>)}</div> : null}
            <ul className="df-skill-bullets"><li>构建清晰、响应迅速的 Web 前端与交互体验</li><li>设计易于维护的服务接口、数据模型与开发流程</li><li>重视真实需求、交付质量与团队协作</li></ul>
          </div>
        </section>
      ) : null}

      {modules.skillProgress && profile.skillProgress.length ? (
        <section className="df-main df-progress-section" id="skill-progress">
          <div className="df-progress-copy"><SectionHeading eyebrow="技术方向" title="专业能力" subtitle="将长期实践的技术领域与项目经验直观呈现。" /><div className="df-progress-list">{profile.skillProgress.map((item) => <div className="df-progress-item" key={item.id}><div><span>{item.title}</span><strong>{item.level}%</strong></div><span className="df-progress-track"><i style={{ width: `${item.level}%` }} /></span></div>)}</div></div>
          <div className="df-illustration-side"><DeveloperIllustration variant="progress" /></div>
        </section>
      ) : null}

      {modules.education && education.length ? (
        <section className="df-main df-content-section" id="education">
          <SectionHeading eyebrow="教育背景" title="学习经历" subtitle="专业训练、持续学习与实践积累。" />
          <div className="df-education-grid">{education.map((item) => <article className="df-education-card" key={item.id}><div className="df-institution-mark">{item.organization.slice(0, 1) || "学"}</div><div><p className="df-card-period">{item.period}</p><h3>{item.organization}</h3><h4>{item.title}</h4><p>{item.summary}</p></div></article>)}</div>
        </section>
      ) : null}

      {modules.workExperience && experience.length ? (
        <section className="df-main df-content-section df-experience-section" id="experience">
          <SectionHeading eyebrow="工作经历" title="职业经历" subtitle="承担责任、解决问题，并与团队一起交付有价值的成果。" />
          <div className="df-experience-list">{experience.map((item) => <article className="df-experience-card" key={item.id}><div className="df-company-mark">{item.organization.slice(0, 1) || "工"}</div><div className="df-experience-content"><div className="df-experience-title"><div><h3>{item.title}</h3><p>{item.organization}</p></div><span>{item.period}</span></div><p>{item.summary}</p></div></article>)}</div>
        </section>
      ) : null}

      {modules.openSource ? (
        <section className="df-main df-content-section" id="opensource">
          <SectionHeading eyebrow="开源项目" title="开源作品" subtitle="在公开代码与协作中持续学习、构建和分享。" />
          {profile.openSourceProjects.length ? <div className="df-repo-grid">{profile.openSourceProjects.map((repo) => <article className="df-repo-card" key={repo.id}><div className="df-repo-heading"><span className="df-repo-icon">⌘</span><h3>{repo.url ? <a href={repo.url} {...externalLinkProps(repo.url)}>{repo.title}</a> : repo.title}</h3><span className="df-public-badge">公开</span></div><p>{repo.summary}</p><div className="df-repo-meta">{repo.language ? <span><i className="df-language-dot" />{repo.language}</span> : null}{repo.stars ? <span>☆ {repo.stars}</span> : null}{repo.forks ? <span>⑂ {repo.forks}</span> : null}</div>{repo.tags.length ? <div className="df-tag-row">{repo.tags.map((tag) => <span key={tag}>{tag}</span>)}</div> : null}</article>)}</div> : <div className="df-empty-state">尚未添加开源仓库，可在管理后台填写仓库名称、描述与 GitHub 地址。</div>}
          {profile.githubUrl ? <a className="df-button df-more-button" href={profile.githubUrl} {...externalLinkProps(profile.githubUrl)}>查看更多 GitHub 项目 <Glyph name="arrow" /></a> : null}
        </section>
      ) : null}

      {modules.bigProjects ? (
        <section className="df-main df-content-section df-projects-section" id="projects">
          <SectionHeading eyebrow="精选项目" title="代表项目" subtitle="参与设计与构建的项目，以及其中的思考和成果。" />
          {profile.projects.length ? <div className="df-project-grid">{profile.projects.map((project) => <article className="df-project-card" key={project.id}>{project.imageUrl ? <div className="df-project-image"><img src={project.imageUrl} alt={project.title} loading="lazy" /></div> : <div className="df-project-image df-project-image-placeholder"><span>{project.title.slice(0, 1) || "项"}</span></div>}<div className="df-project-body"><p className="df-project-subtitle">{project.subtitle || project.tags.slice(0, 2).join(" · ")}</p><h3>{project.title}</h3><p>{project.summary}</p>{project.tags.length ? <div className="df-tag-row">{project.tags.map((tag) => <span key={tag}>{tag}</span>)}</div> : null}<div className="df-project-links">{project.url ? <a href={project.url} {...externalLinkProps(project.url)}>{project.urlLabel || "查看项目"} <Glyph name="arrow" /></a> : null}{project.secondaryUrl ? <a href={project.secondaryUrl} {...externalLinkProps(project.secondaryUrl)}>{project.secondaryLabel || "了解更多"} <Glyph name="arrow" /></a> : null}</div></div></article>)}</div> : <div className="df-empty-state">尚未添加项目，可在管理后台添加介绍、图片与链接。</div>}
        </section>
      ) : null}

      {modules.achievements ? (
        <section className="df-main df-content-section" id="achievements">
          <SectionHeading eyebrow="成就与证书" title="荣誉与认证" subtitle="奖项、认证、公开成果以及值得记录的专业实践。" />
          {profile.achievements.length ? <div className="df-achievement-grid">{profile.achievements.map((item) => <article className="df-achievement-card" key={item.id}>{item.imageUrl ? <img src={item.imageUrl} alt={item.title} loading="lazy" /> : <div className="df-achievement-placeholder">✦</div>}<div><p className="df-card-period">{item.period}</p><h3>{item.title}</h3><p>{item.summary}</p><div className="df-project-links">{item.url ? <a href={item.url} {...externalLinkProps(item.url)}>{item.urlLabel || "查看证明"} <Glyph name="arrow" /></a> : null}{item.secondaryUrl ? <a href={item.secondaryUrl} {...externalLinkProps(item.secondaryUrl)}>{item.secondaryLabel || "相关链接"} <Glyph name="arrow" /></a> : null}</div></div></article>)}</div> : <div className="df-empty-state">还没有添加证书或成就。可先关闭此模块，稍后再补充。</div>}
        </section>
      ) : null}

      {modules.blogs ? (
        <section className="df-main df-content-section df-blogs-section" id="blogs">
          <SectionHeading eyebrow="文章博客" title="近期文章" subtitle="写下实践经验，整理值得分享的技术思考。" />
          {profile.blogs.length ? <div className="df-blog-grid">{profile.blogs.map((blog) => <article className="df-blog-card" key={blog.id}><div className="df-blog-card-top"><span>文章</span><span>{blog.period}</span></div><h3>{blog.title}</h3><p>{blog.summary}</p>{blog.tags.length ? <div className="df-tag-row">{blog.tags.map((tag) => <span key={tag}>{tag}</span>)}</div> : null}{blog.url ? <a href={blog.url} {...externalLinkProps(blog.url)}>{blog.urlLabel || "阅读文章"} <Glyph name="arrow" /></a> : null}</article>)}</div> : <div className="df-empty-state">尚未添加文章，可在后台添加文章标题、摘要和链接。</div>}
        </section>
      ) : null}

      {modules.talks ? (
        <section className="df-main df-content-section" id="talks">
          <SectionHeading eyebrow="演讲与分享" title="演讲活动" subtitle="分享实践经验，也从交流中获得新的启发。" />
          {profile.talks.length ? <div className="df-talk-list">{profile.talks.map((talk) => <article className="df-talk-card" key={talk.id}><div className="df-talk-icon">◉</div><div className="df-talk-copy"><p className="df-card-period">{talk.period}{talk.organization ? ` · ${talk.organization}` : ""}</p><h3>{talk.title}</h3><p>{talk.summary || talk.subtitle}</p><div className="df-project-links">{talk.url ? <a href={talk.url} {...externalLinkProps(talk.url)}>{talk.urlLabel || "活动详情"} <Glyph name="arrow" /></a> : null}{talk.secondaryUrl ? <a href={talk.secondaryUrl} {...externalLinkProps(talk.secondaryUrl)}>{talk.secondaryLabel || "演示文稿"} <Glyph name="arrow" /></a> : null}</div></div></article>)}</div> : <div className="df-empty-state">尚未添加演讲或活动，可在后台补充信息。</div>}
        </section>
      ) : null}

      {modules.twitter ? (
        <section className="df-main df-twitter-section" id="twitter"><SectionHeading eyebrow="社交动态" title="保持联系" subtitle="关注我的公开动态与近期分享。" />{profile.twitterHandle ? <a className="df-twitter-card" href={`https://x.com/${profile.twitterHandle}`} target="_blank" rel="noreferrer"><span className="df-twitter-mark">𝕏</span><span><strong>@{profile.twitterHandle}</strong><small>在 X 查看近期动态</small></span><Glyph name="arrow" /></a> : <p className="df-empty-state">在后台填写 Twitter / X 用户名后，这里会显示个人动态入口。</p>}</section>
      ) : null}

      {modules.podcast ? (
        <section className="df-main df-content-section df-podcast-section" id="podcast"><SectionHeading eyebrow="播客节目" title="播客与访谈" subtitle="关于技术实践、产品构建与成长经历的交流。" />{profile.podcasts.length ? <div className="df-podcast-grid">{profile.podcasts.map((episode) => <article className="df-podcast-card" key={episode.id}><div className="df-podcast-icon">♫</div><div><h3>{episode.title}</h3><p>{episode.summary}</p>{episode.embedUrl ? <iframe src={episode.embedUrl} title={`${episode.title} 播放器`} loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" /> : episode.url ? <a href={episode.url} {...externalLinkProps(episode.url)}>{episode.urlLabel || "收听节目"} <Glyph name="arrow" /></a> : null}</div></article>)}</div> : <div className="df-empty-state">尚未添加播客节目，可在后台填写播放或收听链接。</div>}</section>
      ) : null}

      {modules.growth && growth.length ? (
        <section className="df-main df-content-section df-growth-section" id="growth"><SectionHeading eyebrow="成长时间线" title="一路走来的节点" subtitle="学习、实践和职业成长中的重要片段。" /><div className="df-growth-list">{growth.map((item) => <article key={item.id}><span>{item.period}</span><i /><div><h3>{item.title}</h3><p>{item.organization}</p><small>{item.summary}</small></div></article>)}</div></section>
      ) : null}

      {modules.recommendations && profile.recommendations.length ? (
        <section className="df-main df-content-section df-recommendations-section" id="recommendations"><SectionHeading eyebrow="推荐语" title="来自合作伙伴的评价" subtitle="共同工作过的人，最了解合作过程与实际贡献。" /><div className="df-recommendation-grid">{profile.recommendations.map((item) => <blockquote className="df-recommendation-card" key={item.id}><span aria-hidden="true">“</span><p>{item.summary}</p><footer><strong>{item.title}</strong><small>{item.organization}</small>{item.url ? <a href={item.url} {...externalLinkProps(item.url)}>查看身份 <Glyph name="arrow" /></a> : null}</footer></blockquote>)}</div></section>
      ) : null}

      {modules.resume ? (
        <section className="df-resume-section" id="resume"><div className="df-resume-inner"><div><p className="df-eyebrow">简历下载</p><h2>想进一步了解我的经历？</h2><p>查看完整履历、项目背景与专业经验。</p></div>{profile.resumeUrl ? <a className="df-button" href={profile.resumeUrl} {...externalLinkProps(profile.resumeUrl)}>下载简历 <Glyph name="arrow" /></a> : <span className="df-resume-note">请在管理后台添加简历 PDF 链接</span>}</div></section>
      ) : null}

      {modules.contact ? (
        <section className="df-main df-contact-section" id="contact"><SectionHeading eyebrow="联系方式" title="联系我" subtitle="如需了解项目细节或工作经历，可通过邮件或社交平台联系。" /><div className="df-contact-card"><div className="df-contact-avatar">{profile.displayName.slice(0, 1) || "你"}</div><div className="df-contact-info"><h3>{profile.displayName}</h3><p>{profile.title}</p><div className="df-contact-details">{profile.email ? <a href={`mailto:${profile.email}`}>{profile.email}</a> : null}{profile.phone ? <a href={`tel:${profile.phone}`}>{profile.phone}</a> : null}{profile.location ? <span><Glyph name="pin" />{profile.location}</span> : null}</div>{modules.social && socialItems.length ? <div className="df-contact-social">{socialItems.map((item) => <a href={item.url} key={`contact-${item.id}`} {...externalLinkProps(item.url)}>{item.title}</a>)}</div> : null}</div></div></section>
      ) : null}

      <footer className="df-footer"><p>用真实作品与清晰经历，展示每一份专业价值。</p><span>© {new Date().getFullYear()} {profile.displayName} · EckyStudio</span><Link href="/admin">管理主页</Link></footer>
      <a className="df-back-to-top" href="#top" aria-label="返回顶部">↑</a>
    </main>
  );
}
