import React, { useEffect, useCallback } from 'react';
import { appBridge, useBridgeStore } from '../lib/appBridge';

/**
 * BridgeStatus — Connection indicator and controls for the Darkroom ↔ Pro bridge.
 * 
 * Displays a small pill showing connection status with Pro.
 * Click to toggle connection. Hover for details.
 */
export default function BridgeStatus({ compact = false }) {
    const { status, proAppInfo, lastError } = useBridgeStore();

    // Auto-connect on mount if enabled
    useEffect(() => {
        const { autoConnect } = useBridgeStore.getState();
        if (autoConnect && status === 'disconnected') {
            // Delay initial connect to let the app settle
            const timer = setTimeout(() => appBridge.connect(), 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClick = useCallback(() => {
        appBridge.toggle();
    }, []);

    const statusColors = {
        connected: { dot: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)', text: '#86efac' },
        connecting: { dot: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', text: '#fcd34d' },
        disconnected: { dot: '#6b7280', bg: 'rgba(107,114,128,0.06)', border: 'rgba(107,114,128,0.15)', text: '#9ca3af' }
    };

    const colors = statusColors[status];
    const label = status === 'connected'
        ? (proAppInfo?.name || 'Pro Connected')
        : status === 'connecting'
            ? 'Connecting...'
            : 'Pro Offline';

    const tooltipText = status === 'connected'
        ? `Connected to ${proAppInfo?.name || 'MMMedia Pro'} v${proAppInfo?.version || '?'}\nClick to disconnect`
        : status === 'connecting'
            ? 'Attempting to connect to MMMedia Pro...'
            : lastError
                ? `${lastError}\nClick to reconnect`
                : 'Click to connect to MMMedia Pro';

    if (compact) {
        return (
            <button
                onClick={handleClick}
                title={tooltipText}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '3px 8px',
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                }}
            >
                <span
                    style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: colors.dot,
                        boxShadow: status === 'connected' ? `0 0 6px ${colors.dot}` : 'none',
                        animation: status === 'connecting' ? 'bridgePulse 1.5s infinite' : 'none',
                    }}
                />
                <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: colors.text,
                    letterSpacing: '0.02em',
                    whiteSpace: 'nowrap',
                }}>
                    {label}
                </span>
                <style>{`
                    @keyframes bridgePulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.3; }
                    }
                `}</style>
            </button>
        );
    }

    // Full-size version with more detail
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '12px',
            background: 'rgba(0,0,0,0.3)',
            border: `1px solid ${colors.border}`,
            borderRadius: '10px',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        backgroundColor: colors.dot,
                        boxShadow: status === 'connected' ? `0 0 8px ${colors.dot}` : 'none',
                        animation: status === 'connecting' ? 'bridgePulse 1.5s infinite' : 'none',
                    }} />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                        MMMedia Pro Bridge
                    </span>
                </div>
                <button
                    onClick={handleClick}
                    style={{
                        padding: '4px 10px',
                        fontSize: '10px',
                        fontWeight: 700,
                        background: status === 'connected' ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)',
                        color: status === 'connected' ? '#fca5a5' : '#a5b4fc',
                        border: `1px solid ${status === 'connected' ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.3)'}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                    }}
                >
                    {status === 'connected' ? 'Disconnect' : status === 'connecting' ? 'Cancel' : 'Connect'}
                </button>
            </div>

            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                {status === 'connected' && proAppInfo
                    ? `${proAppInfo.name} v${proAppInfo.version}`
                    : status === 'connecting'
                        ? 'Searching for MMMedia Pro on localhost:19797...'
                        : lastError || 'Not connected to MMMedia Pro'
                }
            </div>

            <style>{`
                @keyframes bridgePulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
            `}</style>
        </div>
    );
}
