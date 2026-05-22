import { spawn } from "node:child_process";

const port = process.env.PLAYWRIGHT_PORT ?? process.env.PORT ?? "3107";
const baseUrl = `http://127.0.0.1:${port}`;

const server = spawn(
  process.execPath,
  ["./node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", port],
  { stdio: "inherit", shell: false }
);

let stopped = false;

async function stopServer() {
  if (stopped) return;
  stopped = true;

  if (process.platform === "win32" && server.pid) {
    await Promise.race([
      new Promise((resolve) => {
        const killer = spawn("taskkill.exe", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
        killer.on("exit", resolve);
        killer.on("error", resolve);
      }),
      new Promise((resolve) => setTimeout(resolve, 3_000))
    ]);
    return;
  }

  if (!server.killed) {
    server.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => {
        server.on("exit", resolve);
        server.on("error", resolve);
      }),
      new Promise((resolve) => setTimeout(resolve, 3_000))
    ]);
  }
}

async function stopServerAndExit(code) {
  try {
    await stopServer();
  } finally {
    process.exit(code);
  }
}

process.on("SIGINT", () => {
  void stopServerAndExit(130);
});

process.on("SIGTERM", () => {
  void stopServerAndExit(143);
});

server.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});

server.on("exit", (code) => {
  if (!stopped && code && code !== 0) {
    process.exitCode = code;
  }
});

async function waitForServer() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 120_000) {
    try {
      const response = await fetch(`${baseUrl}/manifest.webmanifest`);
      if (response.ok) return;
    } catch {
      // The server is still warming up.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${baseUrl}`);
}

function runPlaywright() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["./node_modules/@playwright/test/cli.js", "test"], {
      stdio: "inherit",
      shell: false,
      env: {
        ...process.env,
        PLAYWRIGHT_PORT: port,
        PLAYWRIGHT_SKIP_WEB_SERVER: "1"
      }
    });
    child.on("exit", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });
}

let code = 1;

try {
  await waitForServer();
  code = await runPlaywright();
} catch (error) {
  console.error(error);
} finally {
  await stopServer();
  process.exit(code);
}
