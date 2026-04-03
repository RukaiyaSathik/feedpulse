'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [filters, setFilters] = useState({ category: '', status: '', sort: '', search: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ total: 0, open: 0, avgPriority: 0, topTag: '' });
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) { router.push('/login'); return; }
    setToken(t);
  }, []);

  useEffect(() => {
    if (token) fetchFeedbacks();
  }, [token, filters, page]);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.status) params.append('status', filters.status);
      if (filters.sort) params.append('sort', filters.sort);
      if (filters.search) params.append('search', filters.search);
      params.append('page', page);
      params.append('limit', 10);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/feedback?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setFeedbacks(data.data.feedbacks);
        setTotalPages(data.data.totalPages);
        calculateStats(data.data.feedbacks, data.data.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (items, total) => {
    const open = items.filter((f) => f.status !== 'Resolved').length;
    const avgPriority = items.length
      ? (items.reduce((sum, f) => sum + (f.ai_priority || 0), 0) / items.length).toFixed(1)
      : 0;
    const allTags = items.flatMap((f) => f.ai_tags || []);
    const tagCount = allTags.reduce((acc, tag) => { acc[tag] = (acc[tag] || 0) + 1; return acc; }, {});
    const topTag = Object.keys(tagCount).sort((a, b) => tagCount[b] - tagCount[a])[0] || 'N/A';
    setStats({ total, open, avgPriority, topTag });
  };

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) fetchFeedbacks();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteFeedback = async (id) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/feedback/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) fetchFeedbacks();
    } catch (err) {
      console.error(err);
    }
  };

  const reanalyze = async (id) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/feedback/${id}/reanalyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) fetchFeedbacks();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/feedback/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setSummary(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setSummaryLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const sentimentColor = (s) => {
    if (s === 'Positive') return 'bg-green-100 text-green-800';
    if (s === 'Negative') return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const statusColor = (s) => {
    if (s === 'Resolved') return 'bg-green-100 text-green-800';
    if (s === 'In Review') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (!token) return null;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-indigo-600 text-white px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">FeedPulse Admin</h1>
        <div className="flex gap-4">
          <button onClick={fetchSummary} className="bg-indigo-500 hover:bg-indigo-400 px-4 py-2 rounded-lg text-sm">
            {summaryLoading ? 'Generating...' : 'AI Summary'}
          </button>
          <button onClick={logout} className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-semibold">
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Feedback', value: stats.total },
            { label: 'Open Items', value: stats.open },
            { label: 'Avg Priority', value: stats.avgPriority },
            { label: 'Top Tag', value: stats.topTag },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl shadow p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">{s.value}</p>
              <p className="text-gray-500 text-sm">{s.label}</p>
            </div>
          ))}
        </div>

        {/* AI Summary */}
        {summary && (
          <div className="bg-white rounded-xl shadow p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">AI Weekly Summary</h2>
            <p className="text-gray-600 mb-4">{summary.overall_summary}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {summary.themes?.map((t, i) => (
                <div key={i} className="bg-indigo-50 rounded-lg p-4">
                  <p className="font-semibold text-indigo-700">{t.theme}</p>
                  <p className="text-gray-600 text-sm mt-1">{t.description}</p>
                  <p className="text-indigo-500 text-xs mt-2">{t.count} items</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search feedback..."
            value={filters.search}
            onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPage(1); }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 flex-1 min-w-[200px]"
          />
          <select value={filters.category} onChange={(e) => { setFilters({ ...filters, category: e.target.value }); setPage(1); }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">All Categories</option>
            <option value="Bug">Bug</option>
            <option value="Feature Request">Feature Request</option>
            <option value="Improvement">Improvement</option>
            <option value="Other">Other</option>
          </select>
          <select value={filters.status} onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">All Statuses</option>
            <option value="New">New</option>
            <option value="In Review">In Review</option>
            <option value="Resolved">Resolved</option>
          </select>
          <select value={filters.sort} onChange={(e) => { setFilters({ ...filters, sort: e.target.value }); setPage(1); }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">Sort by Date</option>
            <option value="priority">Sort by Priority</option>
            <option value="sentiment">Sort by Sentiment</option>
          </select>
        </div>

        {/* Feedback Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden mb-6">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : feedbacks.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No feedback found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">Title</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Sentiment</th>
                    <th className="px-4 py-3 text-left">Priority</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {feedbacks.map((f) => (
                    <tr key={f._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="font-medium text-gray-800 truncate">{f.title}</p>
                        <p className="text-gray-400 text-xs truncate">{f.ai_summary || f.description}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{f.category}</td>
                      <td className="px-4 py-3">
                        {f.ai_sentiment ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${sentimentColor(f.ai_sentiment)}`}>
                            {f.ai_sentiment}
                          </span>
                        ) : <span className="text-gray-400 text-xs">Pending</span>}
                      </td>
                      <td className="px-4 py-3">
                        {f.ai_priority ? (
                          <span className="font-bold text-indigo-600">{f.ai_priority}/10</span>
                        ) : <span className="text-gray-400 text-xs">N/A</span>}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={f.status}
                          onChange={(e) => updateStatus(f._id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer ${statusColor(f.status)}`}
                        >
                          <option value="New">New</option>
                          <option value="In Review">In Review</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(f.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => reanalyze(f._id)}
                            className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100">
                            Re-AI
                          </button>
                          <button onClick={() => deleteFeedback(f._id)}
                            className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 bg-white rounded-lg shadow text-sm disabled:opacity-50">
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-4 py-2 bg-white rounded-lg shadow text-sm disabled:opacity-50">
            Next
          </button>
        </div>
      </div>
    </main>
  );
}