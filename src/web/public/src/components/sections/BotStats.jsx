import './BotStats.css';

function BotStats({ bot }) {
  const stats = bot.stats || {
    totalFlips: 0,
    successfulFlips: 0,
    failedFlips: 0,
    totalProfit: 0,
    avgProfit: 0,
    bestFlip: 0
  };

  const successRate = stats.totalFlips > 0 
    ? ((stats.successfulFlips / stats.totalFlips) * 100).toFixed(1)
    : 0;

  const statCards = [
    {
      label: 'Total Flips',
      value: stats.totalFlips.toLocaleString(),
      icon: 'sync-alt',
      color: 'purple',
      suffix: ''
    },
    {
      label: 'Success Rate',
      value: successRate,
      icon: 'chart-line',
      color: 'green',
      suffix: '%'
    },
    {
      label: 'Total Profit',
      value: stats.totalProfit.toLocaleString(),
      icon: 'coins',
      color: 'yellow',
      suffix: ' coins'
    },
    {
      label: 'Avg Profit',
      value: stats.avgProfit.toLocaleString(),
      icon: 'chart-bar',
      color: 'blue',
      suffix: ' coins'
    },
    {
      label: 'Best Flip',
      value: stats.bestFlip.toLocaleString(),
      icon: 'trophy',
      color: 'orange',
      suffix: ' coins'
    },
    {
      label: 'Failed Flips',
      value: stats.failedFlips.toLocaleString(),
      icon: 'times-circle',
      color: 'red',
      suffix: ''
    }
  ];

  return (
    <div className="bot-stats-card">
      <div className="card-header">
        <div className="card-title">
          <i className="fas fa-chart-pie"></i>
          <span>Performance Statistics</span>
        </div>
        <button className="refresh-btn" onClick={() => window.location.reload()}>
          <i className="fas fa-sync-alt"></i>
          <span>Refresh</span>
        </button>
      </div>

      <div className="stats-grid">
        {statCards.map((stat, index) => (
          <div 
            key={index} 
            className={`stat-card ${stat.color}`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="stat-icon">
              <i className={`fas fa-${stat.icon}`}></i>
            </div>
            <div className="stat-content">
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value">
                {stat.value}
                <span className="stat-suffix">{stat.suffix}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="recent-flips">
        <div className="recent-flips-header">
          <h3>
            <i className="fas fa-history"></i>
            Recent Flips
          </h3>
        </div>
        <div className="flips-list">
          {(!bot.recentFlips || bot.recentFlips.length === 0) ? (
            <div className="no-flips">
              <i className="fas fa-inbox"></i>
              <p>No recent flips to display</p>
            </div>
          ) : (
            bot.recentFlips.slice(0, 5).map((flip, index) => (
              <div key={index} className="flip-item" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="flip-icon">
                  <i className={`fas fa-${flip.success ? 'check-circle' : 'times-circle'}`}></i>
                </div>
                <div className="flip-info">
                  <div className="flip-name">{flip.item}</div>
                  <div className="flip-time">{flip.time}</div>
                </div>
                <div className={`flip-profit ${flip.success ? 'positive' : 'negative'}`}>
                  {flip.success ? '+' : '-'}{Math.abs(flip.profit).toLocaleString()} coins
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default BotStats;
