import { Adapter } from "./Adapter";
import { createClient, type RedisClientType } from "redis";

type RedisAdapterConstuctorProps = {
  url: string;
  keyPrefix?: string;
};

export class RedisAdapter implements Adapter {
  private client: RedisClientType;
  private keyPrefix: string;

  constructor(props: RedisAdapterConstuctorProps) {
    this.client = createClient({ url: props.url });
    this.keyPrefix = props.keyPrefix || "wa_multi_session:";
  }

  private async init() {
    if (!this.client.isOpen) {
      await this.client.connect();
      await this.client.ping();
    }
  }

  async readData(sessionId: string, key: string): Promise<string | null> {
    await this.init();
    const value = await this.client.get(`${this.keyPrefix}${sessionId}:${key}`);
    if (!value) return null;
    if (typeof value === "string") return value;
    return null;
  }

  async writeData(
    sessionId: string,
    key: string,
    category: string, // Parameter ini tetap dipertahankan karena bawaan dari interface Adapter
    data: string,
  ): Promise<void> {
    await this.init();
    const redisKey = `${this.keyPrefix}${sessionId}:${key}`;
    await this.client.set(redisKey, data);
  }

  async deleteData(sessionId: string, key: string): Promise<void> {
    await this.init();
    const redisKey = `${this.keyPrefix}${sessionId}:${key}`;
    await this.client.del(redisKey);
  }

  async clearData(sessionId: string): Promise<void> {
    await this.init();
    const pattern = `${this.keyPrefix}${sessionId}:*`;
    const keys = await this.client.keys(pattern);

    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  async listSessions(): Promise<string[]> {
    await this.init();
    const pattern = `${this.keyPrefix}*:*`;
    const keys = await this.client.keys(pattern);

    const sessions = new Set<string>();

    for (const key of keys) {
      const keyWithoutPrefix = key.substring(this.keyPrefix.length);
      const sessionId = keyWithoutPrefix.split(":")[0];
      if (sessionId) {
        sessions.add(sessionId);
      }
    }

    return Array.from(sessions);
  }
}
