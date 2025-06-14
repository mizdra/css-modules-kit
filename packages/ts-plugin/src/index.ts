import type { CMKConfig } from '@css-modules-kit/core';
import { createMatchesPattern, createResolver, readConfigFile } from '@css-modules-kit/core';
import { TsConfigFileNotFoundError } from '@css-modules-kit/core';
import { createLanguageServicePlugin } from '@volar/typescript/lib/quickstart/createLanguageServicePlugin.js';
import { createCSSLanguagePlugin } from './language-plugin.js';
import { proxyLanguageService } from './language-service/proxy.js';

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
      info.languageService = proxyLanguageService(
        language,
        info.languageService,
        info.project,
        resolver,
        matchesPattern,
        config,
      );
    },
  };
});

export = plugin;
