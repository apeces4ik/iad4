/**
 * Design System - UI Components Library
 * Согласно строкам 400-415 файла "цель"
 * 
 * Comprehensive component library for Aetherium Proxy frontend
 */

import React from 'react';

// ============= BUTTONS =============

export const Button = ({ 
  children, 
  variant = 'primary',
  size = 'md', 
  disabled = false,
  loading = false,
  icon = null,
  onClick,
  className = '',
  ...props 
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-cyan-600 hover:bg-cyan-700 text-white focus:ring-cyan-500',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-white focus:ring-gray-500',
    outline: 'border-2 border-cyan-600 text-cyan-600 hover:bg-cyan-600 hover:text-white focus:ring-cyan-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
    ghost: 'text-cyan-600 hover:bg-cyan-600/10 focus:ring-cyan-500'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };
  
  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      )}
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};


// ============= CARDS =============

export const Card = ({ children, className = '', variant = 'default', ...props }) => {
  const variants = {
    default: 'bg-gray-800 border-gray-700',
    stat: 'bg-gradient-to-br from-gray-800 to-gray-900 border-cyan-600/30',
    info: 'bg-blue-900/30 border-blue-600/50',
    action: 'bg-gray-800 border-gray-700 hover:border-cyan-600 transition-colors cursor-pointer'
  };
  
  return (
    <div 
      className={`rounded-xl border p-6 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const StatCard = ({ title, value, change, icon, trend = 'up' }) => {
  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-gray-400'
  };
  
  return (
    <Card variant="stat">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {change && (
            <p className={`text-sm mt-2 ${trendColors[trend]}`}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="text-cyan-400 text-3xl">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};


// ============= MODALS =============

export const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  showCloseButton = true 
}) => {
  if (!isOpen) return null;
  
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className={`relative bg-gray-900 rounded-xl border border-cyan-600/30 shadow-2xl ${sizes[size]} w-full`}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h3 className="text-xl font-bold text-white">{title}</h3>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Body */}
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export const TransactionModal = ({ isOpen, onClose, transaction }) => {
  if (!transaction) return null;
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transaction Details">
      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-400">Transaction Hash</label>
          <p className="text-white font-mono text-sm break-all">{transaction.hash}</p>
        </div>
        <div>
          <label className="text-sm text-gray-400">Status</label>
          <Badge status={transaction.status}>{transaction.status}</Badge>
        </div>
        <div>
          <label className="text-sm text-gray-400">Amount</label>
          <p className="text-white text-lg">{transaction.amount} AETH</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onClose}>Close</Button>
          <Button variant="outline" onClick={() => window.open(`https://etherscan.io/tx/${transaction.hash}`, '_blank')}>
            View on Explorer
          </Button>
        </div>
      </div>
    </Modal>
  );
};


// ============= INPUTS =============

export const Input = ({ 
  label, 
  error, 
  icon,
  type = 'text',
  className = '',
  ...props 
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={`
            w-full rounded-lg border bg-gray-800 px-4 py-2.5 text-white
            placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-500' : 'border-gray-700'}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
};

export const Select = ({ 
  label, 
  options = [], 
  error, 
  className = '',
  ...props 
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
        </label>
      )}
      <select
        className={`
          w-full rounded-lg border bg-gray-800 px-4 py-2.5 text-white
          focus:outline-none focus:ring-2 focus:ring-cyan-500
          ${error ? 'border-red-500' : 'border-gray-700'}
          ${className}
        `}
        {...props}
      >
        {options.map((option, index) => (
          <option key={index} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
};


// ============= TABLES =============

export const Table = ({ columns, data, sortable = true, onSort }) => {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-700">
      <table className="w-full">
        <thead className="bg-gray-800 border-b border-gray-700">
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-cyan-400"
                onClick={() => sortable && onSort && onSort(column.key)}
              >
                <div className="flex items-center gap-2">
                  {column.label}
                  {sortable && <span className="text-gray-600">↕</span>}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-gray-900 divide-y divide-gray-700">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-800 transition-colors">
              {columns.map((column, colIndex) => (
                <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};


// ============= BADGES =============

export const Badge = ({ children, status = 'default', size = 'md' }) => {
  const statuses = {
    default: 'bg-gray-700 text-gray-300',
    success: 'bg-green-600/20 text-green-400 border border-green-600/50',
    warning: 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/50',
    error: 'bg-red-600/20 text-red-400 border border-red-600/50',
    info: 'bg-blue-600/20 text-blue-400 border border-blue-600/50',
    active: 'bg-cyan-600/20 text-cyan-400 border border-cyan-600/50'
  };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };
  
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${statuses[status]} ${sizes[size]}`}>
      {children}
    </span>
  );
};

export const TierBadge = ({ tier }) => {
  const tiers = {
    0: { name: 'Bronze', color: 'bg-orange-600/20 text-orange-400 border-orange-600/50', icon: '🥉' },
    1: { name: 'Silver', color: 'bg-gray-400/20 text-gray-300 border-gray-400/50', icon: '🥈' },
    2: { name: 'Gold', color: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/50', icon: '🥇' },
    3: { name: 'Diamond', color: 'bg-blue-400/20 text-blue-300 border-blue-400/50', icon: '💎' },
    4: { name: 'Legendary', color: 'bg-purple-600/20 text-purple-400 border-purple-600/50', icon: '👑' }
  };
  
  const tierData = tiers[tier] || tiers[0];
  
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm font-medium ${tierData.color}`}>
      <span>{tierData.icon}</span>
      {tierData.name}
    </span>
  );
};

export const LevelBadge = ({ level }) => {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-cyan-600/20 text-cyan-400 border border-cyan-600/50 px-2.5 py-1 text-sm font-medium">
      <span>⭐</span>
      Level {level}
    </span>
  );
};


// ============= TOAST NOTIFICATIONS =============

export const Toast = ({ type = 'info', message, onClose }) => {
  const types = {
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-blue-600 text-white',
    warning: 'bg-yellow-600 text-white'
  };
  
  const icons = {
    success: '✓',
    error: '✗',
    info: 'ℹ',
    warning: '⚠'
  };
  
  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg ${types[type]}`}>
      <span className="text-xl">{icons[type]}</span>
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="ml-2 hover:opacity-75">
        ✕
      </button>
    </div>
  );
};


// ============= PROGRESS BARS =============

export const ProgressBar = ({ value, max = 100, label, showPercentage = true }) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-400">{label}</span>
          {showPercentage && (
            <span className="text-sm text-cyan-400">{percentage.toFixed(0)}%</span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};


// ============= LOADING SPINNERS =============

export const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };
  
  return (
    <div className={`inline-block ${sizes[size]} ${className}`}>
      <svg className="animate-spin text-cyan-600" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </div>
  );
};


// ============= TOOLTIPS =============

export const Tooltip = ({ children, content, position = 'top' }) => {
  const [show, setShow] = React.useState(false);
  
  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className={`absolute ${positions[position]} z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg border border-gray-700 whitespace-nowrap`}>
          {content}
        </div>
      )}
    </div>
  );
};


// ============= ALERTS =============

export const Alert = ({ type = 'info', title, message, onClose }) => {
  const types = {
    info: 'bg-blue-900/30 border-blue-600/50 text-blue-400',
    success: 'bg-green-900/30 border-green-600/50 text-green-400',
    warning: 'bg-yellow-900/30 border-yellow-600/50 text-yellow-400',
    error: 'bg-red-900/30 border-red-600/50 text-red-400'
  };
  
  return (
    <div className={`rounded-lg border p-4 ${types[type]}`}>
      <div className="flex items-start justify-between">
        <div>
          {title && <h4 className="font-bold mb-1">{title}</h4>}
          <p className="text-sm opacity-90">{message}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-4 hover:opacity-75">
            ✕
          </button>
        )}
      </div>
    </div>
  );
};


export default {
  Button,
  Card,
  StatCard,
  Modal,
  TransactionModal,
  Input,
  Select,
  Table,
  Badge,
  TierBadge,
  LevelBadge,
  Toast,
  ProgressBar,
  LoadingSpinner,
  Tooltip,
  Alert
};
