import React from 'react';
import { AlertTriangle, Copy, RefreshCw, ChevronDown, ChevronRight, HardDrive } from 'lucide-react';
import { clearThumbnailCache } from '../utils/thumbnailCache';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            showDetails: false,
            copyStatus: 'Copy Report'
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        console.error("ErrorBoundary caught error:", error, errorInfo);
    }

    handleCopyReport = () => {
        const { error, errorInfo } = this.state;
        const report = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            error: error?.toString(),
            stack: error?.stack,
            componentStack: errorInfo?.componentStack,
            version: '1.1.0'
        };

        const textReport = `--- MMM MEDIA MANAGER ERROR REPORT ---
Date: ${report.timestamp}
Version: ${report.version}
URL: ${report.url}
User Agent: ${report.userAgent}

ERROR:
${report.error}

STACK TRACE:
${report.stack}

COMPONENT STACK:
${report.componentStack}
---------------------------------------`;

        navigator.clipboard.writeText(textReport).then(() => {
            this.setState({ copyStatus: 'Copied!' });
            setTimeout(() => this.setState({ copyStatus: 'Copy Report' }), 2000);
        }).catch(err => {
            console.error('Failed to copy error report:', err);
            this.setState({ copyStatus: 'Failed to Copy' });
        });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
    };

    handleClearAndReload = () => {
        clearThumbnailCache();
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="h-screen w-screen flex items-center justify-center bg-[#0a0a0c] p-6 font-sans antialiased text-white selection:bg-red-500/30">
                    <div className="w-full max-w-2xl glass-panel border border-red-500/30 overflow-hidden flex flex-col max-h-[90vh] shadow-[0_0_50px_rgba(239,68,68,0.1)]">

                        {/* Header */}
                        <div className="p-6 border-b border-red-500/20 bg-gradient-to-r from-red-500/10 to-transparent flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-500">
                                <AlertTriangle size={28} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight">Application Crash Detected</h1>
                                <p className="text-sm text-red-300/60 font-medium">Something went wrong while rendering the UI.</p>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10">

                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest text-red-400/50 font-bold">Error Message</label>
                                <div className="p-4 bg-black/40 border border-white/5 rounded-xl font-mono text-sm text-red-200/80 leading-relaxed">
                                    {this.state.error?.toString()}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={this.handleReset}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all font-bold text-xs uppercase tracking-wider active-press border border-white/5"
                                >
                                    <RefreshCw size={14} /> Try Again
                                </button>
                                <button
                                    onClick={this.handleCopyReport}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl transition-all font-bold text-xs uppercase tracking-wider active-press border border-blue-500/30"
                                >
                                    <Copy size={14} /> {this.state.copyStatus || 'Copy Report'}
                                </button>
                                <button
                                    onClick={this.handleClearAndReload}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-all font-bold text-xs uppercase tracking-wider active-press border border-red-500/30"
                                >
                                    <HardDrive size={14} /> Clear Cache & Reload
                                </button>
                            </div>

                            <div className="space-y-2 border-t border-white/5 pt-6">
                                <button
                                    onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                                    className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/40 hover:text-white/80 transition-colors font-bold group"
                                >
                                    {this.state.showDetails ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    Technical Details
                                </button>

                                {this.state.showDetails && (
                                    <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="space-y-1">
                                            <label className="text-[9px] text-white/30 uppercase">Stack Trace</label>
                                            <pre className="p-3 bg-black/60 rounded-lg text-[10px] font-mono whitespace-pre-wrap leading-normal text-white/60 overflow-x-auto border border-white/5 max-h-48">
                                                {this.state.error?.stack}
                                            </pre>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] text-white/30 uppercase">Component Stack</label>
                                            <pre className="p-3 bg-black/60 rounded-lg text-[10px] font-mono whitespace-pre-wrap leading-normal text-white/60 overflow-x-auto border border-white/5 max-h-48">
                                                {this.state.errorInfo?.componentStack}
                                            </pre>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-black/60 border-t border-white/5 text-center">
                            <p className="text-[9px] text-white/20 uppercase tracking-[0.2em]">Antigravity Diagnostics System v1.0</p>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
