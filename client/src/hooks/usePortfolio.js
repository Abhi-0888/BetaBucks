import { useQuery, useQueryClient } from 'react-query';
import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext.jsx';
import { portfolioAPI } from '../api/portfolio.api.js';

const STALE_TIME = 30000; // 30 seconds

export const usePortfolio = () => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const holdingsQuery = useQuery(
    'portfolio-holdings',
    () => portfolioAPI.getHoldings(),
    {
      staleTime: STALE_TIME,
      retry: 2,
    }
  );

  const summaryQuery = useQuery(
    'portfolio-summary',
    () => portfolioAPI.getSummary(),
    {
      staleTime: STALE_TIME,
      retry: 2,
    }
  );

  const allocationQuery = useQuery(
    'portfolio-allocation',
    () => portfolioAPI.getAllocation(),
    {
      staleTime: STALE_TIME,
      retry: 2,
    }
  );

  // Listen for portfolio updates via socket
  useEffect(() => {
    if (!socket) return;

    const handlePortfolioUpdate = () => {
      // Invalidate queries to refetch
      queryClient.invalidateQueries('portfolio-holdings');
      queryClient.invalidateQueries('portfolio-summary');
      queryClient.invalidateQueries('portfolio-allocation');
    };

    socket.on('portfolio_update', handlePortfolioUpdate);

    return () => {
      socket.off('portfolio_update', handlePortfolioUpdate);
    };
  }, [socket, queryClient]);

  return {
    holdings: holdingsQuery.data?.data,
    holdingsLoading: holdingsQuery.isLoading,
    holdingsError: holdingsQuery.error,
    
    summary: summaryQuery.data?.data,
    summaryLoading: summaryQuery.isLoading,
    summaryError: summaryQuery.error,
    
    allocation: allocationQuery.data?.data,
    allocationLoading: allocationQuery.isLoading,
    allocationError: allocationQuery.error,
    
    refetch: () => {
      queryClient.invalidateQueries('portfolio-holdings');
      queryClient.invalidateQueries('portfolio-summary');
      queryClient.invalidateQueries('portfolio-allocation');
    },
  };
};

export default usePortfolio;
