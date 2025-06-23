import type ts from 'typescript';

export interface CSSModulesKitRenameRequest extends ts.server.protocol.Request {
  command: '_css-modules-kit:rename';
  arguments: { fileName: string; position: number };
}
export interface CSSModulesKitRenameHandlerResponse extends ts.server.HandlerResponse {
  response?: { result: ReturnType<ts.LanguageService['findRenameLocations']> };
}
export interface CSSModulesKitRenameResponse extends ts.server.protocol.Response {
  command: '_css-modules-kit:rename';
  readonly body: CSSModulesKitRenameHandlerResponse['response'];
}

export interface CSSModulesKitRenameInfoRequest extends ts.server.protocol.Request {
  command: '_css-modules-kit:renameInfo';
  arguments: { fileName: string; position: number };
}
export interface CSSModulesKitRenameInfoHandlerResponse extends ts.server.HandlerResponse {
  response?: { result: ReturnType<ts.LanguageService['getRenameInfo']> };
}
export interface CSSModulesKitRenameInfoResponse extends ts.server.protocol.Response {
  command: '_css-modules-kit:renameInfo';
  readonly body: CSSModulesKitRenameInfoHandlerResponse['response'];
}

export interface DocumentLink {
  fileName: string;
  textSpan: ts.TextSpan;
}
export interface CSSModulesKitDocumentLinkRequest extends ts.server.protocol.Request {
  command: '_css-modules-kit:documentLink';
  arguments: { fileName: string };
}
export interface CSSModulesKitDocumentLinkHandlerResponse extends ts.server.HandlerResponse {
  response?: { result: DocumentLink[] };
}
export interface CSSModulesKitDocumentLinkResponse extends ts.server.protocol.Response {
  command: '_css-modules-kit:documentLink';
  readonly body: CSSModulesKitDocumentLinkHandlerResponse['response'];
}

declare module 'typescript' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace server {
    export interface Session {
      addProtocolHandler(
        command: '_css-modules-kit:rename',
        handler: (request: CSSModulesKitRenameRequest) => CSSModulesKitRenameHandlerResponse,
      ): void;
      addProtocolHandler(
        command: '_css-modules-kit:renameInfo',
        handler: (request: CSSModulesKitRenameInfoRequest) => CSSModulesKitRenameInfoHandlerResponse,
      ): void;
      addProtocolHandler(
        command: '_css-modules-kit:documentLink',
        handler: (request: CSSModulesKitDocumentLinkRequest) => CSSModulesKitDocumentLinkHandlerResponse,
      ): void;
    }
  }
}
