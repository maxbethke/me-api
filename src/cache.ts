import {
  GetObjectAttributesCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import {collection} from "./routes";
import {Buffer} from "buffer";

const client = new S3Client({region: 'eu-central-1'})

export async function updateCache(collection: collection): Promise<string> {
  let cacheContent = ''

  if (await isCacheStale(collection.databaseId)) {
    cacheContent = await collection.processingFunction(collection)
    populateCache(collection.databaseId, cacheContent)
  } else {
    cacheContent = await loadCache(collection.databaseId)
  }

  return Promise.resolve(cacheContent)
}

async function isCacheStale(name: string): Promise<boolean> {
  try {
    const cacheChecksum = await client.send(new GetObjectAttributesCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: name,
      ObjectAttributes: ['Checksum']
    }));
    console.log('current cache checksum', cacheChecksum)
    return Promise.resolve(false)
    // TODO: Implement further cache invalidation based on checksum
  } catch (e) {
    if (e instanceof NoSuchKey) {
      return Promise.resolve(true)
    }
    throw e
  }
}

async function populateCache(name: string, content: string): Promise<void> {
  const contentLength = Buffer.byteLength(JSON.stringify(content))

  await client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: name,
    Body: JSON.stringify(content),
    ContentLength: contentLength
  }))
  return Promise.resolve()
}

async function loadCache(name: string): Promise<string> {
  const content = await client.send(new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: name
  }))
  return content.Body?.transformToString()!
}
