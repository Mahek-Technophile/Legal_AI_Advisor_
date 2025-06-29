import React, { useState } from 'react';
import { Clock, FileText, Search, Shield, MessageSquare, Download, Filter } from 'lucide-react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { TOKEN_COSTS } from '../../services/subscriptionService';

export function TokenUsageHistory() {
  const { usageHistory, usageSummary, loadUsageHistory } = useSubscription();
  const [filter, setFilter] = useState<string | null>(null);
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFeatureIcon = (feature: string) => {
    switch (feature) {
      case 'DOCUMENT_ANALYSIS':
        return <FileText className="h-4 w-4 text-sapphire-blue" />;
      case 'DEEP_SEARCH':
        return <Search className="h-4 w-4 text-regal-purple" />;
      case 'REDACTION_REVIEW':
        return <Shield className="h-4 w-4 text-deep-bronze" />;
      case 'CLAUSE_EXPLANATION':
        return <MessageSquare className="h-4 w-4 text-emerald" />;
      default:
        return <Clock className="h-4 w-4 text-cool-gray" />;
    }
  };

  const getFeatureName = (feature: string) => {
    switch (feature) {
      case 'DOCUMENT_ANALYSIS':
        return 'Document Analysis';
      case 'DEEP_SEARCH':
        return 'DeepSearch';
      case 'REDACTION_REVIEW':
        return 'Redaction Review';
      case 'CLAUSE_EXPLANATION':
        return 'Clause Explanation';
      default:
        return feature;
    }
  };

  const filteredHistory = filter 
    ? usageHistory.filter(record => record.feature === filter)
    : usageHistory;

  const totalTokensUsed = Object.values(usageSummary).reduce((sum, value) => sum + value, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-off-white">Token Usage History</h2>
        <button
          onClick={() => loadUsageHistory()}
          className="flex items-center space-x-2 text-cool-gray hover:text-off-white transition-colors"
        >
          <Download className="h-4 w-4" />
          <span className="text-sm">Refresh</span>
        </button>
      </div>

      {/* Usage Summary */}
      <div className="bg-charcoal-gray/50 rounded-xl border border-sapphire-blue/20 p-4">
        <h3 className="text-sm font-medium text-off-white mb-3">Usage Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-midnight-navy/30 rounded-lg p-3 border border-sapphire-blue/10">
            <div className="flex items-center space-x-2 mb-1">
              <Clock className="h-4 w-4 text-cool-gray" />
              <span className="text-xs text-cool-gray">Total Usage</span>
            </div>
            <p className="text-lg font-medium text-off-white">{totalTokensUsed} tokens</p>
          </div>
          
          {Object.entries(usageSummary).map(([feature, tokens]) => {
            if (tokens === 0) return null;
            return (
              <div key={feature} className="bg-midnight-navy/30 rounded-lg p-3 border border-sapphire-blue/10">
                <div className="flex items-center space-x-2 mb-1">
                  {getFeatureIcon(feature)}
                  <span className="text-xs text-cool-gray">{getFeatureName(feature)}</span>
                </div>
                <p className="text-lg font-medium text-off-white">{tokens} tokens</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 text-cool-gray">
          <Filter className="h-4 w-4" />
          <span className="text-sm">Filter:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter(null)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              filter === null 
                ? 'bg-sapphire-blue text-off-white' 
                : 'bg-charcoal-gray/50 text-cool-gray hover:text-off-white'
            }`}
          >
            All
          </button>
          {Object.keys(TOKEN_COSTS).map(feature => (
            <button
              key={feature}
              onClick={() => setFilter(feature)}
              className={`px-3 py-1 text-xs rounded-full transition-colors flex items-center space-x-1 ${
                filter === feature 
                  ? 'bg-sapphire-blue text-off-white' 
                  : 'bg-charcoal-gray/50 text-cool-gray hover:text-off-white'
              }`}
            >
              {getFeatureIcon(feature)}
              <span>{getFeatureName(feature)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Usage History Table */}
      <div className="bg-charcoal-gray/50 rounded-xl border border-sapphire-blue/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-midnight-navy/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-cool-gray uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cool-gray uppercase tracking-wider">Feature</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cool-gray uppercase tracking-wider">Document</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-cool-gray uppercase tracking-wider">Tokens Used</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sapphire-blue/10">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((record) => (
                  <tr key={record.id} className="hover:bg-midnight-navy/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-cool-gray">
                      {formatDate(record.created_at || '')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        {getFeatureIcon(record.feature)}
                        <span className="text-sm text-off-white">{getFeatureName(record.feature)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-cool-gray">
                      {record.document_name || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs rounded-full bg-sapphire-blue/10 text-sapphire-blue">
                        {record.tokens_used} tokens
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-cool-gray">
                    {filter ? (
                      <>No usage history found for {getFeatureName(filter)}.</>
                    ) : (
                      <>No usage history found. Start using features to see your token usage.</>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}