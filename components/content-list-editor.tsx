"use client";

import { Glyph } from "@/components/glyph";
import type { PortfolioContentItem } from "@/lib/profile";

export type ContentFieldKey = Exclude<keyof PortfolioContentItem, "id">;

export type ContentField = {
  key: ContentFieldKey;
  label: string;
  kind?: "text" | "url" | "number" | "textarea" | "tags";
  placeholder?: string;
  fullWidth?: boolean;
};

type Props = {
  number: string;
  title: string;
  hint: string;
  items: PortfolioContentItem[];
  fields: ContentField[];
  onChange: (items: PortfolioContentItem[]) => void;
  itemLabel?: string;
  addLabel?: string;
  maxItems?: number;
};

function blankItem(id: string): PortfolioContentItem {
  return {
    id,
    title: "",
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
  };
}

export function ContentListEditor({
  number,
  title,
  hint,
  items,
  fields,
  onChange,
  itemLabel = "条目",
  addLabel = "添加条目",
  maxItems = 30,
}: Props) {
  function update(index: number, key: ContentFieldKey, value: string | number | string[]) {
    onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } as PortfolioContentItem : item));
  }

  function addItem() {
    onChange([...items, blankItem(crypto.randomUUID())]);
  }

  function removeItem(index: number) {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <section className="editor-panel">
      <div className="editor-panel-title"><span>{number}</span><div><h2>{title}</h2><p>{hint}</p></div></div>
      <div className="editor-items">
        {items.map((item, index) => (
          <article className="editor-item" key={item.id}>
            <div className="editor-item-top"><strong>{itemLabel} {String(index + 1).padStart(2, "0")}</strong><button className="icon-button danger-button" type="button" aria-label={`删除${itemLabel} ${index + 1}`} onClick={() => removeItem(index)}><Glyph name="trash" /></button></div>
            <div className="editor-fields editor-fields-two">
              {fields.map((field) => {
                const value = item[field.key];
                const fieldValue = Array.isArray(value) ? value.join("、") : String(value ?? "");
                const common = {
                  id: `${item.id}-${field.key}`,
                  className: "field-input",
                  value: fieldValue,
                  placeholder: field.placeholder,
                  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                    if (field.kind === "tags") update(index, field.key, event.target.value.split(/[、,，]/).map((tag) => tag.trim()).filter(Boolean));
                    else if (field.kind === "number") update(index, field.key, Number(event.target.value) || 0);
                    else update(index, field.key, event.target.value);
                  },
                };
                return (
                  <label className={`field-label ${field.fullWidth ? "field-span-two" : ""}`} htmlFor={common.id} key={field.key}>
                    {field.label}
                    {field.kind === "textarea" ? <textarea {...common} className="field-input field-textarea" rows={3} /> : <input {...common} type={field.kind === "url" ? "url" : field.kind === "number" ? "number" : "text"} min={field.kind === "number" ? 0 : undefined} max={field.key === "level" ? 100 : undefined} />}
                  </label>
                );
              })}
            </div>
          </article>
        ))}
      </div>
      <button className="button button-quiet add-item-button" type="button" onClick={addItem} disabled={items.length >= maxItems}><Glyph name="plus" /> {items.length >= maxItems ? `最多 ${maxItems} 项` : addLabel}</button>
    </section>
  );
}
