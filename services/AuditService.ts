// removed uuid import

export interface AuditLogEntry {
    id: string;
    timestamp: string; // ISO Date
    path: string;
    pageTitle: string;
    durationSeconds: number;
    activeSeconds: number; // Time actually moving mouse/typing
    idleSeconds: number; // Time AFK
    activityScore: number; // 0-100%
    device: string;
    details: string[];
}

const STORAGE_KEY = 'study_system_audit_logs';

class AuditService {
    private static instance: AuditService;
    private logs: AuditLogEntry[] = [];

    private constructor() {
        this.loadLogs();
    }

    public static getInstance(): AuditService {
        if (!AuditService.instance) {
            AuditService.instance = new AuditService();
        }
        return AuditService.instance;
    }

    private loadLogs() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                this.logs = JSON.parse(stored);
            }
        } catch (e) {
            console.error('Failed to load audit logs', e);
            this.logs = [];
        }
    }

    private saveLogs() {
        try {
            // Keep only last 1000 logs to prevent overflow
            if (this.logs.length > 1000) {
                this.logs = this.logs.slice(0, 1000);
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
        } catch (e) {
            console.error('Failed to save audit logs', e);
        }
    }

    public logSession(entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'device'>) {
        const fullEntry: AuditLogEntry = {
            ...entry,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            device: this.getDeviceInfo()
        };

        // Add to beginning
        this.logs.unshift(fullEntry);
        this.saveLogs();
        return fullEntry;
    }

    public getLogs(): AuditLogEntry[] {
        return this.logs;
    }

    public clearLogs() {
        this.logs = [];
        this.saveLogs();
    }

    private getDeviceInfo(): string {
        const ua = navigator.userAgent;
        if (/mobile/i.test(ua)) return 'Mobile';
        if (/tablet/i.test(ua)) return 'Tablet';
        return 'Desktop';
    }
}

export const auditService = AuditService.getInstance();
