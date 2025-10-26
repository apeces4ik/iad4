/**
 * ReferralTree Component - Day 64-66
 * Interactive 3-level referral tree visualization using D3.js
 */
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const ReferralTree = ({ treeData, onNodeClick }) => {
  const svgRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (!treeData || !svgRef.current) return;

    // Clear previous svg
    d3.select(svgRef.current).selectAll('*').remove();

    const width = dimensions.width;
    const height = dimensions.height;
    const margin = { top: 40, right: 120, bottom: 40, left: 120 };

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create tree layout
    const treeLayout = d3.tree()
      .size([height - margin.top - margin.bottom, width - margin.left - margin.right]);

    // Create hierarchy
    const root = d3.hierarchy(treeData);
    const treeNodes = treeLayout(root);

    // Add links (edges)
    svg.selectAll('.link')
      .data(treeNodes.links())
      .enter()
      .append('path')
      .attr('class', 'referral-link')
      .attr('d', d3.linkHorizontal()
        .x(d => d.y)
        .y(d => d.x)
      )
      .style('fill', 'none')
      .style('stroke', 'rgba(6, 182, 212, 0.3)')
      .style('stroke-width', 2);

    // Add nodes
    const nodes = svg.selectAll('.node')
      .data(treeNodes.descendants())
      .enter()
      .append('g')
      .attr('class', 'referral-node')
      .attr('transform', d => `translate(${d.y},${d.x})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        if (onNodeClick) onNodeClick(d.data);
      });

    // Add circles
    nodes.append('circle')
      .attr('r', d => d.depth === 0 ? 20 : 15)
      .style('fill', d => {
        const colors = {
          'Bronze': '#cd7f32',
          'Silver': '#c0c0c0',
          'Gold': '#ffd700',
          'Platinum': '#e5e4e2',
          'Diamond': '#b9f2ff'
        };
        return colors[d.data.rank] || 'rgba(6, 182, 212, 0.8)';
      })
      .style('stroke', 'rgba(6, 182, 212, 1)')
      .style('stroke-width', 2)
      .style('filter', 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.5))');

    // Add rank badge
    nodes.append('text')
      .attr('dy', 5)
      .attr('text-anchor', 'middle')
      .text(d => d.data.rank ? d.data.rank[0] : 'U')
      .style('fill', '#ffffff')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none');

    // Add labels
    nodes.append('text')
      .attr('dy', d => d.depth === 0 ? -30 : -25)
      .attr('text-anchor', 'middle')
      .text(d => d.data.short_address || 'Unknown')
      .style('fill', 'var(--text-primary)')
      .style('font-size', '11px')
      .style('font-weight', '500');

    // Add stats
    nodes.append('text')
      .attr('dy', d => d.depth === 0 ? 35 : 30)
      .attr('text-anchor', 'middle')
      .text(d => `${d.data.direct_referrals || 0} refs`)
      .style('fill', 'var(--text-secondary)')
      .style('font-size', '10px');

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        svg.attr('transform', event.transform);
      });

    d3.select(svgRef.current).call(zoom);

  }, [treeData, dimensions, onNodeClick]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const container = svgRef.current?.parentElement;
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: Math.max(600, container.clientHeight)
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!treeData) {
    return (
      <div className="referral-tree-empty">
        <p>No referral data available</p>
      </div>
    );
  }

  return (
    <div className="referral-tree-container">
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default ReferralTree;