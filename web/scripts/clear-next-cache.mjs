import { rmSync } from "node:fs";
import { join } from "node:path";

rmSync(join(process.cwd(), ".next"), { recursive: true, force: true });
rmSync(join(process.cwd(), ".next-build"), { recursive: true, force: true });
