import { IConfig } from "../config";
import { runSpawn } from "../util";
import { composeSchema } from "./compose";

export async function migratePrisma(
  c: IConfig,
  name: string
) {

  await composeSchema(c)

  await runSpawn(['prisma', 'migrate', 'dev', '--name', name], { cwd: c.cwd })
}