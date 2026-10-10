"use client";

import { useEffect, useState } from "react";
import type { PortfolioContentItem, PortfolioMilestone } from "@/lib/profile";
import { Glyph } from "@/components/glyph";
import { PortfolioImage } from "@/components/portfolio-image";

function externalLinkProps(url: string) {
  return url.startsWith("http") ? { target: "_blank" as const, rel: "noreferrer" } : {};
}

function resolveOrganization(project: PortfolioContentItem, experiences: PortfolioMilestone[]) {
  const experience = experiences.find((item) => item.id === project.careerExperienceId)
    ?? (project.organization ? experiences.find((item) => item.organization.trim() === project.organization.trim()) : undefined);
  return experience?.organization || project.organization;
}

export function ProjectGallery({
  items,
  experiences,
  emptyText,
}: {
  items: PortfolioContentItem[];
  experiences: PortfolioMilestone[];
  emptyText: string;
}) {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const activeProject = activeProjectId ? items.find((item) => item.id === activeProjectId) ?? null : null;

  useEffect(() => {
    if (!activeProject) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveProjectId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeProject]);

  if (!items.length) return <div className="df-empty-state">{emptyText}</div>;

  return (
    <>
      <div className="df-project-grid">
        {items.map((project) => {
          const organization = resolveOrganization(project, experiences);
          const meta = [project.period, organization].filter(Boolean).join(" · ");
          const tags = project.tags.filter(Boolean).slice(0, 5);
          return (
            <article className="df-project-card" key={project.id}>
              {meta || project.role ? (
                <div className="df-project-overline">
                  {meta ? <p className="df-project-meta">{meta}</p> : <span />}
                  {project.role ? <span className="df-project-role"><span>项目角色</span>{project.role}</span> : null}
                </div>
              ) : null}
              <button
                className="df-project-heading"
                type="button"
                onClick={() => setActiveProjectId(project.id)}
                aria-label={`查看项目详情：${project.title || "代表项目"}`}
              >
                <span className="df-project-heading-copy">
                  <strong>{project.title || "未命名项目"}</strong>
                </span>
                {project.imageUrl ? (
                  <PortfolioImage className="df-project-thumb" src={project.imageUrl} alt={`${project.title}缩略图`} width={300} height={210} sizes="(max-width: 720px) 28vw, 150px" />
                ) : null}
              </button>
              {project.summary ? <p className="df-project-summary">{project.summary}</p> : <p className="df-project-summary is-empty">点击查看项目详情。</p>}
              <div className="df-project-footer">
                {tags.length ? <div className="df-tag-row" aria-label="项目标签">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div> : <span />}
                <button className="df-project-open" type="button" onClick={() => setActiveProjectId(project.id)}>查看完整介绍 <Glyph name="arrow" /></button>
              </div>
            </article>
          );
        })}
      </div>

      {activeProject ? (
        <div className="df-project-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveProjectId(null); }}>
          <section className="df-project-modal" role="dialog" aria-modal="true" aria-labelledby="df-project-modal-title">
            <button className="df-project-modal-close" type="button" onClick={() => setActiveProjectId(null)} aria-label="关闭项目详情">×</button>
            <header className="df-project-modal-header">
              <p>{[activeProject.period, resolveOrganization(activeProject, experiences)].filter(Boolean).join(" · ") || "代表项目"}</p>
              <h3 id="df-project-modal-title">{activeProject.title || "未命名项目"}</h3>
              {activeProject.role ? <div className="df-project-role"><span>项目角色</span>{activeProject.role}</div> : null}
            </header>
            <div className={`df-project-modal-content${activeProject.imageUrl ? " has-image" : ""}`}>
              {activeProject.imageUrl ? (
                <div className="df-project-modal-image">
                  <PortfolioImage src={activeProject.imageUrl} alt={`${activeProject.title}项目图片`} width={1200} height={900} sizes="(max-width: 900px) 90vw, 38vw" />
                </div>
              ) : null}
              <div className="df-project-modal-details">
                {activeProject.summary ? <div className="df-project-detail-description">{activeProject.summary}</div> : <p className="df-project-detail-empty">暂无项目介绍。</p>}
                {activeProject.tags.filter(Boolean).length ? <div className="df-tag-row" aria-label="项目标签">{activeProject.tags.filter(Boolean).map((tag) => <span key={tag}>{tag}</span>)}</div> : null}
                {activeProject.url || activeProject.secondaryUrl ? (
                  <div className="df-project-links">
                    {activeProject.url ? <a href={activeProject.url} {...externalLinkProps(activeProject.url)}>{activeProject.urlLabel || "查看项目"} <Glyph name="arrow" /></a> : null}
                    {activeProject.secondaryUrl ? <a href={activeProject.secondaryUrl} {...externalLinkProps(activeProject.secondaryUrl)}>{activeProject.secondaryLabel || "了解更多"} <Glyph name="arrow" /></a> : null}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
