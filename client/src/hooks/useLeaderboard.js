import { useQuery, useQueryClient } from 'react-query';
import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext.jsx';
import { leaderboardAPI } from '../api/leaderboard.api.js';

const STALE_TIME = 60000; // 1 minute

export const useLeaderboard = () => {
  const queryClient = useQueryClient();
  const { socket, subscribeToLeaderboard } = useSocket();

  const leaderboardQuery = useQuery(
    'leaderboard',
    () => leaderboardAPI.getLeaderboard(50),
    {
      staleTime: STALE_TIME,
      retry: 2,
    }
  );

  const myRankQuery = useQuery(
    'my-rank',
    () => leaderboardAPI.getMyRank(),
    {
      staleTime: STALE_TIME,
      retry: 2,
    }
  );

  // Subscribe to leaderboard updates
  useEffect(() => {
    if (!socket) return;

    subscribeToLeaderboard();

    const handleLeaderboardUpdate = () => {
      queryClient.invalidateQueries('leaderboard');
      queryClient.invalidateQueries('my-rank');
    };

    socket.on('leaderboard_update', handleLeaderboardUpdate);

    return () => {
      socket.off('leaderboard_update', handleLeaderboardUpdate);
    };
  }, [socket, subscribeToLeaderboard, queryClient]);

  return {
    leaderboard: leaderboardQuery.data?.data || [],
    leaderboardLoading: leaderboardQuery.isLoading,
    leaderboardError: leaderboardQuery.error,
    
    myRank: myRankQuery.data?.data,
    myRankLoading: myRankQuery.isLoading,
    myRankError: myRankQuery.error,
    
    refetch: () => {
      queryClient.invalidateQueries('leaderboard');
      queryClient.invalidateQueries('my-rank');
    },
  };
};

export default useLeaderboard;
