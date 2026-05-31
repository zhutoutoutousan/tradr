import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// High quality encode for crisp screenshots and gradients.
Config.setCodec("h264");
Config.setCrf(18);
