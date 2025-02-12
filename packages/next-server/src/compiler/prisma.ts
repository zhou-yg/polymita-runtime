import { IConfig } from "../config";
import { runSpawn } from "../util";
import { composeSchema } from "./compose";

export async function migratePrisma(
  c: IConfig,
  name: string
) {

  await composeSchema(c)

  await runSpawn(['npx', 'prisma', 'generate'], { cwd: c.cwd })

  await runSpawn(['npx', 'prisma', 'migrate', 'dev', '--name', name], { cwd: c.cwd })
}