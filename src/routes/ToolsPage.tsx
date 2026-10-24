import { useState } from "react";
import { Link } from "react-router-dom";
import { CaretRight } from "@phosphor-icons/react";
import { TOOLS, TOOL_GROUPS, matchesTool } from "../lib/tools";
import { useSeo } from "../hooks/useSeo";
export default function ToolsPage() {
  useSeo("Tools — LocalPDF", "Find the right tool for your document.");
  const [query, setQuery] = useState("");
  const visible = TOOLS.filter((t) => matchesTool(t, query));
  return (
    <section>
      <h1 className="text-2xl font-bold sm:text-3xl">Tools</h1>
      <p className="mt-2 text-muted">Choose what you want to do.</p>
      <input
        className="field mt-5"
        aria-label="Search tools"
        placeholder="Search, e.g. combine pages"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="tool-category-grid mt-6">
        {TOOL_GROUPS.map((group) => {
          const tools = group.paths
            .map((path) => visible.find((t) => t.to === path))
            .filter((t): t is (typeof TOOLS)[number] => !!t);
          return tools.length ? (
            <div key={group.name} className="tool-category">
              <h2 className="tool-category-heading">{group.name}</h2>
              {tools.map(({ to, label, description, icon: Icon }) => (
                <Link key={to} to={to} className="tool-row">
                  <span className="tool-row-icon">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span className="tool-row-text">
                    <strong>{label}</strong>
                    <span>{description}</span>
                  </span>
                  <CaretRight
                    size={16}
                    className="tool-row-arrow"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          ) : null;
        })}
      </div>
      {!visible.length && (
        <p className="mt-5">No matching tools. Try another word.</p>
      )}
    </section>
  );
}
