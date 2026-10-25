// Owned subprocess fixture: input is data, never JavaScript source.
import Database from 'better-sqlite3';
import {runPaperBotTick} from '../../src/services/trading-paper-bots.ts';
const {file,input,now}=JSON.parse(process.argv[2]);
const db=new Database(file);
db.function('crash_now',()=>process.kill(process.pid,'SIGKILL'));
runPaperBotTick(db,'owner',input,()=>now);
process.exit(2);
