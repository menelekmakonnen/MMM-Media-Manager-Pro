import React, { useEffect } from 'react';
import { X, BookOpen, Command, MousePointer, Layout, Monitor } from 'lucide-react';

const GuideSection = ({ title, icon: Icon, children }) => (
    <div className="mb-6">
        <h3 className="flex items-center gap-2 text-lg font-bold text-[var(--accent-primary)] mb-2">
            <Icon size={20} />
            {title}
        </h3>
        <div className="text-[var(--text-secondary)] text-sm space-y-2 leading-relaxed">
            {children}
        </div>
    </div>
);

const UserGuide = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-3xl max-h-[85vh] bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-4 border-b border-[var(--glass-border)] flex items-center justify-between bg-[var(--bg-primary)]">
                    <div className="flex items-center gap-3">
                        <BookOpen className="text-[var(--accent-primary)]" size={24} />
                        <h2 className="text-xl font-bold text-[var(--text-primary)]">User Guide</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10">
                    <GuideSection title="Getting Started" icon={Monitor}>
                        <p>Welcome to <strong>MMM Media Manager</strong>, your luxury media experience.</p>
                        <p>To begin, use <strong>File &gt; Open Folder</strong> (Ctrl+O) to select a directory containing your media.</p>
                        <p>Use the <strong>Sidebar</strong> to navigate folders. You can toggle between "Tree" and "Grid" view using the buttons in the sidebar header.</p>
                    </GuideSection>

                    <GuideSection title="Navigation & Controls" icon={MousePointer}>
                        <ul className="list-disc pl-5 space-y-1 marker:text-[var(--accent-primary)]">
                            <li><strong>Click</strong> a video to select it.</li>
                            <li><strong>Active Video</strong> plays automatically; background videos pause to keep focus.</li>
                            <li><strong>Skip Controls</strong>: Use the hover controls on any video to skip -180s, -30s, etc.</li>
                            <li><strong>Reset</strong>: Click the Rotate icon to instantly replay a video.</li>
                        </ul>
                    </GuideSection>

                    <GuideSection title="Layouts & Views" icon={Layout}>
                        <p>Customize your experience via the <strong>View</strong> menu:</p>
                        <ul className="list-disc pl-5 space-y-1 marker:text-[var(--accent-primary)]">
                            <li><strong>Single View</strong>: Classic one-file focus.</li>
                            <li><strong>Dual Views</strong>: Choose "Side-by-Side" (Vertical) or "Stacked" (Horizontal).</li>
                            <li><strong>Quad Views</strong>: "Quad Grid" (2x2) or "Quad Strip" (4x1).</li>
                            <li><strong>Hero Strip</strong>: 1 large file flanked by 2 smaller ones.</li>
                            <li><strong>Orientation</strong>: Use the Rotate Grid button in the toolbar to swap rows/columns instantly.</li>
                        </ul>
                    </GuideSection>

                    <GuideSection title="Themes & Aesthetics" icon={Command}>
                        <p>Personalize the application via <strong>View &gt; Themes</strong>.</p>
                        <p>Select from <strong>Spring</strong>, <strong>Summer</strong>, <strong>Autumn</strong>, <strong>Winter</strong>, or <strong>Harmattan</strong>.</p>
                        <p>You can also toggle between <strong>Light</strong>, <strong>Gray</strong>, and <strong>Dark</strong> modes for any season.</p>
                    </GuideSection>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[var(--glass-border)] bg-[var(--bg-primary)] text-center text-[var(--text-dim)] text-xs">
                    MMM Media Manager v1.0 • Designed for Luxury
                </div>
            </div>
        </div>
    );
};

export default UserGuide;
