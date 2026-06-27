/**
 * E2E test setup — loads .env before any test runs
 * so BUILT_IN_FORGE_API_KEY / BUILT_IN_FORGE_API_URL are available.
 */
import { config } from "dotenv";
config();
