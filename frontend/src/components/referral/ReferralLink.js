/**
 * ReferralLink Component - Day 64-66
 * Generate and display referral link with QR code
 */
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Share2, Download, ExternalLink } from 'lucide-react';

const ReferralLink = ({ referralCode, referralUrl }) => {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const fullUrl = referralUrl || `${window.location.origin}/register?ref=${referralCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Aetherium Proxy',
          text: 'Join me on Aetherium Proxy and earn AETH tokens!',
          url: fullUrl
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      handleCopy();
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('referral-qr-code');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      
      const downloadLink = document.createElement('a');
      downloadLink.download = `referral-qr-${referralCode}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="referral-link-card">
      <div className="referral-link-header">
        <h3>Your Referral Link</h3>
        <p className="referral-link-subtitle">Share this link to earn commissions</p>
      </div>

      <div className="referral-code-display">
        <div className="referral-code-badge">
          <span className="referral-code-label">CODE:</span>
          <span className="referral-code-value">{referralCode}</span>
        </div>
      </div>

      <div className="referral-url-container">
        <input
          type="text"
          value={fullUrl}
          readOnly
          className="referral-url-input"
        />
        <button
          onClick={handleCopy}
          className="referral-copy-btn"
          title="Copy link"
        >
          <Copy size={18} />
          {copied && <span className="copy-tooltip">Copied!</span>}
        </button>
      </div>

      <div className="referral-actions">
        <button onClick={handleShare} className="referral-action-btn">
          <Share2 size={18} />
          Share Link
        </button>
        <button
          onClick={() => setShowQR(!showQR)}
          className="referral-action-btn"
        >
          <ExternalLink size={18} />
          {showQR ? 'Hide' : 'Show'} QR Code
        </button>
      </div>

      {showQR && (
        <div className="referral-qr-section">
          <div className="referral-qr-container">
            <QRCodeSVG
              id="referral-qr-code"
              value={fullUrl}
              size={200}
              level="H"
              includeMargin={true}
              fgColor="#06b6d4"
              bgColor="#1a1a24"
            />
          </div>
          <button onClick={handleDownloadQR} className="referral-download-btn">
            <Download size={16} />
            Download QR Code
          </button>
        </div>
      )}

      <div className="referral-commission-info">
        <div className="commission-tier">
          <span className="tier-level">Level 1</span>
          <span className="tier-rate">5%</span>
        </div>
        <div className="commission-tier">
          <span className="tier-level">Level 2</span>
          <span className="tier-rate">3%</span>
        </div>
        <div className="commission-tier">
          <span className="tier-level">Level 3</span>
          <span className="tier-rate">2%</span>
        </div>
      </div>
    </div>
  );
};

export default ReferralLink;