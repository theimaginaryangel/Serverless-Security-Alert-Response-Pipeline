"use client";

import { useEffect, useState } from "react";
import { Shield, CheckCircle, RefreshCw, Layers } from "lucide-react";
import { FormattedSecurityEvent } from "./api/events/route";

function getSeverityBadge(severity: FormattedSecurityEvent["severity"]) {
  switch (severity) {
    case "CRITICAL":
      return "bg-red-50 text-red-700 ring-1 ring-red-600/10";
    case "HIGH":
      return "bg-orange-50 text-orange-700 ring-1 ring-orange-600/10";
    case "MEDIUM":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/10";
    case "LOW":
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-600/10";
  }
}

function getResourceTypeBadge(type: FormattedSecurityEvent["resourceType"]) {
  return "bg-slate-50 text-slate-600 ring-1 ring-slate-200";
}

export default function Dashboard() {
  const [events, setEvents] = useState<FormattedSecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<string>("Initializing...");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [filter, setFilter] = useState<string>("ALL");

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/events");
      const data = await res.json();
      setEvents(data.events || []);
      setDataSource(data.source);
      setStatusMessage(data.message || "");
    } catch {
      setStatusMessage("Unable to connect to internal API route.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const filteredEvents = events.filter((evt) => {
    if (filter === "ALL") return true;
    return evt.severity === filter;
  });

  const criticalCount = events.filter((e) => e.severity === "CRITICAL").length;
  const isolatedCount = events.filter((e) => e.resolution === "ISOLATED").length;

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-1.5 rounded-md">
              <Shield className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-semibold text-sm tracking-tight leading-none">Security Response Pipeline</h1>
              <p className="text-xs text-slate-500 mt-0.5">Automated Alert Triage & Remediation</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 border border-slate-200 px-2.5 py-1 rounded-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {dataSource === "aws-live" ? "AWS DynamoDB Live" : "Active / Ready"}
            </div>

            <button
              onClick={loadEvents}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Sync
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Banner with connection status */}
        {statusMessage && (
          <div className="mb-6 p-3 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span>{statusMessage}</span>
            <span className="font-mono text-[11px] text-slate-400">Region: eu-north-1</span>
          </div>
        )}

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="border border-slate-200 rounded-lg p-4 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Monitored</h3>
            <div className="text-2xl font-bold tracking-tight">{events.length}</div>
            <p className="text-[11px] text-slate-400 mt-1">Processed by Step Functions</p>
          </div>

          <div className="border border-slate-200 rounded-lg p-4 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Critical Findings</h3>
            <div className="text-2xl font-bold tracking-tight text-red-600">{criticalCount}</div>
            <p className="text-[11px] text-slate-400 mt-1">Requiring containment</p>
          </div>

          <div className="border border-slate-200 rounded-lg p-4 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Auto-Quarantined</h3>
            <div className="text-2xl font-bold tracking-tight text-emerald-700">{isolatedCount}</div>
            <p className="text-[11px] text-slate-400 mt-1">Deny-All policy applied</p>
          </div>

          <div className="border border-slate-200 rounded-lg p-4 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Compliance State</h3>
            <div className="text-2xl font-bold tracking-tight text-slate-900">Enforced</div>
            <p className="text-[11px] text-slate-400 mt-1">Guardrails Active</p>
          </div>
        </div>

        {/* Table Filter Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-slate-400 mr-1" />
            {["ALL", "CRITICAL", "HIGH", "LOW"].map((level) => (
              <button
                key={level}
                onClick={() => setFilter(level)}
                className={`text-xs px-2.5 py-1 rounded-md font-medium border transition-colors ${
                  filter === level
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-400">Showing {filteredEvents.length} findings</span>
        </div>

        {/* Structured Readable Data Table */}
        <div className="border border-slate-200 rounded-lg shadow-sm overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 font-semibold text-slate-600">Event & Type</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Severity</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Resource Target</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Remediation / Action</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 max-w-xs">
                      <div className="font-semibold text-slate-900">{evt.findingType}</div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{evt.description}</p>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{evt.id} &bull; {evt.timestamp}</span>
                    </td>
                    
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${getSeverityBadge(evt.severity)}`}>
                        {evt.severity}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 max-w-xs">
                      <div className="mb-1">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${getResourceTypeBadge(evt.resourceType)}`}>
                          {evt.resourceType}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-slate-600 truncate" title={evt.resourceId}>
                        {evt.resourceId}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 max-w-sm">
                      <p className="text-slate-700 text-[11px] leading-relaxed">{evt.actionDetails}</p>
                    </td>

                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${evt.resolution === 'ISOLATED' ? 'text-emerald-700' : 'text-slate-600'}`}>
                        {evt.resolution === "ISOLATED" && <CheckCircle className="h-3.5 w-3.5" />}
                        {evt.resolution}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
