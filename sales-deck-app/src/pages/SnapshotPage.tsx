import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import type { AuditData } from "../data/sampleData";
import { sampleData } from "../data/sampleData";

export function SnapshotPage() {
  const { auditId } = useParams();
  const [data, setData] = useState<AuditData>(sampleData);

  useEffect(() => {
    if (!auditId) return;
    fetch(`/audits/${auditId}.json`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((auditData: AuditData) => setData(auditData))
      .catch(() => console.warn(`Audit ${auditId} not found, using sample data`));
  }, [auditId]);

  return (
    <div className="min-h-screen bg-white p-8 text-gray-900 print:p-4" data-snapshot-ready="true">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 border-b-2 border-gray-200 pb-6">
          <h1 className="text-3xl font-bold text-gray-900">Maps Autopilot</h1>
          <p className="mt-1 text-sm text-gray-500">Quick Audit Snapshot</p>
        </div>

        {/* Business Info */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">{data.prospect_name}</h2>
          <p className="text-gray-500">
            {data.prospect_city}, {data.prospect_state} &mdash; {data.niche_label}
          </p>
        </div>

        {/* Current Position */}
        <div className="mb-8 rounded-lg bg-gray-50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-700">Current Position</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-red-600">{data.prospect_rank}</p>
              <p className="text-sm text-gray-500">Maps Rank</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{data.prospect_reviews}</p>
              <p className="text-sm text-gray-500">Reviews</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{data.prospect_rating}</p>
              <p className="text-sm text-gray-500">Avg Rating</p>
            </div>
          </div>
        </div>

        {/* Competitors */}
        <div className="mb-8">
          <h3 className="mb-4 text-lg font-semibold text-gray-700">Top Competitors</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2">Rank</th>
                <th className="pb-2">Business</th>
                <th className="pb-2">Reviews</th>
                <th className="pb-2">Rating</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 font-mono">#1</td>
                <td className="py-2">{data.comp1_name}</td>
                <td className="py-2 font-mono">{data.comp1_reviews}</td>
                <td className="py-2">{data.comp1_rating}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-mono">#2</td>
                <td className="py-2">{data.comp2_name}</td>
                <td className="py-2 font-mono">{data.comp2_reviews}</td>
                <td className="py-2">{data.comp2_rating}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-mono">#3</td>
                <td className="py-2">{data.comp3_name}</td>
                <td className="py-2 font-mono">{data.comp3_reviews}</td>
                <td className="py-2">{data.comp3_rating}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-sm text-red-600">
            Review gap: <span className="font-bold">{data.review_gap} reviews</span> behind #1
          </p>
        </div>

        {/* Lost Revenue */}
        <div className="mb-8 rounded-lg border-2 border-red-100 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">Estimated Lost Revenue</p>
          <p className="mt-1 text-4xl font-bold text-red-700">${data.lost_monthly}/mo</p>
          <p className="mt-1 text-lg text-red-500">${data.lost_annual}/year</p>
          <p className="mt-3 text-xs text-gray-500">
            Based on {data.missed_calls} missed calls/mo x ${data.avg_ticket} avg ticket
          </p>
        </div>

        {/* Investment */}
        <div className="rounded-lg border-2 border-green-100 bg-green-50 p-6 text-center">
          <p className="text-sm text-green-700">Maps Autopilot Investment</p>
          <p className="mt-1 text-3xl font-bold text-green-700">${data.monthly_price}/mo</p>
          <p className="text-sm text-green-600">+ ${data.setup_fee} one-time setup</p>
          <p className="mt-2 text-xs text-gray-500">Market tier: {data.market_tier}</p>
        </div>

        {/* Footer */}
        <div className="mt-12 border-t pt-4 text-center text-xs text-gray-400">
          Generated by Maps Autopilot &mdash; mapsautopilot.com
        </div>
      </div>
    </div>
  );
}
