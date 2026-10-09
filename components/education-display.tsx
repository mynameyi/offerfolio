import type { EducationDisplayMode, PortfolioMilestone } from "@/lib/profile";

type SchoolLogo = { src: string; treatment: "light" | "dark" };

function schoolLogo(item: PortfolioMilestone): SchoolLogo | null {
  if (item.logoUrl) {
    return {
      src: item.logoUrl,
      treatment: item.logoUrl === "/education-logos/gdmec-emblem.png" ? "dark" : "light",
    };
  }
  if (item.organization.trim() === "深圳大学") {
    return { src: "/education-logos/shenzhen-university-emblem.png", treatment: "light" };
  }
  if (item.organization.trim() === "广东机电职业技术学院") {
    return { src: "/education-logos/gdmec-emblem.png", treatment: "dark" };
  }
  return null;
}

function educationDetails(summary: string) {
  const lines = summary.replace(/\r/g, "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const courses: string[] = [];
  const notes: string[] = [];

  for (const line of lines) {
    if (/^(英语水平|学习成绩排名|成绩排名|排名)[:：]?/.test(line)) {
      notes.push(line);
      continue;
    }
    const courseLine = line.replace(/^(主要课程|涉及课程|课程)[:：]?\s*/, "");
    courses.push(...courseLine.split(/[、，,;；|]+/).map((course) => course.trim().replace(/[。；;]$/, "")).filter(Boolean));
  }

  return { courses: courses.slice(0, 16), notes: [...notes, ...(courses.length > 16 ? [`另有 ${courses.length - 16} 项课程`] : [])] };
}

function SchoolEmblem({ item, className = "" }: { item: PortfolioMilestone; className?: string }) {
  const logo = schoolLogo(item);
  return (
    <div className={`df-school-emblem${logo ? ` is-${logo.treatment}` : " is-placeholder"}${className ? ` ${className}` : ""}`}>
      {logo ? <img src={logo.src} alt={`${item.organization}校徽`} loading="lazy" /> : <span aria-hidden="true">{item.organization.trim().slice(0, 1) || "学"}</span>}
    </div>
  );
}

function Coursework({ item, compact = false }: { item: PortfolioMilestone; compact?: boolean }) {
  const { courses, notes } = educationDetails(item.summary);
  if (!courses.length && !notes.length) return null;
  return (
    <div className={`df-education-coursework${compact ? " is-compact" : ""}`}>
      <div className="df-education-coursework-heading"><strong>主要课程</strong><span>CURRICULUM</span></div>
      {courses.length ? <ul className="df-education-course-tags">{courses.map((course, index) => <li key={`${index}-${course}`}>{course}</li>)}</ul> : null}
      {notes.length ? <p className="df-education-notes">{notes.join(" · ")}</p> : null}
    </div>
  );
}

function DossierCards({ items }: { items: PortfolioMilestone[] }) {
  return (
    <div className="df-education-dossier-grid">
      {[...items].reverse().map((item, index) => (
        <article className={`df-education-dossier${index % 2 ? " is-secondary" : ""}`} key={item.id}>
          <header className="df-education-dossier-header">
            <SchoolEmblem item={item} />
            <div className="df-education-dossier-identity">
              <span className="df-education-period">{item.period}</span>
              <h3>{item.organization}</h3>
              <p>{item.title}</p>
            </div>
            <span className="df-education-type-label">教育经历</span>
          </header>
          <Coursework item={item} />
        </article>
      ))}
    </div>
  );
}

function EducationTimeline({ items }: { items: PortfolioMilestone[] }) {
  return (
    <div className="df-education-timeline" role="list">
      {items.map((item, index) => (
        <article className="df-education-timeline-item" key={item.id} role="listitem">
          <span className="df-education-timeline-period">{item.period}</span>
          <div className="df-education-timeline-marker" aria-hidden="true"><span>{String(index + 1).padStart(2, "0")}</span></div>
          <div className="df-education-timeline-content">
            <header className="df-education-timeline-heading">
              <SchoolEmblem item={item} />
              <div><p>学习阶段</p><h3>{item.organization}</h3><span>{item.title}</span></div>
            </header>
            <Coursework item={item} compact />
          </div>
        </article>
      ))}
    </div>
  );
}

export function EducationDisplay({ items, mode }: { items: PortfolioMilestone[]; mode: EducationDisplayMode }) {
  return mode === "timeline" ? <EducationTimeline items={items} /> : <DossierCards items={items} />;
}
