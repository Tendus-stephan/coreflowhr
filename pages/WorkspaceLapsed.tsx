import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const WorkspaceLapsed: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-xl border border-gray-100 p-10 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-3">Workspace subscription ended</h1>
        <p className="text-gray-600 leading-relaxed mb-8">
          Your workspace's subscription has expired. You won't be able to access the app until your admin renews it.
          <br /><br />
          Please contact your workspace admin to restore access.
        </p>
        <div className="flex flex-col gap-3 items-center">
          <button
            type="button"
            onClick={() => signOut().then(() => navigate('/login'))}
            className="inline-flex justify-center px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 w-full max-w-xs"
          >
            Log out
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-sm text-gray-500 hover:text-gray-700 underline hover:no-underline"
          >
            Go to homepage
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceLapsed;
