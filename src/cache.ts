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

export async function getValueFromCache(collection: collection, serveFresh: boolean): Promise<string> {
  let cacheContent = ''

  if (serveFresh || await isCacheStale(collection.databaseId)) {
    cacheContent = await collection.processingFunction(collection)
    repopulateCache(collection.databaseId, cacheContent) // Do not await repopulation
  } else {
    cacheContent = await loadCache(collection.databaseId)
    console.log('Served old Cache')
  }

  return Promise.resolve(cacheContent)
}

async function isCacheStale(name: string): Promise<boolean> {
  try {
    const objectAttributes = await client.send(new GetObjectAttributesCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: name,
      ObjectAttributes: ['Checksum']
    }));
    const lastModified = objectAttributes.LastModified
    return Promise.resolve((new Date).getTime() - lastModified?.getTime()! > 1000*60*60*24)
  } catch (e) {
    if (e instanceof NoSuchKey) {
      return Promise.resolve(true)
    }
    throw e
  }
}

async function repopulateCache(name: string, content: string): Promise<void> {
  const contentLength = Buffer.byteLength(JSON.stringify(content))

  await client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: name,
    Body: JSON.stringify(content),
    ContentLength: contentLength
  }))

  console.log('Refreshed Cache')
  return Promise.resolve()
}

async function loadCache(name: string): Promise<string> {
  const content = await client.send(new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: name
  }))
  const data = await content.Body?.transformToString()!
  return JSON.parse(data)
}
