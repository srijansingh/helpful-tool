import { useState } from "react";
import { Link } from "react-router-dom";
import { TOOLS, TOOL_GROUPS, matchesTool } from "../lib/tools";
import { useSeo } from "../hooks/useSeo";
export default function ToolsPage() {
  useSeo("Tools — LocalPDF", "Find the right tool for your document.");
  const [query, setQuery] = useState("");
  const visible = TOOLS.filter((t) => matchesTool(t, query));
  return (
    <section>
      <h1 className="text-3xl font-bold">Tools</h1>
      <p className="mt-2 text-muted">Choose what you want to do.</p>
      <input
        className="field mt-5"
        aria-label="Search tools"
        placeholder="Search, e.g. combine pages"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {TOOL_GROUPS.map((group) => {
        const tools = group.paths
          .map((path) => visible.find((t) => t.to === path))
          .filter((t): t is (typeof TOOLS)[number] => !!t);
        return tools.length ? (
          <div key={group.name}>
            <h2 className="mt-6 mb-3 text-lg font-bold">{group.name}</h2>
            <div className="tool-grid">
              {tools.map(({ to, label, description, icon: Icon }) => (
                <Link key={to} to={to} className="tool-tile">
                  <Icon className="text-accent" />
                  <strong>{label}</strong>
                  <p className="text-sm text-muted">{description}</p>
                </Link>
              ))}
            </div>
          </div>
        ) : null;
      })}
      {!visible.length && (
        <p className="mt-5">No matching tools. Try another word.</p>
      )}
    </section>
  );
}
