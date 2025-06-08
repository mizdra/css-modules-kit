import { createSimpleProject } from '@volar/language-server/lib/project/simpleProject';
import { createConnection, createServer } from '@volar/language-server/node';
import { create as createCssService } from 'volar-service-css';

// MEMO: Maybe @volar/language-server and volar-service-css are not needed. We may only need vscode-css-languageservice.

const connection = createConnection();
const server = createServer(connection);

connection.listen();

connection.onInitialize((params) => {
  const cssService = createCssService({
    getCustomData(_context) {
      return [
        {
          provideProperties: () => [],
          provideAtDirectives: () => [{ name: '@value', description: 'Define values with CSS Modules' }],
          providePseudoClasses: () => [],
          providePseudoElements: () => [],
        },
      ];
    },
  });

  // CSS Service's renameProvider conflicts with ts-plugin, causing #121.
  // Therefore, we disable that provider.
  delete cssService.capabilities.renameProvider;
  // CSS Service's renameProvider conflicts with ts-plugin, causing duplicate entries in find all references.
  // Therefore, we disable that provider.
  delete cssService.capabilities.referencesProvider;
  // CSS Service's documentLinkProvider conflicts with ts-plugin, causing #133 and #138.
  // Therefore, we disable that provider.
  delete cssService.capabilities.documentLinkProvider;

  return server.initialize(params, createSimpleProject([]), [cssService]);
});

connection.onInitialized(server.initialized.bind(server));
connection.onShutdown(server.shutdown.bind(server));
