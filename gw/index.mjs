import crypto from "node:crypto";
import { DynamoDBClient, PutItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { KMSClient, SignCommand } from "@aws-sdk/client-kms";

const ddb = new DynamoDBClient({});
const s3 = new S3Client({});
const sqs = new SQSClient({});
const kms = new KMSClient({});

const ARTIFACTS_BUCKET = process.env.ARTIFACTS_BUCKET;
const LAKE_BUCKET = process.env.LAKE_BUCKET;
const HB_SECONDS = parseInt(process.env.HB_SECONDS || "60", 10);
const MAX_LATENCY_SECONDS = parseInt(process.env.MAX_LATENCY_SECONDS || "7200", 10);
const KMS_KEY_ID = process.env.KMS_KEY_ID;
const Q_CODEX_URL = process.env.Q_CODEX_URL;
const Q_CURSOR_URL = process.env.Q_CURSOR_URL;

const today = () => new Date().toISOString().slice(0,10);

function ulid() { return crypto.randomUUID().replace(/-/g,'').slice(0,26); } // pseudo ULID for stub

function validateEnvelope(env) {
  const required = ["tenant","intent","inputs"];
  for (const k of required) if (!env[k]) throw new Error(`missing_${k}`);
  if (env.ttl_s && env.ttl_s < 60) throw new Error("ttl_too_small");
  if (env.intent === "macro" && !(env?.scope?.infra_changes || (env?.scope?.services_touched||0) >= 2))
    throw new Error("macro_requires_infra_or_2_services");
  const hb = env?.slo?.heartbeat_s || HB_SECONDS;
  const max = env?.slo?.max_latency_s || MAX_LATENCY_SECONDS;
  if (hb > max/2) throw new Error("bad_heartbeat_vs_latency");
}

async function signAndPutEvent(e) {
  const body = Buffer.from(JSON.stringify(e));
  const digest = crypto.createHash("sha256").update(body).digest();
  const sig = await kms.send(new SignCommand({ KeyId: KMS_KEY_ID, SigningAlgorithm: "ECDSA_SHA_256", MessageType: "DIGEST", Message: digest }));
  const rec = { ...e, signature: Buffer.from(sig.Signature).toString("base64") };
  const key = `events/dt=${today()}/${e.event_id}.json`;
  await s3.send(new PutObjectCommand({ Bucket: LAKE_BUCKET, Key: key, Body: JSON.stringify(rec) }));
}

export const handler = async (event) => {
  const path = event.requestContext?.http?.path || "/";
  const method = event.requestContext?.http?.method || "GET";
  try {
    if (path.endsWith("/tasks") && method === "POST") {
      const env = JSON.parse(event.body || "{}");
      validateEnvelope(env);
      const run_id = env.run_id || ulid();
      const now = new Date().toISOString();
      // write task envelope
      await ddb.send(new PutItemCommand({
        TableName: "edenos_tasks",
        Item: {
          run_id: { S: run_id },
          tenant: { S: env.tenant },
          envelope_json: { S: JSON.stringify({ ...env, run_id, submitted_at: now }) }
        },
        ConditionExpression: "attribute_not_exists(run_id)"
      }));
      // routing
      const files = env?.scope?.estimated_files_changed || 0;
      const services = env?.scope?.services_touched || 0;
      const infra = !!env?.scope?.infra_changes;
      let executor = "cursor";
      if (env?.labels?.force_executor) executor = env.labels.force_executor;
      else if (infra) executor = "cursor";
      else if (services <= 1 && files <= 5) executor = "codex";
      // lease record
      const lease_expires_at = new Date(Date.now() + HB_SECONDS*2000).toISOString();
      await ddb.send(new PutItemCommand({
        TableName: "edenos_leases",
        Item: {
          run_id: { S: run_id },
          lease_owner: { S: executor },
          heartbeat_s: { N: String(HB_SECONDS) },
          lease_expires_at: { S: lease_expires_at }
        }
      }));
      // queue to executor
      const queueUrl = executor === "codex" ? Q_CODEX_URL : Q_CURSOR_URL;
      await sqs.send(new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: JSON.stringify({ run_id, tenant: env.tenant }) }));
      // events
      await signAndPutEvent({ event_id: "evt_"+ulid(), run_id, tenant: env.tenant, event_type: "TASK_ACCEPTED", occurred_at: now, producer: "gateway", version: "1.0", payload: {} });
      await signAndPutEvent({ event_id: "evt_"+ulid(), run_id, tenant: env.tenant, event_type: "ROUTED_EXECUTOR", occurred_at: now, producer: "gateway", version: "1.0", payload: { executor } });
      return { statusCode: 202, body: JSON.stringify({ run_id, executor }) };
    }
    if (path.startsWith("/heartbeats/") && method === "POST") {
      const run_id = path.split("/").pop();
      const now = new Date().toISOString();
      // extend lease
      await ddb.send(new UpdateItemCommand({
        TableName: "edenos_leases",
        Key: { run_id: { S: run_id } },
        UpdateExpression: "SET lease_expires_at=:e",
        ExpressionAttributeValues: { ":e": { S: new Date(Date.now()+HB_SECONDS*2000).toISOString() } }
      }));
      // heartbeat record
      await ddb.send(new PutItemCommand({
        TableName: "edenos_heartbeats",
        Item: { run_id: { S: run_id }, ts: { S: now }, ttl_epoch: { N: String(Math.floor(Date.now()/1000) + 7*24*3600) } }
      }));
      await signAndPutEvent({ event_id: "evt_"+ulid(), run_id, tenant: "unknown", event_type: "EXEC_HEARTBEAT", occurred_at: now, producer: "gateway", version: "1.0", payload: {} });
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }
    return { statusCode: 404, body: JSON.stringify({ error: "not_found" }) };
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: e.message || "bad_request" }) };
  }
};