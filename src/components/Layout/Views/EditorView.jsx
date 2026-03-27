import React from 'react';
import { TimelineTab } from '../../../features/Timeline/TimelineTab';
import { SequenceViewTab } from '../../../features/SequenceView/SequenceViewTab';
import { SettingsTab } from '../../../features/Settings/SettingsTab';
import { ExportTab } from '../../../features/Export/ExportTab';
import { ArrowLeft, LayoutDashboard, Film, Layers, FileJson } from 'lucide-react';
import useMediaStore from '../../../stores/useMediaStore';
import { useViewStore } from '../../../stores/editorViewStore';
import clsx from 'clsx';

const EditorView = () => {
    const { setAppViewMode } = useMediaStore();
    const { activeTab, setActiveTab } = useViewStore();

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <SettingsTab />;
            case 'timeline':
                return <TimelineTab />;
            case 'sequence':
                return <SequenceViewTab />;
            case 'export':
                return <ExportTab />;
            default:
                return <SettingsTab />;
        }
    };

    const NavItem = ({ id, icon: Icon, label }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={clsx(
                "group relative flex flex-col items-center justify-center p-3 cursor-pointer transition-all duration-200 rounded-xl mb-4 w-14 h-14",
                activeTab === id ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]" : "text-white/40 hover:bg-white/5 hover:text-white"
            )}
            title={label}
        >
            <Icon size={22} strokeWidth={1.5} />
            {activeTab === id && (
                <div className="absolute -left-3 w-1 h-8 bg-[var(--accent-primary)] rounded-r-full" />
            )}
        </button>
    );

    return (
        <div className="h-full w-full bg-[#050510] flex flex-col text-white font-sans overflow-hidden">
            <div className="flex-1 flex overflow-hidden">
                {/* Editor Sidebar */}
                <div className="w-[72px] bg-[#080816] border-r border-white/5 flex flex-col items-center py-6 h-full z-20 shrink-0">
                    <NavItem id="dashboard" icon={LayoutDashboard} label="Project Settings" />
                    <NavItem id="timeline" icon={Film} label="Timeline Editor" />
                    <NavItem id="sequence" icon={Layers} label="Sequence View" />
                    <div className="flex-grow" />
                    <NavItem id="export" icon={FileJson} label="Export Project" />
                </div>

                {/* Sub-View Content */}
                <div className="flex-1 overflow-hidden relative bg-[#050510]">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default EditorView;
