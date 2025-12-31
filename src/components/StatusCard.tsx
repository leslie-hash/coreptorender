import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatusCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  status: 'active' | 'warning' | 'error' | 'idle';
  count?: number;
  onClick?: () => void;
}

const statusColors = {
  active: 'bg-[#F3F4F6] text-[#14B8A6] border-[#14B8A6]',
  warning: 'bg-[#FACC15] text-gray-900 border-[#FACC15]',
  error: 'bg-red-100 text-red-700 border-red-300',
  idle: 'bg-gray-100 text-gray-700 border-gray-300'
};

export default function StatusCard({ title, description, icon: Icon, status, count, onClick }: StatusCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-lg shadow-md p-6 border-l-4 transition-all hover:shadow-lg ${onClick ? 'cursor-pointer' : ''} ${statusColors[status]}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Icon className="w-6 h-6" />
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        {count !== undefined && (
          <div className="ml-4">
            <span className="text-3xl font-bold text-gray-900">{count}</span>
          </div>
        )}
      </div>
    </div>
  );
}
