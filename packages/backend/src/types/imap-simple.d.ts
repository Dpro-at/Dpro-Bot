/** The installed imap-simple subset consumed by the email service. */
declare module 'imap-simple' {
  export interface Config {
    imap: { user: string; password?: string; host: string; port: number; tls: boolean; authTimeout?: number; tlsOptions?: { rejectUnauthorized: boolean }; xoauth2?: string };
  }
  export interface Connection { end(): void }
  const imaps: { connect(config: Config): Promise<Connection> };
  export default imaps;
}
