import { Cluster, Connection, clusterApiUrl } from "@solana/web3.js";

// Solana network cluster
const url: Cluster = (process.env.CLUSTER_URL as Cluster) || "devnet";

// Connect to the Solana network
const connection: Connection = new Connection(clusterApiUrl(url));

export { connection };
