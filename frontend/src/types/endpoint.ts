export type Protocol = 'HTTP' | 'TCP' | 'UDP';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface TransmitResult {
  success: boolean;
  responseBody?: string;
  error?: string;
  latencyMs: number;
}

export interface SimulatorEndpoint {
  id?: number;
  name: string;
  description?: string;
  protocol: Protocol;
  host: string;
  port: number;
  httpMethod?: HttpMethod;
  path?: string;
  requestBody?: string;
  hasResponse: boolean;
  responseBody?: string;
}
