use std::collections::HashMap;
use std::env;

use serde::Deserialize;
use zed_extension_api::{self as zed, Result, serde_json};

const TS_PLUGIN_PACKAGE_NAME: &str = "@css-modules-kit/ts-plugin";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PackageJson {
    #[serde(default)]
    dependencies: HashMap<String, String>,
    #[serde(default)]
    dev_dependencies: HashMap<String, String>,
}

struct CSSModulesKitExtension {}

impl CSSModulesKitExtension {
    fn install_ts_plugin_if_needed(&self) -> Result<()> {
        let installed_plugin_version = zed::npm_package_installed_version(TS_PLUGIN_PACKAGE_NAME)?;
        let latest_plugin_version = zed::npm_package_latest_version(TS_PLUGIN_PACKAGE_NAME)?;

        if installed_plugin_version.as_ref() != Some(&latest_plugin_version) {
            println!("installing {TS_PLUGIN_PACKAGE_NAME}@{latest_plugin_version}");
            zed::npm_install_package(TS_PLUGIN_PACKAGE_NAME, &latest_plugin_version)?;
        } else {
            println!("ts-plugin already installed");
        }
        Ok(())
    }

    fn get_ts_plugin_root_path(&self, worktree: &zed::Worktree) -> Result<Option<String>> {
        let package_json = worktree.read_text_file("package.json")?;
        let package_json: PackageJson = serde_json::from_str(&package_json)
            .map_err(|err| format!("failed to parse package.json: {err}"))?;

        let has_local_plugin = package_json
            .dev_dependencies
            .contains_key(TS_PLUGIN_PACKAGE_NAME)
            || package_json
                .dependencies
                .contains_key(TS_PLUGIN_PACKAGE_NAME);

        if has_local_plugin {
            println!("Using local installation of {TS_PLUGIN_PACKAGE_NAME}");
            return Ok(None);
        }

        self.install_ts_plugin_if_needed()?;

        println!("Using global installation of {TS_PLUGIN_PACKAGE_NAME}");
        Ok(Some(
            env::current_dir().unwrap().to_string_lossy().to_string(),
        ))
    }
}

impl zed::Extension for CSSModulesKitExtension {
    fn new() -> Self {
        Self {}
    }

    fn language_server_command(
        &mut self,
        _language_server_id: &zed::LanguageServerId,
        _worktree: &zed::Worktree,
    ) -> Result<zed::Command> {
        // A language server is not normally required. However,
        // Zed does not seem to load ts-plugin unless a language server is configured.
        // ref: https://github.com/zed-industries/zed/issues/22410#issuecomment-2815582825
        Ok(zed::Command {
            command: zed::node_binary_path()?,
            args: vec!["-e".into(), r#"import('data:text/javascript;base64,Y29uc3QgeyBzdGRpbiwgc3Rkb3V0IH0gPSBwcm9jZXNzOwoKc3RkaW4uc2V0RW5jb2RpbmcoInV0ZjgiKTsKCmZ1bmN0aW9uIHNlbmQobXNnKSB7CiAgY29uc3QganNvbiA9IEpTT04uc3RyaW5naWZ5KG1zZyk7CiAgY29uc3QgbGVuID0gQnVmZmVyLmJ5dGVMZW5ndGgoanNvbiwgInV0ZjgiKTsKICBzdGRvdXQud3JpdGUoYENvbnRlbnQtTGVuZ3RoOiAke2xlbn1cclxuXHJcbmApOwogIHN0ZG91dC53cml0ZShqc29uKTsKfQoKbGV0IGJ1ZmZlciA9ICIiOwpsZXQgY29udGVudExlbmd0aCA9IDA7CgpzdGRpbi5vbigiZGF0YSIsIChjaHVuaykgPT4gewogIGJ1ZmZlciArPSBjaHVuazsKCiAgd2hpbGUgKHRydWUpIHsKICAgIGlmIChjb250ZW50TGVuZ3RoID09PSAwKSB7CiAgICAgIGNvbnN0IGhlYWRlckVuZCA9IGJ1ZmZlci5pbmRleE9mKCJcclxuXHJcbiIpOwogICAgICBpZiAoaGVhZGVyRW5kID09PSAtMSkgcmV0dXJuOwoKICAgICAgY29uc3QgaGVhZGVyID0gYnVmZmVyLnNsaWNlKDAsIGhlYWRlckVuZCk7CiAgICAgIGNvbnN0IG1hdGNoID0gaGVhZGVyLm1hdGNoKC9Db250ZW50LUxlbmd0aDogKFxkKykvaSk7CiAgICAgIGlmICghbWF0Y2gpIHJldHVybjsgLy8gSWdub3JlIG1hbGZvcm1lZCBoZWFkZXJzCgogICAgICBjb250ZW50TGVuZ3RoID0gcGFyc2VJbnQobWF0Y2hbMV0sIDEwKTsKICAgICAgYnVmZmVyID0gYnVmZmVyLnNsaWNlKGhlYWRlckVuZCArIDQpOwogICAgfQoKICAgIC8vIFdhaXQgZm9yIHRoZSBmdWxsIG1lc3NhZ2UgYm9keQogICAgaWYgKGJ1ZmZlci5sZW5ndGggPCBjb250ZW50TGVuZ3RoKSByZXR1cm47CgogICAgY29uc3QgbWVzc2FnZUpzb24gPSBidWZmZXIuc2xpY2UoMCwgY29udGVudExlbmd0aCk7CiAgICBidWZmZXIgPSBidWZmZXIuc2xpY2UoY29udGVudExlbmd0aCk7CiAgICBjb250ZW50TGVuZ3RoID0gMDsgLy8gUmVzZXQgZm9yIHRoZSBuZXh0IG1lc3NhZ2UKCiAgICB0cnkgewogICAgICBjb25zdCByZXEgPSBKU09OLnBhcnNlKG1lc3NhZ2VKc29uKTsKCiAgICAgIGlmIChyZXEubWV0aG9kID09PSAiaW5pdGlhbGl6ZSIpIHsKICAgICAgICBzZW5kKHsKICAgICAgICAgIGpzb25ycGM6ICIyLjAiLAogICAgICAgICAgaWQ6IHJlcS5pZCwKICAgICAgICAgIHJlc3VsdDogewogICAgICAgICAgICBjYXBhYmlsaXRpZXM6IHt9LCAvLyBNaW5pbWFsIGNhcGFiaWxpdGllcwogICAgICAgICAgfSwKICAgICAgICB9KTsKICAgICAgfSBlbHNlIGlmIChyZXEubWV0aG9kID09PSAic2h1dGRvd24iKSB7CiAgICAgICAgLy8gUmVzcG9uZCB0byBzaHV0ZG93biBiZWZvcmUgZXhpdGluZwogICAgICAgIHNlbmQoewogICAgICAgICAganNvbnJwYzogIjIuMCIsCiAgICAgICAgICBpZDogcmVxLmlkLAogICAgICAgICAgcmVzdWx0OiBudWxsLAogICAgICAgIH0pOwogICAgICAgIC8vIFRoZSBjbGllbnQgc2hvdWxkIHNlbmQgJ2V4aXQnIGFmdGVyIHRoaXMsIGJ1dCB3ZSBjYW4gZXhpdCBoZXJlIGlmIG5lZWRlZCwKICAgICAgICAvLyB0aG91Z2ggdGVjaG5pY2FsbHkgTFNQIHNwZWMgc3VnZ2VzdHMgd2FpdGluZyBmb3IgJ2V4aXQnCiAgICAgICAgLy8gcHJvY2Vzcy5leGl0KDApOwogICAgICB9IGVsc2UgaWYgKHJlcS5tZXRob2QgPT09ICJleGl0IikgewogICAgICAgIHByb2Nlc3MuZXhpdCgwKTsgLy8gRXhpdCBjbGVhbmx5CiAgICAgIH0gZWxzZSBpZiAocmVxLmlkICE9PSB1bmRlZmluZWQpIHsKICAgICAgICAvLyBSZXNwb25kIHdpdGggYW4gZXJyb3IgZm9yIHVuc3VwcG9ydGVkIHJlcXVlc3RzIHRoYXQgaGF2ZSBhbiBJRAogICAgICAgIHNlbmQoewogICAgICAgICAganNvbnJwYzogIjIuMCIsCiAgICAgICAgICBpZDogcmVxLmlkLAogICAgICAgICAgZXJyb3I6IHsKICAgICAgICAgICAgY29kZTogLTMyNjAxLCAvLyBNZXRob2ROb3RGb3VuZAogICAgICAgICAgICBtZXNzYWdlOiBgTWV0aG9kIG5vdCBmb3VuZDogJHtyZXEubWV0aG9kfWAsCiAgICAgICAgICB9LAogICAgICAgIH0pOwogICAgICB9CiAgICAgIC8vIElnbm9yZSBub3RpZmljYXRpb25zIChyZXF1ZXN0cyB3aXRob3V0IGFuIElEKSBvdGhlciB0aGFuICdleGl0JwogICAgfSBjYXRjaCAoZXJyb3IpIHsKICAgICAgLy8gSGFuZGxlIEpTT04gcGFyc2luZyBlcnJvcnMgb3Igb3RoZXIgaXNzdWVzCiAgICAgIGNvbnNvbGUuZXJyb3IoIkVycm9yIHByb2Nlc3NpbmcgbWVzc2FnZToiLCBlcnJvcik7CiAgICAgIC8vIE9wdGlvbmFsbHkgc2VuZCBhIGdlbmVyaWMgZXJyb3IgcmVzcG9uc2UgaWYgcG9zc2libGUKICAgIH0KICB9Cn0pOwoKc3RkaW4ub24oImVuZCIsICgpID0+IHsKICAvLyBIYW5kbGUgc3RyZWFtIGVuZCBpZiBuZWNlc3NhcnkKICBwcm9jZXNzLmV4aXQoMCk7Cn0pOwoKLy8gSGFuZGxlIHBvdGVudGlhbCBlcnJvcnMgb24gc3RyZWFtcwpzdGRpbi5vbigiZXJyb3IiLCAoZXJyKSA9PiB7CiAgY29uc29sZS5lcnJvcigiU3RkaW4gRXJyb3I6IiwgZXJyKTsKICBwcm9jZXNzLmV4aXQoMSk7Cn0pOwoKc3Rkb3V0Lm9uKCJlcnJvciIsIChlcnIpID0+IHsKICBjb25zb2xlLmVycm9yKCJTdGRvdXQgRXJyb3I6IiwgZXJyKTsKICBwcm9jZXNzLmV4aXQoMSk7Cn0pOwo=')"#.to_string()],
            env: Default::default(),
        })
    }

    fn language_server_additional_initialization_options(
        &mut self,
        _language_server_id: &zed::LanguageServerId,
        target_language_server_id: &zed::LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<Option<serde_json::Value>> {
        match target_language_server_id.as_ref() {
            "typescript-language-server" => Ok(Some(serde_json::json!({
                "plugins": [{
                    "name": TS_PLUGIN_PACKAGE_NAME,
                    "location": self.get_ts_plugin_root_path(worktree)?.unwrap_or_else(|| worktree.root_path()),
                    "languages": ["css"]
                }],
            }))),
            _ => Ok(None),
        }
    }

    fn language_server_additional_workspace_configuration(
        &mut self,
        _language_server_id: &zed::LanguageServerId,
        target_language_server_id: &zed::LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<Option<serde_json::Value>> {
        match target_language_server_id.as_ref() {
            "vtsls" => Ok(Some(serde_json::json!({
                "vtsls": {
                    "tsserver": {
                        "globalPlugins": [{
                            "name": TS_PLUGIN_PACKAGE_NAME,
                            "location": self.get_ts_plugin_root_path(worktree)?.unwrap_or_else(|| worktree.root_path()),
                            "enableForWorkspaceTypeScriptVersions": true,
                            "languages": ["css"]
                        }]
                    }
                },
            }))),
            _ => Ok(None),
        }
    }
}

zed::register_extension!(CSSModulesKitExtension);
