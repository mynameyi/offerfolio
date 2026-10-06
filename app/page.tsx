import Link from "next/link";
import { readProfile } from "@/lib/db";
import { Glyph } from "@/components/glyph";

export const dynamic = "force-dynamic";

function safeMailto(email: string) {
  return email.trim() ? `mailto:${email.trim()}` : "#contact";
}

export default function HomePage() {
  const profile = readProfile();
  const firstName = profile.displayName === "你的姓名" ? "你好，求职者。" : `你好，我是${profile.displayName}。`;

  return (
    <main className="portfolio">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="OfferFolio 首页">
          <span className="brand-mark">O<span>.</span></span>
          <span className="brand-copy">
            <strong>OfferFolio</strong>
            <small>求职橱窗</small>
          </span>
        </Link>
        <nav className="site-nav" aria-label="主导航">
          <a href="#about">关于</a>
          <a href="#skills">能力</a>
          <a href="#projects">项目</a>
          <a href="#experience">经历</a>
        </nav>
        <a className="nav-contact" href={safeMailto(profile.email)}>
          联系我 <Glyph name="arrow" />
        </a>
      </header>

      <section className="hero section-wrap" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className="eyebrow"><span className="status-dot" /> 个人作品集 · 演示档案</div>
          <p className="hero-greeting">{firstName}</p>
          <h1 id="hero-title">{profile.headline}</h1>
          <p className="hero-summary">{profile.introduction}</p>
          <div className="hero-actions">
            <a className="button button-dark" href="#projects">浏览精选项目 <Glyph name="arrow" /></a>
            <a className="text-link" href={safeMailto(profile.email)}>与我聊聊 <Glyph name="arrow" /></a>
          </div>
          <div className="hero-meta">
            <span><Glyph name="pin" /> {profile.location}</span>
            <span className="meta-divider" />
            <span>由 <strong>EckyStudio</strong> 提供</span>
          </div>
        </div>

        <div className="hero-art" aria-label={`${profile.displayName} 的个人介绍卡片`}>
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="hero-art-note note-top"><span className="note-icon"><Glyph name="spark" /></span><span>真实经历<br /><strong>清晰呈现</strong></span></div>
          <div className="profile-card">
            <div className="profile-card-top"><span>OF / 01</span><span className="profile-status"><i /> 开放机会</span></div>
            <div className="avatar-monogram">{profile.displayName.slice(0, 1) || "你"}</div>
            <p className="profile-card-label">个人档案 · 演示内容</p>
            <h2>{profile.displayName}</h2>
            <p className="profile-card-role">{profile.title}</p>
            <div className="profile-card-line" />
            <div className="profile-card-foot"><span>可验证作品集</span><span><Glyph name="arrow" /></span></div>
          </div>
          <div className="hero-art-note note-bottom"><span className="note-number">01</span><span>让每一份能力<br /><strong>都有迹可循</strong></span></div>
          <span className="art-caption">有证据的作品集</span>
        </div>
        <a className="scroll-hint" href="#about"><span /> 向下探索</a>
      </section>

      <section className="signal-strip" aria-label="OfferFolio 特点">
        <div className="signal-strip-inner">
          <span>有重点</span><b>✳</b><span>有证据</span><b>✳</b><span>有来有往</span><b>✳</b><span>数据归你</span><b>✳</b><span>有重点</span>
        </div>
      </section>

      <section className="section-wrap content-section about-section" id="about">
        <div className="section-heading">
          <p className="section-kicker">01 / 简介</p>
          <h2>让对的人，<br /><em>更快看见</em>你的价值。</h2>
        </div>
        <div className="about-copy">
          <p className="about-lead">{profile.introduction}</p>
          <p>简历是一页纸，能力不止于此。把你做过的事、解决的问题与可验证的证据放在一起，让每段经历都能被看懂、被追问，也经得起核实。</p>
          <div className="about-signature"><span className="signature-rule" /><span>{profile.displayName}</span><small>{profile.title}</small></div>
        </div>
      </section>

      <section className="skills-band" id="skills">
        <div className="section-wrap skills-layout">
          <div>
            <p className="section-kicker section-kicker-light">02 / 能力地图</p>
            <h2>我擅长把想法<br />变成 <em>真实体验</em>。</h2>
            <p className="skills-caption">能力不只是一串关键词。它们会在项目、协作与结果里被验证。</p>
          </div>
          <div className="skill-cloud" aria-label="专业技能">
            {profile.skills.map((skill, index) => <span className={`skill-chip chip-${index % 4}`} key={`${skill}-${index}`}>{skill}</span>)}
          </div>
        </div>
      </section>

      <section className="section-wrap content-section projects-section" id="projects">
        <div className="section-title-row">
          <div>
            <p className="section-kicker">03 / 精选项目</p>
            <h2>做过的事，<em>有据可查。</em></h2>
          </div>
          <p className="section-side-note">每个项目都从一个问题开始，<br />再用证据说明它如何被解决。</p>
        </div>
        <div className="project-grid">
          {profile.projects.map((project, index) => (
            <article className={`project-card project-card-${index % 2}`} key={project.id}>
              <div className="project-card-head"><span>项目案例 / {String(index + 1).padStart(2, "0")}</span><span className="project-number">{String(index + 1).padStart(2, "0")}</span></div>
              <div className="project-visual" aria-hidden="true">
                <span className="visual-sun" />
                <span className="visual-line line-one" />
                <span className="visual-line line-two" />
                <span className="visual-square" />
                <span className="visual-caption">项目 / {String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className="project-card-body">
                <div className="project-tags">{project.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                <h3>{project.title}</h3>
                <p>{project.summary}</p>
                <a className="evidence-link" href={project.evidenceUrl || "#contact"} target={project.evidenceUrl.startsWith("http") ? "_blank" : undefined} rel={project.evidenceUrl.startsWith("http") ? "noreferrer" : undefined}>
                  <span><Glyph name="link" /> {project.evidenceLabel || "查看项目证据"}</span><Glyph name="arrow" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="experience-section" id="experience">
        <div className="section-wrap content-section">
          <div className="section-title-row experience-heading">
            <div><p className="section-kicker">04 / 经历轨迹</p><h2>每一步，<em>都有来处。</em></h2></div>
            <p className="section-side-note">不只列出头衔，<br />也说明做过什么、学到什么。</p>
          </div>
          <div className="timeline">
            {profile.milestones.map((milestone) => (
              <article className="timeline-item" key={milestone.id}>
                <span className="timeline-period">{milestone.period}</span>
                <span className="timeline-marker" aria-hidden="true" />
                <div className="timeline-body"><p>{milestone.organization}</p><h3>{milestone.title}</h3><span>{milestone.summary}</span></div>
                <Glyph name="arrow" />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="contact-section" id="contact">
        <div className="section-wrap contact-inner">
          <div><p className="section-kicker section-kicker-light">05 / 开始对话</p><h2>好机会，<br /><em>值得认真聊。</em></h2><p className="contact-copy">如果你看到了契合的地方，欢迎联系我。也可以先从项目证据开始，了解我做事的方式。</p></div>
          <div className="contact-links">
            <a className="contact-primary" href={safeMailto(profile.email)}><span>{profile.email || "配置联系邮箱"}</span><Glyph name="arrow" /></a>
            {profile.githubUrl ? <a href={profile.githubUrl} target="_blank" rel="noreferrer"><span>GitHub / 查看代码</span><Glyph name="arrow" /></a> : null}
            {profile.resumeUrl ? <a href={profile.resumeUrl} target="_blank" rel="noreferrer"><span>下载简历 PDF</span><Glyph name="arrow" /></a> : null}
            <div className="contact-location"><Glyph name="pin" /> {profile.location}</div>
          </div>
        </div>
      </section>

      <footer className="site-footer section-wrap">
        <Link className="brand brand-footer" href="/">
          <span className="brand-mark">O<span>.</span></span>
          <span className="brand-copy"><strong>OfferFolio</strong><small>求职橱窗</small></span>
        </Link>
        <p>用证据建立信任 · 本站数据由站点所有者掌控</p>
        <div><span>© {new Date().getFullYear()} EckyStudio</span><Link href="/admin">管理档案 <Glyph name="arrow" /></Link></div>
      </footer>
    </main>
  );
}
