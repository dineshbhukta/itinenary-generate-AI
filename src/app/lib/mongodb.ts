import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI!);
const dbName = 'itinerarydb';

export async function connectToDatabase() {
  // Connect to the database if not already connected
 
    await client.connect();
  

  const db = client.db(dbName);
  console.log("mongodb connected")
  return db;
}
