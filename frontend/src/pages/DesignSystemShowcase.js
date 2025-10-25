/**
 * Design System Showcase
 * Демонстрация всех UI компонентов (заменяет Storybook для MVP)
 * Согласно строке 443 файла "цель"
 */

import React, { useState } from 'react';
import {
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
} from './DesignSystem';

export default function DesignSystemShowcase() {
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);

  const mockTransaction = {
    hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    status: 'success',
    amount: '1000'
  };

  const tableColumns = [
    { key: 'rank', label: 'Rank' },
    { key: 'node', label: 'Node ID' },
    { key: 'location', label: 'Location' },
    { key: 'level', label: 'Level', render: (val) => <LevelBadge level={val} /> },
    { key: 'earnings', label: 'Earnings', render: (val) => `${val} AETH` }
  ];

  const tableData = [
    { rank: 1, node: 'node-abc123', location: 'US-East', level: 10, earnings: 5234 },
    { rank: 2, node: 'node-def456', location: 'EU-West', level: 9, earnings: 4891 },
    { rank: 3, node: 'node-ghi789', location: 'Asia-Pacific', level: 8, earnings: 3567 }
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Design System Showcase
          </h1>
          <p className="text-gray-400">Component library for Aetherium Proxy (строки 400-443 файла "цель")</p>
        </div>

        {/* Buttons */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <Button variant="primary">Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="danger">Danger Button</Button>
            <Button variant="success">Success Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button loading>Loading...</Button>
            <Button disabled>Disabled</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
          </div>
        </section>

        {/* Cards */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Total Earnings"
              value="1,234 AETH"
              change="+12.5%"
              trend="up"
              icon="💰"
            />
            <StatCard
              title="Active Nodes"
              value="42"
              change="+3"
              trend="up"
              icon="🖥️"
            />
            <StatCard
              title="Network Load"
              value="67%"
              change="-5%"
              trend="down"
              icon="📊"
            />
          </div>
        </section>

        {/* Badges */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Badges</h2>
          <div className="flex flex-wrap gap-4">
            <Badge status="default">Default</Badge>
            <Badge status="success">Success</Badge>
            <Badge status="warning">Warning</Badge>
            <Badge status="error">Error</Badge>
            <Badge status="info">Info</Badge>
            <Badge status="active">Active</Badge>
          </div>
          <div className="flex flex-wrap gap-4 mt-4">
            <TierBadge tier={0} />
            <TierBadge tier={1} />
            <TierBadge tier={2} />
            <TierBadge tier={3} />
            <TierBadge tier={4} />
          </div>
          <div className="flex flex-wrap gap-4 mt-4">
            <LevelBadge level={1} />
            <LevelBadge level={5} />
            <LevelBadge level={10} />
          </div>
        </section>

        {/* Inputs */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Inputs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
            <Input label="Email" type="email" placeholder="your@email.com" />
            <Input label="Amount" type="number" placeholder="1000" />
            <Input label="With Icon" icon="🔍" placeholder="Search..." />
            <Input label="With Error" error="This field is required" />
            <Select
              label="Select Location"
              options={[
                { value: 'us-east', label: 'US-East' },
                { value: 'eu-west', label: 'EU-West' },
                { value: 'asia', label: 'Asia-Pacific' }
              ]}
            />
          </div>
        </section>

        {/* Progress Bars */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Progress Bars</h2>
          <div className="space-y-4 max-w-3xl">
            <ProgressBar label="XP Progress" value={750} max={1000} />
            <ProgressBar label="Data Shared" value={350} max={500} />
            <ProgressBar label="Upload Progress" value={87} max={100} />
          </div>
        </section>

        {/* Table */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Table</h2>
          <Table columns={tableColumns} data={tableData} />
        </section>

        {/* Modals */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Modals</h2>
          <div className="flex gap-4">
            <Button onClick={() => setShowModal(true)}>Open Modal</Button>
            <Button onClick={() => setShowTxModal(true)}>Transaction Modal</Button>
          </div>

          <Modal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            title="Example Modal"
          >
            <p className="text-gray-300 mb-4">
              This is an example modal with custom content. You can put any components inside.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setShowModal(false)}>Close</Button>
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            </div>
          </Modal>

          <TransactionModal
            isOpen={showTxModal}
            onClose={() => setShowTxModal(false)}
            transaction={mockTransaction}
          />
        </section>

        {/* Alerts */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Alerts</h2>
          <div className="space-y-4 max-w-3xl">
            <Alert
              type="info"
              title="Information"
              message="This is an informational alert message."
            />
            <Alert
              type="success"
              title="Success!"
              message="Your transaction was completed successfully."
            />
            <Alert
              type="warning"
              title="Warning"
              message="Your node is running low on bandwidth."
            />
            <Alert
              type="error"
              title="Error"
              message="Failed to connect to the blockchain network."
              onClose={() => console.log('Alert closed')}
            />
          </div>
        </section>

        {/* Toast */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Toast Notifications</h2>
          <div className="flex flex-wrap gap-4">
            <Button onClick={() => setShowToast('success')}>Show Success</Button>
            <Button onClick={() => setShowToast('error')}>Show Error</Button>
            <Button onClick={() => setShowToast('info')}>Show Info</Button>
            <Button onClick={() => setShowToast('warning')}>Show Warning</Button>
          </div>

          {showToast && (
            <Toast
              type={showToast}
              message={`This is a ${showToast} toast notification`}
              onClose={() => setShowToast(false)}
            />
          )}
        </section>

        {/* Loading */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Loading Spinners</h2>
          <div className="flex items-center gap-8">
            <LoadingSpinner size="sm" />
            <LoadingSpinner size="md" />
            <LoadingSpinner size="lg" />
          </div>
        </section>

        {/* Tooltips */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Tooltips</h2>
          <div className="flex gap-4">
            <Tooltip content="This is a tooltip on top" position="top">
              <Button>Hover Top</Button>
            </Tooltip>
            <Tooltip content="This is a tooltip on bottom" position="bottom">
              <Button>Hover Bottom</Button>
            </Tooltip>
            <Tooltip content="This is a tooltip on left" position="left">
              <Button>Hover Left</Button>
            </Tooltip>
            <Tooltip content="This is a tooltip on right" position="right">
              <Button>Hover Right</Button>
            </Tooltip>
          </div>
        </section>

        {/* Typography */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Typography</h2>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">Heading 1</h1>
            <h2 className="text-3xl font-bold">Heading 2</h2>
            <h3 className="text-2xl font-bold">Heading 3</h3>
            <h4 className="text-xl font-bold">Heading 4</h4>
            <p className="text-base text-gray-300">Body text - Regular paragraph text</p>
            <p className="text-sm text-gray-400">Small text - Secondary information</p>
            <p className="text-xs text-gray-500">Extra small text - Tertiary information</p>
          </div>
        </section>

        {/* Colors */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Color Palette</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <div className="w-full h-20 bg-cyan-600 rounded-lg" />
              <p className="text-sm">Primary Cyan</p>
            </div>
            <div className="space-y-2">
              <div className="w-full h-20 bg-gray-800 rounded-lg" />
              <p className="text-sm">Gray 800</p>
            </div>
            <div className="space-y-2">
              <div className="w-full h-20 bg-green-600 rounded-lg" />
              <p className="text-sm">Success Green</p>
            </div>
            <div className="space-y-2">
              <div className="w-full h-20 bg-red-600 rounded-lg" />
              <p className="text-sm">Error Red</p>
            </div>
            <div className="space-y-2">
              <div className="w-full h-20 bg-yellow-600 rounded-lg" />
              <p className="text-sm">Warning Yellow</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
