import StockTable from '../../components/ui/StockTable.jsx';

const Market = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Stock Market</h1>
        <p className="text-dark-500">Live NSE India prices. Trade with virtual money.</p>
      </div>

      <StockTable />
    </div>
  );
};

export default Market;
