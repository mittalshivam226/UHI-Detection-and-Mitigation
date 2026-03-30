import React, { useState } from 'react';
import { useUHIContext } from '../context/UHIContext.jsx';
import { Search, X, Settings2, Info, Download, Loader, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { generateReport } from '../utils/generateReport.js';

export default function TopNav({ geocoder }) {
  const { pos, analysis, mlData, hotspots, mapTheme, setMapTheme } = useUHIContext();
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    console.log('[UHIS] Download button clicked', { pos, analysis: !!analysis, mlData: !!mlData });
    if (generating) return;

    // If no analysis yet — alert gracefully
    if (!pos && !analysis && !mlData) {
      alert('Please select a location on the map first to generate a report.');
      return;
    }

    setGenerating(true);
    try {
      await generateReport({ pos, analysis, mlData, hotspots });
    } catch (e) {
      console.error('[UHIS] Report generation failed:', e);
      alert('Report generation failed. See console for details.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <motion.header 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="top-bar glass-panel-heavy"
    >
      <div className="top-bar-logo">
        UHIS <span>Urban Heat Intelligence</span>
      </div>

      <div className="top-bar-search">
        <span className="top-bar-search-icon"><Search size={18} /></span>
        <input
          type="text"
          placeholder="Search city, region, or address..."
          value={geocoder.query}
          onChange={e => geocoder.search(e.target.value)}
          onKeyDown={e => { if(e.key==='Escape') geocoder.clear(); }}
        />
        {geocoder.query && (
          <button 
            onClick={geocoder.clear} 
            style={{position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'var(--on-muted)',cursor:'pointer',display:'flex',alignItems:'center'}}
          >
            <X size={16} />
          </button>
        )}
        
        {/* Dropdown Results */}
        {geocoder.results.length > 0 && (
          <div style={{
            position:'absolute', top:'calc(100% + 8px)', left:0, right:0,
            background:'var(--bg-panel-heavy)', backdropFilter:'blur(20px)',
            border:'1px solid var(--outline-light)', borderRadius:12, zIndex:9999, overflow:'hidden',
            boxShadow:'0 12px 32px rgba(0,0,0,0.6)',
          }}>
            {geocoder.results.map((item, i) => (
              <div key={i} onClick={() => geocoder.pick(item)} style={{
                padding:'12px 16px', fontSize:13, cursor:'pointer',
                borderBottom: i < geocoder.results.length - 1 ? '1px solid var(--outline-light)' : 'none',
                display:'flex', alignItems:'center', gap:10,
                transition:'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0, 242, 255, 0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{color:'var(--primary)'}}><Search size={14} /></div>
                <div>
                  <div style={{fontWeight:600, color:'var(--on-bg)'}}>{item.display_name.split(',')[0]}</div>
                  <div style={{fontSize:11, color:'var(--on-muted)', marginTop:2}}>{item.display_name.split(',').slice(1,3).join(',').trim()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {geocoder.searching && (
          <div style={{position:'absolute',top:'calc(100% + 8px)',left:0,right:0,background:'var(--bg-panel-heavy)',border:'1px solid var(--outline-light)',borderRadius:12,padding:'14px 16px',fontSize:12,color:'var(--on-muted)'}}>
            <div className="spinner" style={{width:14, height:14, display:'inline-block', marginRight:8, verticalAlign:'middle', borderWidth:2}}/>
            Scanning satellite records...
          </div>
        )}
      </div>

      <div className="top-bar-coords">
        {pos ? `${pos.lat.toFixed(4)}° N  ·  ${Math.abs(pos.lng).toFixed(4)}° ${pos.lng<0?'W':'E'}` : 'Awaiting coordinates...'}
      </div>
      
      <div className="top-bar-actions">
        {/* Map Theme Toggle */}
        <motion.button
          className="icon-btn"
          title={mapTheme === 'dark' ? 'Switch to Light Map' : 'Switch to Dark Map'}
          onClick={() => setMapTheme(t => t === 'dark' ? 'light' : 'dark')}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          style={{
            color: mapTheme === 'light' ? '#FFD700' : 'var(--primary)',
            borderColor: mapTheme === 'light' ? 'rgba(255,215,0,0.4)' : undefined,
            boxShadow: mapTheme === 'light' ? '0 0 12px rgba(255,215,0,0.3)' : undefined,
          }}
        >
          {mapTheme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
        </motion.button>
        <button className="icon-btn" title="System Settings"><Settings2 size={18} /></button>
        <button className="icon-btn" title="Model Info"><Info size={18} /></button>
        <motion.button
          id="download-report-btn"
          className="icon-btn"
          title={generating ? 'Generating Report...' : 'Export PDF Report'}
          onClick={handleDownload}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            position: 'relative',
            color: generating ? 'var(--primary)' : undefined,
            borderColor: generating ? 'rgba(0,242,255,0.5)' : undefined,
            boxShadow: generating ? 'var(--glow-primary)' : undefined,
          }}
        >
          {generating
            ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                <Loader size={18} />
              </motion.div>
            : <Download size={18} />
          }
        </motion.button>
      </div>
    </motion.header>
  );
}
