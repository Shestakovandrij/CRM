"use client";

import { useState, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Plus, AtSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { LeadForm, type LeadFormData } from "@/components/leads/LeadForm";
import LeadDrawer from "@/components/leads/LeadDrawer";

interface Lead {
  id: string;
  name: string;
  instagram: string | null;
  status: string;
  source: string | null;
  _count: { tasks: number; deals: number };
}

const COLUMNS = [
  { id: "NEW", label: "New" },
  { id: "CONTACTED", label: "Contacted" },
  { id: "NEGOTIATION", label: "Negotiation" },
  { id: "WON", label: "Won" },
  { id: "LOST", label: "Lost" },
];

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [openLead, setOpenLead] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    const res = await fetch("/api/leads");
    setLeads(await res.json());
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  async function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const leadId = result.draggableId;
    const newStatus = result.destination.droppableId;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;

    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, status: newStatus } : l));
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  async function createLead(data: LeadFormData) {
    await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setShowCreate(false);
    fetchLeads();
  }

  const byStatus = (status: string) => leads.filter((l) => l.status === status);

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text)]">Pipeline</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{leads.length} лідів</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm rounded-lg transition-colors cursor-pointer"
        >
          <Plus size={15} />
          Новий лід
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 flex-1 overflow-x-auto pb-2">
          {COLUMNS.map((col) => {
            const colLeads = byStatus(col.id);
            return (
              <div key={col.id} className="flex flex-col w-64 shrink-0">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{col.label}</span>
                  <span className="text-xs bg-[var(--surface-2)] px-1.5 py-0.5 rounded text-[var(--text-muted)]">
                    {colLeads.length}
                  </span>
                </div>
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 rounded-xl p-2 space-y-2 min-h-[200px] transition-colors ${
                        snapshot.isDraggingOver ? "bg-[var(--accent)]/5 border border-[var(--accent)]/20" : "bg-[var(--surface)] border border-[var(--border)]"
                      }`}
                    >
                      {colLeads.map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              onClick={() => setOpenLead(lead.id)}
                              className={`bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-3 cursor-pointer hover:border-[var(--accent)]/40 transition-all ${
                                snap.isDragging ? "shadow-lg rotate-1 opacity-90" : ""
                              }`}
                            >
                              <p className="text-sm font-medium text-[var(--text)]">{lead.name}</p>
                              {lead.instagram && (
                                <p className="flex items-center gap-1 text-xs text-[var(--text-muted)] mt-1">
                                  <AtSign size={10} />{lead.instagram}
                                </p>
                              )}
                              <div className="flex items-center justify-between mt-2">
                                {lead.source && (
                                  <span className="text-xs text-[var(--text-muted)]">{lead.source}</span>
                                )}
                                <div className="flex items-center gap-1.5 ml-auto">
                                  {lead._count.tasks > 0 && (
                                    <span className="text-xs text-[var(--text-muted)]">✓ {lead._count.tasks}</span>
                                  )}
                                  {lead._count.deals > 0 && (
                                    <span className="text-xs text-[var(--text-muted)]">💼 {lead._count.deals}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Новий лід">
        <LeadForm onSave={createLead} onCancel={() => setShowCreate(false)} />
      </Modal>

      {openLead && (
        <LeadDrawer leadId={openLead} onClose={() => setOpenLead(null)} onUpdate={fetchLeads} />
      )}
    </div>
  );
}
