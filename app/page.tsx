import Link from "next/link";
import { readProfile } from "@/lib/db";
import { Glyph } from "@/components/glyph";

export const dynamic = "force-dynamic";

function safeMailto(email: string, fallback: string) {
  return email.trim() ? `mailto:${email.trim()}` : fallback;
}

export default function HomePage() {
  const profile = readProfile();
  const { modules } = profile;
  const contactHref = modules.contact ? "#contact" : "#greeting";
  const work = profile.milestones.filter((item) => item.kind === "experience");
  const education = profile.milestones.filter((item) => item.kind === "education");
  const visibleSections = [
    modules.skills ? "skills" : null,
    modules.education && education.length ? "education" : null,
    modules.experience && work.length ? "experience" : null,
    modules.projects ? "projects" : null,
    modules.openSource ? "openSource" : null,
    modules.resume ? "resume" : null,
    modules.contact ? "contact" : null,
  ].filter((key): key is string => Boolean(key));
  const sectionNumber = (key: string) => String(visibleSections.indexOf(key) + 1).padStart(2, "0");
  const navigation = [
    ["skills", "技能专长"],
    ["education", "教育经历"],
    ["experience", "工作经历"],
    ["projects", "精选项目"],
    ["openSource", "开源主页"],
    ["contact", "联系方式"],
  ].filter(([key]) => modules[key as keyof typeof modules] && (key === "education" ? education.length > 0 : key === "experience" ? work.length > 0 : true));

  return (
    <main className="folio-site">
      <header className="folio-header">
        <Link className="folio-brand" href="/" aria-label="OfferFolio 首页">
          <span className="folio-brand-mark">O</span>
          <span><strong>OfferFolio</strong><small>求职橱窗</small></span>
        </Link>
        <nav className="folio-nav" aria-label="主导航">
          {navigation.map(([key, label]) => <a key={key} href={`#${key}`}>{label}</a>)}
        </nav>
        {modules.contact ? <a className="folio-nav-cta" href={safeMailto(profile.email, "#contact")}>联系我 <Glyph name="arrow" /></a> : null}
      </header>

      {modules.greeting ? (
        <section className="folio-hero" id="greeting">
          <div className="folio-hero-inner">
            <div className="folio-hero-copy">
              <p className="folio-overline"><span /> 你好，欢迎来到我的个人主页</p>
              <h1>我是 <span>{profile.displayName}</span></h1>
              <h2>{profile.title}</h2>
              <p className="folio-headline">{profile.headline}</p>
              <p className="folio-intro">{profile.introduction}</p>
              <div className="folio-hero-actions">
                {modules.projects ? <a className="folio-button" href="#projects">查看我的项目 <Glyph name="arrow" /></a> : null}
                <a className="folio-button folio-button-outline" href={safeMailto(profile.email, contactHref)}>与我联系 <Glyph name="arrow" /></a>
                {modules.resume ? <a className="folio-button folio-button-outline" href={profile.resumeUrl || "#resume"} target={profile.resumeUrl ? "_blank" : undefined} rel={profile.resumeUrl ? "noreferrer" : undefined}>下载简历 <Glyph name="arrow" /></a> : null}
              </div>
              <div className="folio-social-links">
                {profile.githubUrl ? <a href={profile.githubUrl} target="_blank" rel="noreferrer">GitHub <Glyph name="arrow" /></a> : null}
                {profile.email ? <a href={`mailto:${profile.email}`}>邮箱 <Glyph name="arrow" /></a> : null}
                <span><Glyph name="pin" />{profile.location}</span>
              </div>
            </div>
            <div className="folio-hero-art" aria-hidden="true">
              <div className="folio-art-orbit" />
              <div className="folio-art-blob" />
              <div className="folio-art-window">
                <div className="folio-art-window-top"><span /><span /><span /><i>个人档案 · {new Date().getFullYear()}</i></div>
                <div className="folio-art-avatar">{profile.displayName.slice(0, 1) || "你"}</div>
                <strong>{profile.displayName}</strong>
                <span className="folio-art-role">{profile.title}</span>
                <div className="folio-art-divider" />
                <span className="folio-art-caption">持续学习 · 持续创造 · 持续交付</span>
              </div>
              <span className="folio-art-tag folio-art-tag-top">✳ 让能力被看见</span>
              <span className="folio-art-tag folio-art-tag-bottom">作品 · 经历 · 联系方式</span>
            </div>
          </div>
        </section>
      ) : null}

      {modules.skills ? (
        <section className="folio-section folio-skills" id="skills">
          <div className="folio-section-inner folio-skills-layout">
            <div className="folio-section-copy">
              <p className="folio-section-kicker">{sectionNumber("skills")} / 技能专长</p>
              <h2>把经验转化为<br /><em>解决问题的能力</em></h2>
              <p>持续积累、不断实践，让每项技能都能落在真实项目与协作成果里。</p>
            </div>
            <div className="folio-skill-list" aria-label="专业技能">
              {profile.skills.map((skill, index) => <span key={`${skill}-${index}`}><i>{String(index + 1).padStart(2, "0")}</i>{skill}</span>)}
            </div>
          </div>
        </section>
      ) : null}

      {modules.education && education.length ? (
        <section className="folio-section" id="education">
          <div className="folio-section-inner">
            <div className="folio-section-heading"><div><p className="folio-section-kicker">{sectionNumber("education")} / 教育经历</p><h2>学习经历</h2></div><p>为专业能力打下基础，<br />也为持续成长提供方向。</p></div>
            <div className="folio-timeline">
              {education.map((item) => <article className="folio-timeline-item" key={item.id}><span className="folio-period">{item.period}</span><span className="folio-timeline-dot" /><div><p>{item.organization}</p><h3>{item.title}</h3><span>{item.summary}</span></div></article>)}
            </div>
          </div>
        </section>
      ) : null}

      {modules.experience && work.length ? (
        <section className="folio-section folio-section-tint" id="experience">
          <div className="folio-section-inner">
            <div className="folio-section-heading"><div><p className="folio-section-kicker">{sectionNumber("experience")} / 工作经历</p><h2>职业轨迹</h2></div><p>清楚呈现职责、协作过程<br />以及每一段经历的实际成果。</p></div>
            <div className="folio-timeline">
              {work.map((item) => <article className="folio-timeline-item" key={item.id}><span className="folio-period">{item.period}</span><span className="folio-timeline-dot" /><div><p>{item.organization}</p><h3>{item.title}</h3><span>{item.summary}</span></div></article>)}
            </div>
          </div>
        </section>
      ) : null}

      {modules.projects ? (
        <section className="folio-section" id="projects">
          <div className="folio-section-inner">
            <div className="folio-section-heading"><div><p className="folio-section-kicker">{sectionNumber("projects")} / 精选项目</p><h2>项目作品</h2></div><p>从真实问题出发，<br />用作品说明思考与执行。</p></div>
            <div className="folio-project-grid">
              {profile.projects.map((project, index) => (
                <article className="folio-project-card" key={project.id}>
                  <div className={`folio-project-art folio-project-art-${index % 3}`}><span className="folio-project-art-index">{String(index + 1).padStart(2, "0")}</span><span className="folio-project-art-orbit" /><span className="folio-project-art-square" /><i>项目作品</i></div>
                  <div className="folio-project-body"><div className="folio-project-tags">{project.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><h3>{project.title}</h3><p>{project.summary}</p><a href={project.evidenceUrl.startsWith("#") ? contactHref : project.evidenceUrl} target={project.evidenceUrl.startsWith("http") ? "_blank" : undefined} rel={project.evidenceUrl.startsWith("http") ? "noreferrer" : undefined}>{project.evidenceLabel || "查看项目"}<Glyph name="arrow" /></a></div>
                </article>
              ))}
              {!profile.projects.length ? <p className="folio-empty">还没有添加项目，可在管理后台补充作品。</p> : null}
            </div>
          </div>
        </section>
      ) : null}

      {modules.openSource ? (
        <section className="folio-section folio-open-source" id="openSource">
          <div className="folio-section-inner folio-open-source-inner"><div><p className="folio-section-kicker">{sectionNumber("openSource")} / 开源主页</p><h2>在代码里，<br /><em>分享每一次创造。</em></h2><p>在 GitHub 查看我的开源项目、代码实践与持续积累。</p></div>{profile.githubUrl ? <a className="folio-github-card" href={profile.githubUrl} target="_blank" rel="noreferrer"><span className="folio-github-mark">GH</span><span><strong>访问 GitHub 主页</strong><small>{profile.githubUrl.replace(/^https?:\/\//, "")}</small></span><Glyph name="arrow" /></a> : <p className="folio-github-card folio-github-empty">请先在管理后台填写 GitHub 主页地址。</p>}</div>
        </section>
      ) : null}

      {modules.resume ? (
        <section className="folio-section folio-resume" id="resume"><div className="folio-section-inner folio-resume-inner"><div><p className="folio-section-kicker">{sectionNumber("resume")} / 简历</p><h2>进一步了解我的经历</h2><p>下载简历，查看完整履历与专业背景。</p></div>{profile.resumeUrl ? <a className="folio-button" href={profile.resumeUrl} target="_blank" rel="noreferrer">下载简历 PDF <Glyph name="arrow" /></a> : <span className="folio-resume-hint">请在管理后台添加简历 PDF 链接</span>}</div></section>
      ) : null}

      {modules.contact ? (
        <section className="folio-section folio-contact" id="contact">
          <div className="folio-section-inner folio-contact-inner"><div><p className="folio-section-kicker">{sectionNumber("contact")} / 联系方式</p><h2>期待与你<br /><em>开启下一段合作。</em></h2><p>如果你认为我的经历与机会契合，欢迎联系我交流。</p></div><div className="folio-contact-links">{profile.email ? <a href={`mailto:${profile.email}`}><span>邮件联系<small>{profile.email}</small></span><Glyph name="arrow" /></a> : <span className="folio-contact-missing">请在管理后台添加联系邮箱</span>}{profile.githubUrl ? <a href={profile.githubUrl} target="_blank" rel="noreferrer"><span>GitHub<small>查看代码与项目</small></span><Glyph name="arrow" /></a> : null}<span className="folio-contact-location"><Glyph name="pin" />{profile.location}</span></div></div>
        </section>
      ) : null}

      <footer className="folio-footer"><Link className="folio-brand" href="/"><span className="folio-brand-mark">O</span><span><strong>OfferFolio</strong><small>求职橱窗</small></span></Link><p>用作品与经历，清楚呈现每一份专业价值。</p><span>© {new Date().getFullYear()} EckyStudio</span></footer>
    </main>
  );
}
