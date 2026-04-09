import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">NidhiKosh</h1>
          <p className="text-dark-500">Trade Virtual. Learn Real.</p>
        </div>
        
        {/* Content */}
        <Outlet />
        
        {/* Footer */}
        <p className="text-center text-dark-600 text-sm mt-8">
          Powered by Live NSE India Data
        </p>
      </div>
    </div>
  );
};

export default AuthLayout;
