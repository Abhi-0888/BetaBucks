import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext.jsx';

export const useLivePrice = (symbol) => {
  const [price, setPrice] = useState(null);
  const [change, setChange] = useState(null);
  const [changePercent, setChangePercent] = useState(null);
  const [flash, setFlash] = useState(null);
  const { socket, subscribeToStock, unsubscribeFromStock } = useSocket();

  useEffect(() => {
    if (!symbol || !socket) return;

    // Subscribe to stock
    subscribeToStock(symbol);

    // Listen for price updates
    const handlePriceUpdate = (data) => {
      if (data.symbol === symbol) {
        // Flash animation based on price change
        if (price !== null) {
          if (data.price > price) {
            setFlash('green');
          } else if (data.price < price) {
            setFlash('red');
          }
          
          // Clear flash after animation
          setTimeout(() => setFlash(null), 500);
        }

        setPrice(data.price);
        setChange(data.change);
        setChangePercent(data.changePercent);
      }
    };

    socket.on('price_update', handlePriceUpdate);

    return () => {
      socket.off('price_update', handlePriceUpdate);
      unsubscribeFromStock(symbol);
    };
  }, [symbol, socket, subscribeToStock, unsubscribeFromStock, price]);

  return {
    price,
    change,
    changePercent,
    flash,
    trend: changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'neutral',
  };
};

export default useLivePrice;
