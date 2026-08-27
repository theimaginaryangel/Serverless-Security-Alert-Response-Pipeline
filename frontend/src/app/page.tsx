import { Shield, AlertTriangle, ShieldAlert, CheckCircle, Clock } from "lucide-react";

// Mock Data (We will replace this with DynamoDB later!)
const MOCK_ALERTS = [
  { id: "ALT-0991", time: "2 mins ago", severity: "CRITICAL", resource: "i-0987654321", status: "QUARANTINED" },
  { id: "ALT-0990", time: "15 mins ago", severity: "HIGH", resource: "s3-customer-data-bucket", status: "ESCALATED" },
  { id: "ALT-0989", time: "1 hour ago", severity: "LOW", resource: "arn:aws:iam::role/DevRole", status: "LOGGED" },
  { id: "ALT-0988", time: "3 hours ago", severity: "CRITICAL", resource: "i-1122334455", status: "QUARANTINED" },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <h1 className="font-semibold text-slate-900 text-lg tracking-tight">Security Response Pipeline</h1>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            System Active
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-500">Total Alerts (24h)</h3>
              <Shield className="h-5 w-5 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-slate-900">1,248</div>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-500">Critical Threats Isolated</h3>
              <ShieldAlert className="h-5 w-5 text-red-500" />
            </div>
            <div className="text-3xl font-bold text-slate-900">12</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-500">Manual Escalations</h3>
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div className="text-3xl font-bold text-slate-900">45</div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 bg-white">
            <h2 className="text-lg font-semibold text-slate-900">Recent Security Events</h2>
            <p className="text-sm text-slate-500 mt-1">Real-time audit log from AWS DynamoDB</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Alert ID</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Time</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Severity</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Affected Resource</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">System Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {MOCK_ALERTS.map((alert) => (
                  <tr key={alert.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{alert.id}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 flex items-center gap-1.5">
                      <Clock className="h-4 w-4" /> {alert.time}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={\`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        \${alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' : 
                          alert.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' : 
                          'bg-blue-100 text-blue-800'}\`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-mono text-xs">{alert.resource}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={\`inline-flex items-center gap-1.5
                        \${alert.status === 'QUARANTINED' ? 'text-green-600 font-medium' : 'text-slate-600'}\`}>
                        {alert.status === 'QUARANTINED' && <CheckCircle className="h-4 w-4" />}
                        {alert.status}
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
