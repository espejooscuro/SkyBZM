import React from 'react';
import { Card } from './Card';
import './StatCard.css';

export function StatCard({ title, value, icon, trend, trendValue, color = 'primary', loading = false }) {
  const getTrendColor = () => {
    if (!trend) return '';
    return trend === 'up' ? 'trend-up' : 'trend-down';
  };

  return (
    <Card className="stat-card" hover>
      <div className="stat-card-content">
        <div className="stat-header">
          <span className="stat-title">{title}</span>
          {icon && (
            <div className={`stat-icon stat-icon-${color}`}>
              {icon}
            </div>
          )}
        </div>
        
        <div className="stat-value-container">
          {loading ? (
            <div className="stat-skeleton shimmer"></div>
          ) : (
            <>
              <span className="stat-value">{value}</span>
              {trendValue && (
                <span className={`stat-trend ${getTrendColor()}`}>
                  {trend === 'up' ? '↑' : '↓'} {trendValue}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
