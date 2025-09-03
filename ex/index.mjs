import crypto from "node:crypto";
import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { KMSClient, SignCommand } from "@aws-sdk/client-kms";

const ddb = new DynamoDBClient({});
const s3 = new S3Client({});
const kms = new KMSClient({});

const LAKE_BUCKET = process.env.LAKE_BUCKET;
const ARTIFACTS_BUCKET = process.env.ARTIFACTS_BUCKET;
const KMS_KEY_ID = process.env.KMS_KEY_ID;
const EXECUTOR_NAME = process.env.EXECUTOR_NAME || "unknown";

const today = () => new Date().toISOString().slice(0,10);
const ulid = () => crypto.randomUUID().replace(/-/g,'').slice(0,26);

async function signAndPutEvent(e) {
  const body = Buffer.from(JSON.stringify(e));
  const digest = crypto.createHash("sha256").update(body).digest();
  const sig = await kms.send(new SignCommand({ KeyId: KMS_KEY_ID, SigningAlgorithm: "ECDSA_SHA_256", MessageType: "DIGEST", Message: digest }));
  const rec = { ...e, signature: Buffer.from(sig.Signature).toString("base64") };
  const key = `events/dt=${today()}/${e.event_id}.json`;
  await s3.send(new PutObjectCommand({ Bucket: LAKE_BUCKET, Key: key, Body: JSON.stringify(rec) }));
}

export const handler = async (event) => {
  for (const record of event.Records || []) {
    const body = JSON.parse(record.body);
    const run_id = body.run_id;
    // read envelope
    const task = await ddb.send(new GetItemCommand({ TableName:"edenos_tasks", Key:{ run_id:{S:run_id} } }));
    const tenant = JSON.parse(task.Item.envelope_json.S).tenant;

    const now = new Date().toISOString();
    // simulate PR
    const prNumber = Math.floor(Math.random()*9000)+1000;
    const artifactKey = `${tenant}/${run_id}/diffs/simulated.patch`;
    await s3.send(new PutObjectCommand({ Bucket: ARTIFACTS_BUCKET, Key: artifactKey, Body: `diff --git a/hello.txt b/hello.txt\n+ hello from ${EXECUTOR_NAME}\n` }));

    await signAndPutEvent({ event_id:"evt_"+ulid(), run_id, tenant, event_type:"PR_OPENED", occurred_at:now, producer: EXECUTOR_NAME, version:"1.0", payload:{ repo:"simulated", pr:prNumber, artifact:`s3://${ARTIFACTS_BUCKET}/${artifactKey}` } });

    // pretend checks passed and complete
    await signAndPutEvent({ event_id:"evt_"+ulid(), run_id, tenant, event_type:"CHECKS_PASSED", occurred_at:now, producer:EXECUTOR_NAME, version:"1.0", payload:{ suite:"simulated" } });
    await signAndPutEvent({ event_id:"evt_"+ulid(), run_id, tenant, event_type:"TASK_COMPLETED", occurred_at:now, producer:EXECUTOR_NAME, version:"1.0", payload:{} });

    // optional: mark task pointer
    await ddb.send(new UpdateItemCommand({
      TableName:"edenos_tasks",
      Key:{ run_id:{S:run_id} },
      UpdateExpression:"SET last_executor=:e, completed_at=:t",
      ExpressionAttributeValues:{ ":e":{S:EXECUTOR_NAME}, ":t":{S:now} }
    }));
  }
  return { statusCode:200 };
};
