use super::types::{ExtensionEntry, RuntimeFileConfig};
use std::path::Path;

/// Read Claude Code config from `~/.claude/settings.json` and `~/.claude.json`,
/// with `<workdir>/.claude/settings.json` layered on top.
///
/// Claude Code itself reads both files and lets the project one win, so the
/// panel showed values that were not the ones in effect: an agent whose nest
/// sets `effortLevel: medium` really does run at medium, while the panel
/// reported the user-level `low` (#5826).
pub(super) fn read_config_file(workdir: Option<&Path>) -> Option<RuntimeFileConfig> {
    let home = dirs::home_dir()?;
    let settings_path = home.join(".claude").join("settings.json");
    let mcp_path = home.join(".claude.json");

    let user_settings = read_json_file(&settings_path);
    let project_settings = workdir
        .map(|dir| dir.join(".claude").join("settings.json"))
        // A project file that *is* the user file (agent workdir == $HOME, the
        // fallback in `default_agent_workdir`) must not be read twice.
        .filter(|path| path != &settings_path)
        .as_deref()
        .and_then(read_json_file);
    let settings = merge_settings(user_settings, project_settings);
    let mcp_config = read_json_file(&mcp_path);

    if settings.is_none() && mcp_config.is_none() {
        return None;
    }

    let mut cfg = RuntimeFileConfig::default();

    if let Some(ref s) = settings {
        apply_settings(&mut cfg, s);
    }

    // MCP servers from ~/.claude.json
    let mut extensions = Vec::new();
    if let Some(ref mc) = mcp_config {
        if let Some(servers) = mc.get("mcpServers").and_then(|v| v.as_object()) {
            for (name, _config) in servers {
                extensions.push(ExtensionEntry {
                    name: name.clone(),
                    kind: "mcp".to_string(),
                    enabled: true,
                });
            }
        }
    }
    cfg.extensions = extensions;

    Some(cfg)
}

/// Layer project settings over user settings, project winning.
///
/// Objects merge key by key rather than replacing wholesale, so a project file
/// that sets one `env` var does not erase the rest of the user's `env`. Any
/// non-object value replaces its counterpart outright.
fn merge_settings(
    user: Option<serde_json::Value>,
    project: Option<serde_json::Value>,
) -> Option<serde_json::Value> {
    match (user, project) {
        (Some(mut user), Some(project)) => {
            merge_into(&mut user, project);
            Some(user)
        }
        (user, None) => user,
        (None, project) => project,
    }
}

fn merge_into(base: &mut serde_json::Value, overlay: serde_json::Value) {
    match (base, overlay) {
        (serde_json::Value::Object(base), serde_json::Value::Object(overlay)) => {
            for (key, value) in overlay {
                match base.get_mut(&key) {
                    Some(existing) => merge_into(existing, value),
                    None => {
                        base.insert(key, value);
                    }
                }
            }
        }
        (base, overlay) => *base = overlay,
    }
}

/// Project the fields Buzz surfaces out of a Claude `settings.json` object.
fn apply_settings(cfg: &mut RuntimeFileConfig, settings: &serde_json::Value) {
    cfg.model = json_string(settings, "model");

    // effortLevel → thinking_effort (direct mapping per spec)
    cfg.thinking_effort = json_string(settings, "effortLevel");

    // Config-driven extra fields — skip normalized keys to avoid double-counting.
    let skip = &["model", "effortLevel"];
    cfg.extra = super::schema_walker::extract_config_fields(settings, skip);
}

fn read_json_file(path: &std::path::Path) -> Option<serde_json::Value> {
    let raw = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&raw).ok()
}

fn json_string(val: &serde_json::Value, key: &str) -> Option<String> {
    val.get(key)?
        .as_str()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Parse a settings JSON string into a RuntimeFileConfig through the same
    /// projection `read_config_file` uses, without touching the filesystem.
    fn parse_settings(json: &str) -> RuntimeFileConfig {
        let val: serde_json::Value = serde_json::from_str(json).unwrap();
        let mut cfg = RuntimeFileConfig::default();
        apply_settings(&mut cfg, &val);
        cfg
    }

    #[test]
    fn parse_model_from_settings() {
        let cfg = parse_settings(r#"{"model": "claude-sonnet-4-20250514"}"#);
        assert_eq!(cfg.model.as_deref(), Some("claude-sonnet-4-20250514"));
    }

    #[test]
    fn effort_level_maps_to_thinking_effort() {
        let cfg = parse_settings(r#"{"effortLevel": "high"}"#);
        assert_eq!(cfg.thinking_effort.as_deref(), Some("high"));
        // effortLevel must NOT appear in extra (it's in the skip list)
        assert!(!cfg.extra.contains_key("effortLevel"));
    }

    #[test]
    fn always_thinking_enabled_appears_in_extra() {
        let cfg = parse_settings(r#"{"alwaysThinkingEnabled": true}"#);
        assert_eq!(
            cfg.extra.get("alwaysThinkingEnabled").map(|s| s.as_str()),
            Some("true"),
            "alwaysThinkingEnabled should appear in extra"
        );
    }

    #[test]
    fn env_vars_flattened_in_extra() {
        let cfg = parse_settings(
            r#"{"env": {"CLAUDE_CODE_EFFORT_LEVEL": "high", "ANTHROPIC_MODEL": "claude-opus-4"}}"#,
        );
        assert_eq!(
            cfg.extra
                .get("env.CLAUDE_CODE_EFFORT_LEVEL")
                .map(|s| s.as_str()),
            Some("high"),
            "env.CLAUDE_CODE_EFFORT_LEVEL should appear in extra"
        );
        assert_eq!(
            cfg.extra.get("env.ANTHROPIC_MODEL").map(|s| s.as_str()),
            Some("claude-opus-4"),
            "env.ANTHROPIC_MODEL should appear in extra"
        );
    }

    #[test]
    fn arbitrary_env_var_surfaced_without_schema() {
        // Config-driven: any env var the user has set appears, even if no schema
        // defines it — this is the core benefit over the schema-driven approach.
        let cfg = parse_settings(r#"{"env": {"MY_CUSTOM_VAR": "hello"}}"#);
        assert_eq!(
            cfg.extra.get("env.MY_CUSTOM_VAR").map(|s| s.as_str()),
            Some("hello"),
            "arbitrary env vars should appear in extra"
        );
    }

    #[test]
    fn enabled_plugins_flattened_in_extra() {
        let cfg = parse_settings(r#"{"enabledPlugins": {"plugin-a": true, "plugin-b": true}}"#);
        // Walker flattens one level: enabledPlugins.plugin-a = "true"
        assert!(
            cfg.extra.contains_key("enabledPlugins.plugin-a")
                || cfg.extra.contains_key("enabledPlugins.plugin-b"),
            "enabledPlugins entries should appear as enabledPlugins.<name> in extra"
        );
    }

    #[test]
    fn parse_permissions_and_hooks() {
        let cfg = parse_settings(
            r#"{"permissions": {"default": "bypassPermissions"}, "hooks": {"pre-commit": {}}}"#,
        );
        // permissions is an object — flattened as permissions.default
        assert_eq!(
            cfg.extra.get("permissions.default").map(|s| s.as_str()),
            Some("bypassPermissions")
        );
        // hooks.pre-commit is an empty object — emits placeholder
        assert_eq!(
            cfg.extra.get("hooks.pre-commit").map(|s| s.as_str()),
            Some("{...}")
        );
    }

    #[test]
    fn parse_mcp_servers() {
        let json =
            r#"{"mcpServers": {"filesystem": {"command": "npx"}, "github": {"command": "gh"}}}"#;
        let val: serde_json::Value = serde_json::from_str(json).unwrap();
        let mut extensions = Vec::new();
        if let Some(servers) = val.get("mcpServers").and_then(|v| v.as_object()) {
            for (name, _) in servers {
                extensions.push(ExtensionEntry {
                    name: name.clone(),
                    kind: "mcp".to_string(),
                    enabled: true,
                });
            }
        }
        assert_eq!(extensions.len(), 2);
    }

    #[test]
    fn empty_settings_returns_defaults() {
        let cfg = parse_settings("{}");
        assert!(cfg.model.is_none());
        assert!(cfg.thinking_effort.is_none());
        assert!(cfg.system_prompt.is_none());
    }

    #[test]
    fn model_not_duplicated_in_extra() {
        let cfg = parse_settings(r#"{"model": "claude-opus-4", "effortLevel": "high"}"#);
        assert!(!cfg.extra.contains_key("model"));
        assert!(!cfg.extra.contains_key("effortLevel"));
    }

    fn merged(user: &str, project: &str) -> RuntimeFileConfig {
        let merged = merge_settings(
            serde_json::from_str(user).ok(),
            serde_json::from_str(project).ok(),
        )
        .expect("merged settings");
        let mut cfg = RuntimeFileConfig::default();
        apply_settings(&mut cfg, &merged);
        cfg
    }

    #[test]
    fn project_settings_win_over_user_settings() {
        // The reported case: the agent really runs at medium, the panel said low.
        let cfg = merged(r#"{"effortLevel": "low"}"#, r#"{"effortLevel": "medium"}"#);
        assert_eq!(cfg.thinking_effort.as_deref(), Some("medium"));
    }

    #[test]
    fn user_settings_survive_keys_the_project_does_not_set() {
        let cfg = merged(
            r#"{"model": "claude-opus-4", "effortLevel": "low"}"#,
            r#"{"effortLevel": "high"}"#,
        );
        assert_eq!(cfg.model.as_deref(), Some("claude-opus-4"));
        assert_eq!(cfg.thinking_effort.as_deref(), Some("high"));
    }

    #[test]
    fn objects_merge_rather_than_replace() {
        // A project file that sets one env var must not erase the others.
        let cfg = merged(
            r#"{"env": {"A": "user-a", "B": "user-b"}}"#,
            r#"{"env": {"B": "project-b"}}"#,
        );
        assert_eq!(cfg.extra.get("env.A").map(|s| s.as_str()), Some("user-a"));
        assert_eq!(
            cfg.extra.get("env.B").map(|s| s.as_str()),
            Some("project-b")
        );
    }

    #[test]
    fn either_file_alone_is_used_as_is() {
        let only_user = merge_settings(serde_json::from_str(r#"{"model": "u"}"#).ok(), None);
        assert_eq!(
            only_user.as_ref().and_then(|v| v.get("model")),
            Some(&serde_json::Value::from("u"))
        );
        let only_project = merge_settings(None, serde_json::from_str(r#"{"model": "p"}"#).ok());
        assert_eq!(
            only_project.as_ref().and_then(|v| v.get("model")),
            Some(&serde_json::Value::from("p"))
        );
        assert!(merge_settings(None, None).is_none());
    }

    #[test]
    fn unknown_future_field_appears_in_extra() {
        // Config-driven: any field the user has set appears, even if we've never
        // heard of it. No schema gate.
        let cfg = parse_settings(r#"{"someNewClaudeField": "value"}"#);
        assert_eq!(
            cfg.extra.get("someNewClaudeField").map(|s| s.as_str()),
            Some("value"),
            "unknown future fields should appear in extra"
        );
    }
}
