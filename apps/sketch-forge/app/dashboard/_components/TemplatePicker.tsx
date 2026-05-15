"use client";

import { useState, useEffect } from "react";
import { X, LayoutTemplate, Search } from "lucide-react";
import Image from "next/image";

interface Template {
  id: string;
  name: string;
  description: string;
  thumbnail: string | null;
  isSystem: boolean;
}

interface TemplatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateId: string) => void;
}

export function TemplatePicker({
  isOpen,
  onClose,
  onSelect,
}: TemplatePickerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTemplates() {
      if (!isOpen) return;
      setIsLoading(true);
      try {
        const response = await fetch("http://localhost:4001/templates", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setTemplates(data);
        }
      } catch (error) {
        console.error("Failed to fetch templates:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTemplates();
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const systemTemplates = filteredTemplates.filter((t) => t.isSystem);
  const userTemplates = filteredTemplates.filter((t) => !t.isSystem);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full max-w-4xl max-h-[80vh] flex flex-col rounded-3xl border border-border-default bg-surface-base shadow-2xl transition-all duration-300 transform scale-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-default">
          <div>
            <h2 className="text-2xl font-bold text-text-heading tracking-tight">
              Choose a Template
            </h2>
            <p className="text-sm text-text-muted mt-1">
              Start with a blank canvas or use a pre-built structure.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface-hover transition-colors text-text-muted"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim"
              size={18}
            />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full rounded-2xl border border-border-default bg-surface-overlay pl-11 pr-4 py-3 text-sm text-text-heading placeholder:text-text-dim outline-none focus:border-border-accent transition-colors"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-8">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-pulse">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="aspect-[4/3] rounded-2xl bg-surface-hover"
                />
              ))}
            </div>
          ) : (
            <>
              {systemTemplates.length > 0 && (
                <section>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-4">
                    System Templates
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {systemTemplates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onClick={() => onSelect(template.id)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {userTemplates.length > 0 && (
                <section>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-4">
                    Your Templates
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {userTemplates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onClick={() => onSelect(template.id)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {filteredTemplates.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-text-dim">
                  <LayoutTemplate size={48} strokeWidth={1} className="mb-4" />
                  <p className="text-sm">
                    No templates found for &quot;{searchQuery}&quot;
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  onClick,
}: {
  template: Template;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="group text-left">
      <div className="aspect-[4/3] w-full relative rounded-2xl border border-border-default bg-surface-overlay overflow-hidden transition-all group-hover:border-border-accent group-hover:bg-surface-hover mb-3">
        {template.thumbnail ? (
          <Image
            src={template.thumbnail}
            alt={template.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <LayoutTemplate
              size={32}
              className="text-text-dim group-hover:text-accent-subtle transition-colors"
            />
          </div>
        )}
        <div className="absolute inset-0 bg-accent opacity-0 group-hover:opacity-10 transition-opacity" />
      </div>
      <h4 className="font-bold text-sm text-text-body group-hover:text-text-heading transition-colors truncate">
        {template.name}
      </h4>
      <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed mt-1">
        {template.description}
      </p>
    </button>
  );
}
