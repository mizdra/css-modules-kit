import type { CMKConfig } from '@css-modules-kit/core';
import { createMatchesPattern, createResolver, readConfigFile } from '@css-modules-kit/core';
import { TsConfigFileNotFoundError } from '@css-modules-kit/core';
import type { Language } from '@volar/language-core';
import { createLanguageServicePlugin } from '@volar/typescript/lib/quickstart/createLanguageServicePlugin.js';
import type ts from 'typescript';
import { createCSSLanguagePlugin } from './language-plugin.js';
import { proxyLanguageService } from './language-service/proxy.js';
import { createDocumentLinkHandler } from './protocol-handler/documentLink.js';
import { createRenameHandler } from './protocol-handler/rename.js';
import { createRenameInfoHandler } from './protocol-handler/renameInfo.js';

const projectToLanguage = new WeakMap<ts.server.Project, Language<string>>();

const plugin = createLanguageServicePlugin((ts, info) => {
  if (info.project.projectKind !== ts.server.ProjectKind.Configured) {
    info.project.projectService.logger.info(`[@css-modules-kit/ts-plugin] info: Project is not configured`);
    return { languagePlugins: [] };
  }

  let config: CMKConfig;
  try {
    config = readConfigFile(info.project.getProjectName());
    // TODO: Report diagnostics
    info.project.projectService.logger.info(
      `[@css-modules-kit/ts-plugin] info: Config file is found '${config.configFileName}'`,
    );
  } catch (error) {
    // If the config file is not found, disable the plugin.
    if (error instanceof TsConfigFileNotFoundError) {
      return { languagePlugins: [] };
    } else {
      let msg = `[@css-modules-kit/ts-plugin] error: Fail to read config file`;
      if (error instanceof Error) {
        msg += `\n: ${error.message}`;
        msg += `\n${error.stack}`;
      }
      info.project.projectService.logger.info(msg);
      return { languagePlugins: [] };
    }
  }

  if (config.enabled === false) {
    return { languagePlugins: [] };
  }

  // tsserver should report a “Cannot find module” error for import statements in CSS Modules that
  // do not exist. However, if `dtsOutDir` is included in `rootDirs` and old .d.ts files remain
  // in `dtsOutDir`, the error will not be reported. Therefore, remove `dtsOutDir` from `rootDirs`.
  const getCompilationSettings = info.languageServiceHost.getCompilationSettings.bind(info.languageServiceHost);
  info.languageServiceHost.getCompilationSettings = () => {
    const settings = { ...getCompilationSettings() };
    if (settings.rootDirs) {
      // TODO: If the `dtsOutDir` is not in `rootDirs`, warn the user.
      settings.rootDirs = settings.rootDirs.filter((dir) => dir !== config.dtsOutDir);
    }
    return settings;
  };

  const moduleResolutionCache = info.languageServiceHost.getModuleResolutionCache?.();
  const resolver = createResolver(config.compilerOptions, moduleResolutionCache);
  const matchesPattern = createMatchesPattern(config);

  return {
    languagePlugins: [createCSSLanguagePlugin(resolver, matchesPattern, config)],
    setup: (language) => {
      projectToLanguage.set(info.project, language);
      info.languageService = proxyLanguageService(
        language,
        info.languageService,
        info.project,
        resolver,
        matchesPattern,
        config,
      );
      if (info.session) {
        // Register protocol handlers for "Request Forwarding to tsserver".
        // See https://github.com/mizdra/css-modules-kit/pull/207 for more details.

        // `info.session.addProtocolHandler` cannot register multiple handlers with the same command name.
        // Attempting to do so will result in an error.
        //
        // By the way, tsserver creates one ConfiguredProject for each tsconfig.json file. Then, tsserver
        // initializes each plugin for each ConfiguredProject. This means that if there are multiple
        // tsconfig.json files, the handler will be registered multiple times.
        //
        // Therefore, we will do the following:
        // - Implement the handler to handle files from different projects
        // - Skip registration if the handler is already registered
        try {
          info.session.addProtocolHandler('_css-modules-kit:rename', createRenameHandler(info.project.projectService));
          info.session.addProtocolHandler(
            '_css-modules-kit:renameInfo',
            createRenameInfoHandler(info.project.projectService),
          );
          info.session.addProtocolHandler(
            '_css-modules-kit:documentLink',
            createDocumentLinkHandler(info.project.projectService, projectToLanguage, resolver),
          );
        } catch {
          info.project.projectService.logger.info(
            `[@css-modules-kit/ts-plugin] Skipping protocol handler registration because the handlers are already registered.`,
          );
        }
      } else {
        // When a plugin is used via tsserver from the editor, the session is always available.
        // However, when a plugin is used via the TypeScript Compiler API, the session may not be available.
        info.project.projectService.logger.info(
          '[@css-modules-kit/ts-plugin] info: Skipping protocol handler registration because session is not available.',
        );
      }
    },
  };
});

export = plugin;
