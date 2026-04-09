import { Trophy, Medal, TrendingUp, TrendingDown } from 'lucide-react';
import { useLeaderboard } from '../../hooks/useLeaderboard.js';
import { formatINR, formatPercent, getAvatarColor, getInitials } from '../../utils/formatters.js';

const Leaderboard = () => {
  const { leaderboard, myRank, isLoading } = useLeaderboard();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-20 bg-dark-800 rounded-xl" />
        <div className="space-y-3">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-16 bg-dark-800 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
        <p className="text-dark-500">See how you rank against other traders</p>
      </div>

      {/* My Rank */}
      {myRank?.myRank && (
        <div className="card border-primary-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">#{myRank.myRank.rank}</span>
              </div>
              <div>
                <p className="text-dark-500">Your Rank</p>
                <p className="text-xl font-bold text-white">{myRank.myRank.userName}</p>
                <p className="text-sm text-primary-400">Top {myRank.percentile.toFixed(1)}%</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{formatINR(myRank.myRank.totalPortfolioValue)}</p>
              <p className={`text-sm ${myRank.myRank.pnlPercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                {formatPercent(myRank.myRank.pnlPercent)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Top Traders
          </h2>
          <span className="text-dark-500 text-sm">{leaderboard.length} participants</span>
        </div>

        <div className="space-y-2">
          {leaderboard.map((user, index) => {
            const isTop3 = index < 3;
            const isCurrentUser = myRank?.myRank?.userId === user.userId;

            return (
              <div
                key={user.userId}
                className={`flex items-center justify-between p-4 rounded-xl transition-colors ${
                  isCurrentUser 
                    ? 'bg-primary-500/10 border border-primary-500/30' 
                    : 'bg-dark-900 hover:bg-dark-800'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                    index === 1 ? 'bg-gray-400/20 text-gray-400' :
                    index === 2 ? 'bg-orange-600/20 text-orange-400' :
                    'bg-dark-700 text-dark-500'
                  }`}>
                    {index === 0 && <Medal className="w-5 h-5" />}
                    {index === 1 && <Medal className="w-5 h-5" />}
                    {index === 2 && <Medal className="w-5 h-5" />}
                    {index > 2 && user.rank}
                  </div>

                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full ${getAvatarColor(user.userName)} flex items-center justify-center`}>
                    <span className="text-white text-sm font-bold">{getInitials(user.userName)}</span>
                  </div>

                  {/* Name */}
                  <div>
                    <p className={`font-medium ${isCurrentUser ? 'text-primary-400' : 'text-white'}`}>
                      {user.userName}
                      {isCurrentUser && <span className="ml-2 text-xs text-primary-500">(You)</span>}
                    </p>
                    <p className="text-sm text-dark-500">Rank #{user.rank}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right">
                  <p className="text-lg font-bold text-white">{formatINR(user.totalPortfolioValue)}</p>
                  <p className={`text-sm flex items-center justify-end gap-1 ${
                    user.pnlPercent >= 0 ? 'text-profit' : 'text-loss'
                  }`}>
                    {user.pnlPercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {formatPercent(user.pnlPercent)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
