import { Dropbox, DropboxAuth } from 'dropbox';

// Interface para itens do Dropbox (arquivos ou pastas)
export interface DropboxItem {
    id: string;
    name: string;
    path_lower?: string;
    path_display?: string;
    tag: 'file' | 'folder';
    size?: number;
    client_modified?: string; // Data de modificação
}

const CLIENT_ID = import.meta.env.VITE_DROPBOX_APP_KEY || '';

export class DropboxService {
    private static auth: DropboxAuth | null = null;
    private static dbx: Dropbox | null = null;
    private static accessToken: string | null = null;

    /**
     * Inicializa o serviço e verifica se há token salvo
     */
    static initialize() {
        if (!CLIENT_ID) {
            console.error('Dropbox App Key não configurada (VITE_DROPBOX_APP_KEY)');
            return;
        }

        this.auth = new DropboxAuth({ clientId: CLIENT_ID });

        // Tenta recuperar token do localStorage
        const savedToken = localStorage.getItem('dropbox_access_token');
        if (savedToken) {
            this.setAccessToken(savedToken);
        }
    }

    /**
     * Define o Access Token e inicializa o cliente Dropbox
     */
    static setAccessToken(token: string) {
        this.accessToken = token;
        // Salva para persistência básica (em produção idealmente usaria refresh tokens com backend)
        localStorage.setItem('dropbox_access_token', token);

        this.dbx = new Dropbox({
            accessToken: token,
            clientId: CLIENT_ID
        });
    }

    /**
     * Remove o token e desconecta
     */
    static logout() {
        this.accessToken = null;
        this.dbx = null;
        localStorage.removeItem('dropbox_access_token');
    }

    static isAuthenticated(): boolean {
        return !!this.accessToken;
    }

    /**
     * Gera URL de Autenticação (Fluxo OAuth 2.0 Implicit ou PKCE)
     * Para SPA simples sem backend, usaremos redirect para obter o token na URL (Implicit/Token flow)
     * ou Code flow com PKCE se o SDK suportar nativamente fácil.
     * Simplificando para Implicit Grant (token na URL) para este uso.
     */
    /**
     * Retorna a URI de redirecionamento estável para o OAuth
     */
    static getRedirectUri(): string {
        return `${window.location.origin}/oauth/dropbox`;
    }

    /**
     * Gera URL de Autenticação (Fluxo OAuth 2.0 Implicit)
     */
    static async getAuthUrl(redirectUri?: string): Promise<string> {
        if (!this.auth) this.initialize();
        if (!this.auth) throw new Error('Falha ao inicializar DropboxAuth');

        const finalRedirectUri = redirectUri || this.getRedirectUri();

        // authenticationUrl retorna uma Promise
        return this.auth.getAuthenticationUrl(
            finalRedirectUri,
            undefined,
            'token', // 'token' para Implicit Grant (retorna o token no hash)
            undefined,
            undefined,
            undefined,
            false
        ) as Promise<string>;
    }

    /**
     * Processa a URL de retorno para extrair o token (Implicit Grant)
     */
    static handleAuthCallback(): string | null {
        const hash = window.location.hash;
        if (!hash.includes('access_token=')) return null;

        const params = new URLSearchParams(hash.substring(1)); // remove o #
        const token = params.get('access_token');

        if (token) {
            this.setAccessToken(token);
            // Limpa o hash da URL para não ficar sujo
            window.history.replaceState(null, '', window.location.pathname);
            return token;
        }
        return null;
    }

    /**
     * Lista arquivos de uma pasta
     * @param path Caminho da pasta (vazio '' para raiz)
     */
    static async listFolder(path: string = ''): Promise<DropboxItem[]> {
        if (!this.dbx) throw new Error('Usuário não autenticado no Dropbox');

        // Dropbox API v2 requires root path to be empty string
        // All other paths must start with / and not end with /
        let cleanPath = path;
        if (cleanPath === '/') cleanPath = '';
        if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
            cleanPath = cleanPath.slice(0, -1);
        }

        try {
            const response = await this.dbx.filesListFolder({
                path: cleanPath,
                limit: 100
            });

            return response.result.entries.map((entry: any) => ({
                id: entry.id,
                name: entry.name,
                path_lower: entry.path_lower,
                path_display: entry.path_display,
                tag: entry['.tag'], // 'file' ou 'folder'
                size: entry.size,
                client_modified: entry.client_modified
            }));
        } catch (error) {
            console.error('Erro ao listar pasta Dropbox:', error);

            if ((error as any).error) {
                const errorBody = JSON.stringify((error as any).error);
                // Check for specific scope error
                if (errorBody.includes('required scope')) {
                    this.logout();
                    throw new Error('Permissões insuficientes. Habilite "files.metadata.read" e "files.content.read" no Console do Dropbox.');
                }
            }

            // Se erro for de token expirado (401), deveríamos fazer logout
            if ((error as any).status === 401) {
                this.logout();
                throw new Error('Sessão expirada');
            }
            throw error;
        }
    }

    /**
     * Obtém item (metadata)
     */
    static async getMetadata(path: string): Promise<DropboxItem> {
        if (!this.dbx) throw new Error('Não autenticado');
        const r = await this.dbx.filesGetMetadata({ path });
        const entry: any = r.result;
        return {
            id: entry.id,
            name: entry.name,
            path_display: entry.path_display,
            tag: entry['.tag'],
            size: entry.size
        };
    }

    /**
     * Obtém Link Temporário para Download/Preview
     */
    static async getTemporaryLink(path: string): Promise<string> {
        if (!this.dbx) throw new Error('Não autenticado');
        const response = await this.dbx.filesGetTemporaryLink({ path });
        return response.result.link;
    }
}
