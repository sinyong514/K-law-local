import React from 'react';
import { Scale, Search, ShieldAlert, FileDiff, Settings, HelpCircle } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const menuItems = [
    { id: 'lawSearch', label: '법령 검색', icon: Search },
    { id: 'citator', label: '판례 유효성 검증', icon: ShieldAlert },
    { id: 'diffViewer', label: '제·개정 시점 비교', icon: FileDiff },
  ];

  return (
    <aside className="w-64 bg-[#0d1321] border-r border-slate-800 flex flex-col justify-between h-full select-none">
      <div>
        {/* 상단 브랜딩 로고 */}
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
          <div className="bg-brand-500/10 p-2.5 rounded-xl border border-brand-500/30 text-brand-400">
            <Scale className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wide text-white font-sans">대한민국 법률 AI</h1>
            <p className="text-xs text-slate-500 font-medium">Assistant Program</p>
          </div>
        </div>

        {/* 메인 네비게이션 메뉴 */}
        <nav className="p-4 space-y-1">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-premium ${
                  isActive
                    ? 'bg-brand-500/15 text-brand-300 border-l-4 border-brand-500 shadow-lg shadow-brand-500/5'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-brand-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 하단 설정 & 유저 정보 */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        <button
          onClick={() => setActiveTab('settings')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-premium ${
            activeTab === 'settings'
              ? 'bg-brand-500/15 text-brand-300 border-l-4 border-brand-500 shadow-lg shadow-brand-500/5'
              : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
          }`}
        >
          <Settings className={`h-5 w-5 ${activeTab === 'settings' ? 'text-brand-400' : 'text-slate-500'}`} />
          <span>설정 (API 키 관리)</span>
        </button>

        <div className="flex items-center space-x-3 p-3 bg-slate-900/40 rounded-xl border border-slate-800/50">
          <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300">
            K
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-slate-300 truncate">로컬 사용자</p>
            <p className="text-[10px] text-slate-500 truncate">Standalone Mode</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
