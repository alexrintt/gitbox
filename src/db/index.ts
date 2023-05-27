import Dexie, { Table } from "dexie";
import { FileMetadata } from "../pages/upload";

export interface BinaryEntry extends FileMetadata {
  arrayBuffer: ArrayBuffer;
}

export class MySubClassedDexie extends Dexie {
  binaryEntries!: Table<BinaryEntry>;

  constructor() {
    super("APP_DB");
    this.version(2).stores({
      binaryEntries: "id, name, arrayBuffer, size, modifiedAt",
    });
  }
}

export const db = new MySubClassedDexie();
