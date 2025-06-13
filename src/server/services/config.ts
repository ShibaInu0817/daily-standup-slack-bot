import fs from "fs";
import path from "path";
import { type ConfigStore, type StandupConfig } from "~/types/slack";

const CONFIG_FILE = path.join(process.cwd(), "data/config.json");

// Default configurations
const DEFAULT_CONFIG: Partial<StandupConfig> = {
  enableReminders: true,
  enableTimeouts: true,
  timeoutDuration: 120, // minutes
  timezone: "UTC",
};

class ConfigService {
  private static instance: ConfigService;
  private configData: ConfigStore;

  private constructor() {
    this.configData = this.loadConfig();
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  private loadConfig(): ConfigStore {
    try {
      // Ensure directory exists
      const dir = path.dirname(CONFIG_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (!fs.existsSync(CONFIG_FILE)) {
        fs.writeFileSync(CONFIG_FILE, "{}");
        return {};
      }

      const data = fs.readFileSync(CONFIG_FILE, "utf8");
      const parsed = JSON.parse(data) as unknown;

      // Validate that it's a record of StandupConfig
      if (typeof parsed === "object" && parsed !== null) {
        return parsed as ConfigStore;
      }

      console.warn("Invalid config file format, starting fresh");
      return {};
    } catch (err) {
      console.log("📁 No existing config, starting fresh.");
      return {};
    }
  }

  private saveAllConfig(config: ConfigStore): void {
    // Write to a temporary file first
    const tempFile = `${CONFIG_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(config, null, 2));

    // Rename temp file to actual file (atomic operation)
    fs.renameSync(tempFile, CONFIG_FILE);
  }

  public getConfig(teamId: string): StandupConfig | undefined {
    return this.configData[teamId];
  }

  public saveConfig(teamId: string, config: Partial<StandupConfig>): void {
    // Merge with default configurations for new fields
    this.configData[teamId] = {
      ...DEFAULT_CONFIG,
      ...this.configData[teamId], // Include any existing config
      ...config, // Override with new config
    } as StandupConfig;

    this.saveAllConfig(this.configData);
  }

  public getAllConfigs(): ConfigStore {
    return this.configData;
  }
}

// Export singleton instance
export const configService = ConfigService.getInstance();
