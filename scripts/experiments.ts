import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { runChat } from "../src/game/server/gameplay";
import { getLevel } from "../src/game/server/levels";
import { ATTACKS } from "./experiments/attacks";
import {
  oneLine,
  parseArgs,
  renderTable,
  resultsFileName,
  runExperiments,
  selectEntries,
  totalRequests,
} from "./experiments/lib";

const options = parseArgs(process.argv.slice(2));
const entries = selectEntries(ATTACKS, options);
const total = totalRequests(entries);

for (const entry of entries) console.log(`${entry.levelId}  x${entry.runs}  ${entry.attack}`);
console.log(`${entries.length} entries, ${total} requests planned (delay ${options.delay} ms).`);

if (!options.dryRun) {
  const { summaries, stoppedBy } = await runExperiments(entries, {
    runChat,
    getLevel,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    delay: options.delay,
    onRun: (entry, r) =>
      console.log(`${entry.levelId} #${r.run}: ${r.outcome} ${oneLine(r.detail, 160)}`),
  });
  const note = stoppedBy ? `Stopped early: ${stoppedBy}.` : undefined;
  if (note) console.log(note);
  const dir = fileURLToPath(new URL("../docs/experiments/", import.meta.url));
  await mkdir(dir, { recursive: true });
  const file = `${dir}${resultsFileName(new Date())}`;
  await writeFile(file, renderTable(summaries, note));
  console.log(`Wrote ${file}`);
}
