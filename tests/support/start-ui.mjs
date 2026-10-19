// Test-only Supabase transport fixture over actual PostgreSQL (PGlite).
// Never imported by src/, never included in the application build.
// Authentication responses exercise UI behavior; they do NOT verify hosted Supabase Auth.
import http from "node:http";
import { createServer as viteServer } from "vite";
import { database, asUser, ADMIN, VIEWER, EDITOR } from "../db-helper.ts";

let { db, team } = await database();
const identities = {
  "admin@example.test": ADMIN,
  "viewer@example.test": VIEWER,
  "editor@example.test": EDITOR,
};
const jwt = (id) =>
  [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
      "base64url",
    ),
    Buffer.from(
      JSON.stringify({
        sub: id,
        role: "authenticated",
        exp: Math.floor(Date.now() / 1000) + 3600,
        aud: "authenticated",
      }),
    ).toString("base64url"),
    "test-fixture-only",
  ].join(".");
const user = (id, email) => ({
  id,
  email,
  aud: "authenticated",
  role: "authenticated",
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  created_at: new Date().toISOString(),
});
let serial = Promise.resolve();
const api = http.createServer((req, res) => {
  serial = serial
    .catch(() => {})
    .then(async () => {
      const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          req.headers["access-control-request-headers"] ||
          "authorization,apikey,x-client-info,x-supabase-api-version,accept-profile,content-profile,x-retry-count,content-type,prefer,range,range-unit",
        "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
        "Access-Control-Expose-Headers": "Content-Range",
        "Content-Type": "application/json",
      };
      const send = (body, status = 200, extra = {}) => {
        res.writeHead(status, { ...headers, ...extra });
        res.end(
          JSON.stringify(body, (key, value) =>
            ["joined_on", "starts_on", "expires_on"].includes(key) &&
            typeof value === "string"
              ? value.slice(0, 10)
              : value,
          ),
        );
      };
      if (req.method === "OPTIONS") {
        send({});
        return;
      }
      const url = new URL(req.url, "http://127.0.0.1:54329");
      const body = await new Promise((resolve) => {
        let text = "";
        req.on("data", (chunk) => (text += chunk));
        req.on("end", () => {
          try {
            resolve(text ? JSON.parse(text) : {});
          } catch {
            resolve({});
          }
        });
      });
      try {
        if (url.pathname === "/__test/health") {
          send({ ok: true, team });
          return;
        }
        if (url.pathname === "/__test/reset") {
          await db.close();
          ({ db, team } = await database());
          send({ ok: true });
          return;
        }
        if (url.pathname === "/auth/v1/token") {
          const email = body.email || "admin@example.test";
          const id = identities[email];
          if (!id || body.password !== "test-password-123") {
            send(
              {
                error: "invalid_grant",
                error_description: "Invalid credentials",
              },
              400,
            );
            return;
          }
          send({
            access_token: jwt(id),
            refresh_token: `fixture-refresh-${id}`,
            expires_in: 3600,
            token_type: "bearer",
            user: user(id, email),
          });
          return;
        }
        const token = (req.headers.authorization || "").replace("Bearer ", "");
        let identity = "";
        try {
          identity =
            JSON.parse(
              Buffer.from(token.split(".")[1] || "", "base64url").toString(),
            ).sub || "";
        } catch {}
        if (!Object.values(identities).includes(identity)) {
          send({ message: "Unauthorized", code: "42501" }, 401);
          return;
        }
        if (url.pathname === "/auth/v1/user") {
          send(
            user(
              identity,
              Object.keys(identities).find((k) => identities[k] === identity),
            ),
          );
          return;
        }
        if (url.pathname === "/auth/v1/logout") {
          send({});
          return;
        }
        if (url.pathname === "/rest/v1/rpc/mutate") {
          const result = await asUser(db, identity, () =>
            db.query(
              "select public.mutate($1::uuid,$2,$3::uuid,$4::int,$5::jsonb,$6::uuid,$7::boolean) result",
              [
                body.p_team,
                body.p_table,
                body.p_id,
                body.p_expected,
                JSON.stringify(body.p_patch),
                body.p_operation,
                body.p_delete || false,
              ],
            ),
          );
          send(result.rows[0].result);
          return;
        }
        if (url.pathname === "/rest/v1/rpc/my_access") {
          const result = await asUser(db, identity, () =>
            db.query("select public.my_access($1::uuid) result", [body.t]),
          );
          send(result.rows[0].result);
          return;
        }
        const table = url.pathname.replace("/rest/v1/", "");
        const tables = [
          "teams",
          "profiles",
          "user_permissions",
          "team_members",
          "roles",
          "member_roles",
          "meetings",
          "meeting_topics",
          "meeting_attendance",
          "warning_status",
          "team_wishes",
          "audit_logs",
        ];
        if (!tables.includes(table) || req.method !== "GET") {
          send({ message: "Not found" }, 404);
          return;
        }
        const args = [];
        const conditions = [];
        for (const [key, value] of url.searchParams) {
          if (["select", "order", "limit", "offset"].includes(key)) continue;
          if (!/^[a-z_]+$/.test(key)) throw new Error("Invalid column");
          if (value.startsWith("eq.")) {
            args.push(value.slice(3));
            conditions.push(`"${key}"=$${args.length}`);
          } else if (value.startsWith("ilike.")) {
            args.push(value.slice(6));
            conditions.push(`"${key}" ilike $${args.length}`);
          }
        }
        const where = conditions.length
          ? " where " + conditions.join(" and ")
          : "";
        const orders = (url.searchParams.get("order") || "id.asc")
          .split(",")
          .map((order) => {
            const [column, dir] = order.split(".");
            if (!/^[a-z_]+$/.test(column)) throw new Error("Invalid order");
            return `"${column}" ${dir === "desc" ? "desc" : "asc"}`;
          })
          .join(",");
        const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));
        const limit = Math.min(
          1000,
          Math.max(0, Number(url.searchParams.get("limit") || 1000)),
        );
        const result = await asUser(db, identity, async () => {
          const count = (
            await db.query(
              `select count(*)::int n from public."${table}"${where}`,
              args,
            )
          ).rows[0].n;
          const result = await db.query(
            `select * from public."${table}"${where} order by ${orders} offset ${offset} limit ${limit}`,
            args,
          );
          return { rows: result.rows, count };
        });
        send(result.rows, 200, {
          "Content-Range": `${offset}-${offset + result.rows.length - 1}/${result.count}`,
        });
      } catch (error) {
        send(
          {
            message: error.message,
            code: error.code || "TEST",
            details: null,
            hint: null,
          },
          error.code === "40001" ? 409 : 400,
        );
      }
    });
});
await new Promise((r) => api.listen(54329, "127.0.0.1", r));
process.env.VITE_SUPABASE_URL = "http://127.0.0.1:54329";
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = "e2e-public-key";
process.env.VITE_BASE_PATH = "/";
const vite = await viteServer({
  server: { host: "127.0.0.1", port: 5174, strictPort: true },
  mode: "test",
});
await vite.listen();
console.log("Test UI: http://127.0.0.1:5174 (test-only PostgreSQL fixture)");
const shutdown = async () => {
  await vite.close();
  api.close();
  await db.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
