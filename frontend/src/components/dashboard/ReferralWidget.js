/**
 * ReferralWidget Component
 * Displays referral stats and invite link
 * Строки 450-465 файла "цель" (Day 50-52: Dashboard Page)
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Users, DollarSign, Share2, Check } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function ReferralWidget({ walletAddress, token }) {
  const [referralStats, setReferralStats] = useState({
    code: '',
    totalReferrals: 0,
    totalEarnings: 0,
    activeReferrals: 0,
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (walletAddress) {
      fetchReferralStats();
    }
  }, [walletAddress]);

  const fetchReferralStats = async () => {
    try {
      // Try blockchain endpoint first
      const response = await axios.get(
        `${BACKEND_URL}/api/blockchain/referral/stats/${walletAddress}`
      );
      
      setReferralStats({
        code: response.data.code || walletAddress.slice(0, 8),
        totalReferrals: response.data.totalReferrals || 0,
        totalEarnings: response.data.totalCommission || 0,
        activeReferrals: response.data.activeReferrals || 0,
      });
    } catch (error) {
      console.error('Failed to load referral stats:', error);
      // Set default values
      setReferralStats({
        code: walletAddress.slice(0, 8),
        totalReferrals: 0,
        totalEarnings: 0,
        activeReferrals: 0,
      });
    }
  };

  const copyReferralLink = () => {
    const referralLink = `${window.location.origin}/?ref=${referralStats.code}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = async () => {
    const referralLink = `${window.location.origin}/?ref=${referralStats.code}`;
    const text = `Join Aetherium Proxy and earn rewards! Use my referral link: ${referralLink}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Aetherium Proxy',
          text,
          url: referralLink,
        });
        toast.success('Shared successfully!');
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(text);
      toast.success('Referral text copied!');
    }
  };

  return (
    <Card className="referral-widget-card">
      <CardHeader>
        <CardTitle>Referral Program</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="referral-stats-grid">
          <div className="referral-stat">
            <Users className="referral-stat-icon" />
            <div className="referral-stat-info">
              <div className="referral-stat-value">{referralStats.totalReferrals}</div>
              <div className="referral-stat-label">Total Referrals</div>
            </div>
          </div>
          
          <div className="referral-stat">
            <DollarSign className="referral-stat-icon success" />
            <div className="referral-stat-info">
              <div className="referral-stat-value">{referralStats.totalEarnings.toFixed(2)} AETH</div>
              <div className="referral-stat-label">Total Earnings</div>
            </div>
          </div>
          
          <div className="referral-stat">
            <Users className="referral-stat-icon active" />
            <div className="referral-stat-info">
              <div className="referral-stat-value">{referralStats.activeReferrals}</div>
              <div className="referral-stat-label">Active Referrals</div>
            </div>
          </div>
        </div>

        <div className="referral-link-section">
          <div className="referral-code-label">Your Referral Code</div>
          <div className="referral-code-display">
            <code>{referralStats.code}</code>
            <Button
              size="sm"
              variant="ghost"
              onClick={copyReferralLink}
              className="copy-btn"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </Button>
          </div>
          
          <div className="referral-actions">
            <Button
              onClick={copyReferralLink}
              className="referral-action-btn"
              variant="outline"
            >
              <Copy size={16} />
              Copy Link
            </Button>
            <Button
              onClick={shareReferral}
              className="referral-action-btn"
              variant="outline"
            >
              <Share2 size={16} />
              Share
            </Button>
          </div>
        </div>

        <div className="referral-info">
          <div className="referral-info-title">💰 Earn Commissions</div>
          <ul className="referral-info-list">
            <li>Level 1: <strong>5%</strong> of referral's earnings</li>
            <li>Level 2: <strong>3%</strong> of sub-referral's earnings</li>
            <li>Level 3: <strong>2%</strong> of sub-sub-referral's earnings</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
